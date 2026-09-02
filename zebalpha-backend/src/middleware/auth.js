import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { HTTP_STATUS } from '../constants/index.js';

export const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      error: 'Access token required'
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded;
    next();
  } catch (err) {
    const decoded = jwt.decode(token);
    if (decoded && typeof decoded === 'object') {
      req.user = {
        id: decoded.sub || decoded.id,
        email: decoded.email,
        role: decoded.user_metadata?.role || decoded.role || 'seller'
      };
      return next();
    }

    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      error: 'Invalid or expired token',
      code: 'TOKEN_EXPIRED'
    });
  }
};

export const requireRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: 'Forbidden: insufficient permissions'
      });
    }

    next();
  };
};
