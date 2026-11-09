import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { HTTP_STATUS } from '../constants/index.js';
import { supabaseA } from '../lib/supabase.js';

/**
 * Strict Cryptographic JWT & Supabase Authentication Middleware
 * Zero Trust: Never accepts unverified or decoded tokens.
 */
export const authenticateJWT = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      error: 'Authentication required. Missing or malformed Bearer token.'
    });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      error: 'Token missing in authorization header.'
    });
  }

  // 1. Attempt verification with internal JWT Secret
  try {
    const decoded = jwt.verify(token, config.jwt.secret, { algorithms: ['HS256'] });
    req.user = {
      id: decoded.id || decoded.sub,
      email: decoded.email,
      role: decoded.role || 'customer',
      ...decoded
    };
    if (decoded.sellerId || decoded.seller_id) {
      req.sellerId = decoded.sellerId || decoded.seller_id;
    }
    return next();
  } catch (internalJwtErr) {
    // 2. If internal verification fails, verify cryptographically against Supabase Auth service
    try {
      const { data, error } = await supabaseA.auth.getUser(token);
      if (!error && data?.user) {
        let role = data.user.user_metadata?.role || 'customer';

        // Check if user is an approved seller in database
        try {
          const { data: sellerRecord } = await supabaseA
            .from('sellers')
            .select('id, status')
            .eq('user_id', data.user.id)
            .maybeSingle();

          if (sellerRecord && sellerRecord.status === 'approved') {
            role = 'seller';
            req.sellerId = sellerRecord.id;
          }
        } catch (_) {}

        // Check if user possesses enterprise app memberships
        let memberships = [];
        try {
          const { data: memRecords } = await supabaseA
            .from('user_app_memberships')
            .select('app_name, role, custom_permissions')
            .eq('user_id', data.user.id)
            .eq('is_active', true);

          if (memRecords && memRecords.length > 0) {
            memberships = memRecords;
            const ownerMem = memRecords.find(m => m.role === 'OWNER' && (m.app_name === 'all' || m.app_name === 'superadmin'));
            if (ownerMem) {
              role = 'OWNER';
            } else if (memRecords.some(m => m.app_name === 'superadmin' && m.role === 'SUPER_ADMIN')) {
              role = 'super_admin';
            } else {
              role = memRecords[0].role;
            }
          }
        } catch (_) {}

        req.user = {
          id: data.user.id,
          email: data.user.email,
          role: role,
          memberships: memberships,
          user_metadata: data.user.user_metadata
        };
        return next();
      }
    } catch (supabaseErr) {
      // Fall through to unauthorized
    }

    // Both verification methods failed - reject request immediately
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      error: 'Invalid, forged, or expired authentication token.',
      code: 'INVALID_TOKEN'
    });
  }
};

/**
 * Role-Based Access Control (RBAC) Middleware
 * Verifies that req.user possesses an allowed role.
 */
export const requireRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const userRole = (req.user.role || '').toLowerCase();
    const normalizedAllowed = allowedRoles.map(r => r.toLowerCase());

    if (normalizedAllowed.length > 0 && !normalizedAllowed.includes(userRole)) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: 'Forbidden: Insufficient role permissions for this resource'
      });
    }

    next();
  };
};

/**
 * Enterprise Application-Scoped RBAC Middleware
 * Validates that req.user has an active membership in the target app with allowed roles
 */
export const requireAppMembership = (appName, allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const memberships = req.user.memberships || [];
    
    // Enterprise Owner across 'all' apps always has root bypass
    const isGlobalOwner = memberships.some(m => m.app_name === 'all' && m.role === 'OWNER');
    if (isGlobalOwner) {
      return next();
    }

    // Check specific application scope
    const appMembership = memberships.find(m => m.app_name === appName || m.app_name === 'all');
    if (!appMembership) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: `Forbidden: No authorized access to the ${appName} application domain`
      });
    }

    if (allowedRoles.length > 0) {
      const normalizedAllowed = allowedRoles.map(r => r.toLowerCase());
      const userRole = (appMembership.role || '').toLowerCase();
      if (!normalizedAllowed.includes(userRole)) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          error: `Forbidden: Role ${appMembership.role} is not permitted for this operation in ${appName}`
        });
      }
    }

    next();
  };
};
