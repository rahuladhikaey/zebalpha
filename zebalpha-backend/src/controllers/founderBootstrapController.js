import crypto from 'crypto';
import { supabaseA } from '../lib/supabase.js';
import { HTTP_STATUS } from '../constants/index.js';
import logger from '../utils/logger.js';

/**
 * Check Founder Bootstrap Initialization Status (Public/Auth-Safe)
 * Returns whether bootstrap is pending or sealed. Never reveals sensitive fields.
 */
export async function getBootstrapStatus(req, res) {
  try {
    const { data, error } = await supabaseA
      .from('founder_bootstrap_vault')
      .select('is_locked, consumed_at, expires_at, created_at')
      .limit(1);

    if (error) {
      logger.error('[FounderBootstrap] Error checking status:', error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Unable to retrieve founder bootstrap status.'
      });
    }

    if (!data || data.length === 0) {
      return res.status(HTTP_STATUS.OK).json({
        success: true,
        initialized: false,
        isLocked: false,
        isConsumed: false,
        message: 'Founder Bootstrap Vault is uninitialized. Awaiting initialization token seeding.'
      });
    }

    const record = data[0];
    const isConsumed = record.consumed_at !== null || record.is_locked === true;
    const isExpired = record.expires_at ? new Date(record.expires_at) < new Date() : false;

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      initialized: true,
      isLocked: record.is_locked,
      isConsumed: isConsumed,
      isExpired: isExpired,
      status: isConsumed ? 'SEALED' : (isExpired ? 'EXPIRED' : 'AWAITING_CONSUMPTION')
    });
  } catch (err) {
    logger.error('[FounderBootstrap] Exception in getBootstrapStatus:', err);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Internal server error checking founder bootstrap status.'
    });
  }
}

/**
 * Consume Founder Bootstrap Token (Protected by JWT Authentication)
 * Validates authenticated caller, hashes one-time token, and executes atomic stored procedure.
 */
export async function bootstrapFounder(req, res) {
  try {
    const userId = req.user?.id;
    const userEmail = (req.user?.email || '').trim().toLowerCase();

    if (!userId || !userEmail) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: 'Authentication required. A valid Supabase user session is required to claim the Founder identity.'
      });
    }

    const { token } = req.body;
    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Missing or empty bootstrap token.'
      });
    }

    // Cryptographic SHA-256 hash of the incoming one-time bootstrap token
    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');

    // Extract real client IP
    const clientIp = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1').split(',')[0].trim();

    logger.info(`[FounderBootstrap] Attempting founder token consumption for user: ${userId} (${userEmail}) from IP: ${clientIp}`);

    // Call PostgreSQL atomic stored procedure with pessimistic row locking
    const { data, error } = await supabaseA.rpc('consume_founder_bootstrap_token', {
      p_email: userEmail,
      p_token_hash: tokenHash,
      p_ip: clientIp,
      p_user_id: userId
    });

    if (error) {
      logger.warn(`[FounderBootstrap] RPC failed for ${userEmail}: ${error.message}`);
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: error.message || 'Founder bootstrap verification failed.'
      });
    }

    logger.info(`[FounderBootstrap] SUCCESS: Founder identity established and vault permanently sealed for ${userEmail}`);

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Founder account successfully initialized and permanently sealed.',
      role: 'OWNER',
      appScope: 'all',
      userId: userId,
      email: userEmail
    });
  } catch (err) {
    logger.error('[FounderBootstrap] Exception in bootstrapFounder:', err);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'An unexpected internal error occurred during founder bootstrap.'
    });
  }
}

