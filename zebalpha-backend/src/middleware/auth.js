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
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = {
      id: decoded.id || decoded.sub,
      email: decoded.email,
      role: decoded.role || 'customer',
      ...decoded
    };
    return next();
  } catch (internalJwtErr) {
    // 2. If internal verification fails, verify cryptographically against Supabase Auth service
    try {
      const { data, error } = await supabaseA.auth.getUser(token);
      if (!error && data?.user) {
        req.user = {
          id: data.user.id,
          email: data.user.email,
          role: data.user.user_metadata?.role || 'customer'
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
