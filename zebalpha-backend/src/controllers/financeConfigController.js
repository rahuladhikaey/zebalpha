import { 
  getActiveFinanceConfig, 
  listFinanceConfigs, 
  getFinanceConfigByVersion, 
  createDraftConfig, 
  publishConfig, 
  rollbackToVersion, 
  previewFinancialImpact, 
  validateConfig 
} from '../services/financeConfigService.js';
import { supabaseA } from '../lib/supabase.js';
import { HTTP_STATUS } from '../constants/index.js';

/**
 * 1. Get currently active platform finance configuration
 * GET /api/finance/config/active
 */
export const getActiveConfig = async (req, res, next) => {
  try {
    const config = await getActiveFinanceConfig(true);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: config
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 2. List all configuration versions
 * GET /api/finance/config/versions
 */
export const listVersions = async (req, res, next) => {
  try {
    const versions = await listFinanceConfigs();
    res.status(HTTP_STATUS.OK).json({
      success: true,
      count: versions.length,
      data: versions
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 3. Get single configuration version by version number
 * GET /api/finance/config/versions/:version
 */
export const getVersionDetails = async (req, res, next) => {
  try {
    const { version } = req.params;
    const config = await getFinanceConfigByVersion(version);
    if (!config) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: 'Configuration version not found' });
    }
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: config
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 4. Create new draft configuration
 * POST /api/finance/config/draft
 */
export const createDraft = async (req, res, next) => {
  try {
    const adminUser = req.user?.email || req.user?.id || 'Super Admin';
    const draft = await createDraftConfig(req.body, adminUser);

    // Audit log
    await supabaseA.from('admin_audit_logs').insert({
      admin_id: req.user?.id,
      admin_email: adminUser,
      action: 'FINANCE_CONFIG_DRAFT_CREATED',
      new_state: draft,
      reason: req.body.change_reason || 'Created new platform finance configuration draft',
      ip_address: req.ip || '127.0.0.1',
      user_agent: req.headers['user-agent'] || 'API'
    });

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: `Draft configuration Version ${draft.version} created successfully.`,
      data: draft
    });
  } catch (err) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: err.message
    });
  }
};

/**
 * 5. Publish or Schedule configuration
 * POST /api/finance/config/:id/publish
 */
export const publishVersion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { scheduleDate } = req.body;
    const adminUser = req.user?.email || req.user?.id || 'Super Admin';

    const published = await publishConfig(id, adminUser, scheduleDate);

    // Audit log
    await supabaseA.from('admin_audit_logs').insert({
      admin_id: req.user?.id,
      admin_email: adminUser,
      action: 'FINANCE_CONFIG_PUBLISHED',
      new_state: published,
      reason: scheduleDate ? `Scheduled for ${scheduleDate}` : 'Activated immediately',
      ip_address: req.ip || '127.0.0.1',
      user_agent: req.headers['user-agent'] || 'API'
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: `Configuration Version ${published.version} is now ${published.status}.`,
      data: published
    });
  } catch (err) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: err.message
    });
  }
};

/**
 * 6. Rollback to historical configuration (Creates new corrective version)
 * POST /api/finance/config/rollback
 */
export const rollbackVersion = async (req, res, next) => {
  try {
    const { targetVersion, reason } = req.body;
    const adminUser = req.user?.email || req.user?.id || 'Super Admin';

    if (!targetVersion) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: 'targetVersion is required.' });
    }

    const rolledBack = await rollbackToVersion(targetVersion, reason, adminUser);

    // Audit log
    await supabaseA.from('admin_audit_logs').insert({
      admin_id: req.user?.id,
      admin_email: adminUser,
      action: 'FINANCE_CONFIG_ROLLBACK',
      previous_state: { targetVersion },
      new_state: rolledBack,
      reason: reason || `Rollback to parameters from Version ${targetVersion}`,
      ip_address: req.ip || '127.0.0.1',
      user_agent: req.headers['user-agent'] || 'API'
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: `Rollback applied successfully. New Version ${rolledBack.version} created and activated.`,
      data: rolledBack
    });
  } catch (err) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: err.message
    });
  }
};

/**
 * 7. Preview Financial Impact (Read-Only Simulation)
 * POST /api/finance/config/preview
 */
export const previewImpact = async (req, res, next) => {
  try {
    const { price, quantity, paymentMethod, config } = req.body;
    const impact = previewFinancialImpact({
      price: price || 1000,
      quantity: quantity || 1,
      paymentMethod: paymentMethod || 'PREPAID',
      config: config || null
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: impact
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 8. Get order financial snapshot
 * GET /api/finance/snapshots/order/:orderId
 */
export const getOrderSnapshot = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { data, error } = await supabaseA
      .from('order_financial_snapshot')
      .select('*, sellers(business_name, email)')
      .eq('order_id', orderId);

    if (error) throw error;

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: data || []
    });
  } catch (err) {
    next(err);
  }
};
