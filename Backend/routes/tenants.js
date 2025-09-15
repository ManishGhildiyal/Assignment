const express = require('express');
const { get, run } = require('../database');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

// POST /tenants/:slug/upgrade - Upgrade tenant subscription (Admin only)
router.post('/:slug/upgrade', requireRole('admin'), async (req, res) => {
  try {
    const { slug } = req.params;
    const { tenantSlug, tenantId } = req.user;

    // Ensure admin can only upgrade their own tenant
    if (slug !== tenantSlug) {
      return res.status(403).json({ 
        error: 'You can only upgrade your own tenant subscription' 
      });
    }

    // Check if tenant exists and get current plan
    const tenant = await get(
      'SELECT * FROM tenants WHERE slug = ? AND id = ?',
      [slug, tenantId]
    );

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    if (tenant.plan === 'pro') {
      return res.status(400).json({ 
        error: 'Tenant is already on Pro plan',
        currentPlan: tenant.plan
      });
    }

    // Upgrade to Pro plan
    await run(
      'UPDATE tenants SET plan = ? WHERE id = ?',
      ['pro', tenantId]
    );

    // Get updated tenant info
    const updatedTenant = await get(
      'SELECT * FROM tenants WHERE id = ?',
      [tenantId]
    );

    res.json({
      message: 'Tenant upgraded to Pro plan successfully',
      tenant: {
        id: updatedTenant.id,
        name: updatedTenant.name,
        slug: updatedTenant.slug,
        plan: updatedTenant.plan,
        previousPlan: tenant.plan
      }
    });

  } catch (error) {
    console.error('Upgrade tenant error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /tenants/:slug/info - Get tenant information
router.get('/:slug/info', async (req, res) => {
  try {
    const { slug } = req.params;
    const { tenantSlug, tenantId, role } = req.user;

    // Users can only view their own tenant info
    if (slug !== tenantSlug) {
      return res.status(403).json({ 
        error: 'You can only view your own tenant information' 
      });
    }

    const tenant = await get(
      'SELECT id, name, slug, plan, created_at FROM tenants WHERE id = ?',
      [tenantId]
    );

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Get note count
    const noteCount = await get(
      'SELECT COUNT(*) as count FROM notes WHERE tenant_id = ?',
      [tenantId]
    );

    // Get user count (if admin)
    let userCount = null;
    if (role === 'admin') {
      const users = await get(
        'SELECT COUNT(*) as count FROM users WHERE tenant_id = ?',
        [tenantId]
      );
      userCount = users.count;
    }

    const tenantInfo = {
      ...tenant,
      noteCount: noteCount.count,
      noteLimit: tenant.plan === 'pro' ? null : 3,
      unlimited: tenant.plan === 'pro'
    };

    if (userCount !== null) {
      tenantInfo.userCount = userCount;
    }

    res.json({ tenant: tenantInfo });

  } catch (error) {
    console.error('Get tenant info error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /tenants/:slug/users - List tenant users (Admin only)
router.get('/:slug/users', requireRole('admin'), async (req, res) => {
  try {
    const { slug } = req.params;
    const { tenantSlug, tenantId } = req.user;

    // Ensure admin can only view users from their own tenant
    if (slug !== tenantSlug) {
      return res.status(403).json({ 
        error: 'You can only view users from your own tenant' 
      });
    }

    const users = await query(
      'SELECT id, email, role, created_at FROM users WHERE tenant_id = ? ORDER BY created_at DESC',
      [tenantId]
    );

    res.json({
      users,
      count: users.length
    });

  } catch (error) {
    console.error('Get tenant users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /tenants/:slug/invite - Invite user to tenant (Admin only) - Placeholder
router.post('/:slug/invite', requireRole('admin'), async (req, res) => {
  try {
    const { slug } = req.params;
    const { tenantSlug } = req.user;

    // Ensure admin can only invite to their own tenant
    if (slug !== tenantSlug) {
      return res.status(403).json({ 
        error: 'You can only invite users to your own tenant' 
      });
    }

    // This is a placeholder implementation
    // In a real application, you would:
    // 1. Validate the email
    // 2. Check if user already exists
    // 3. Send invitation email
    // 4. Create a pending invitation record

    res.status(501).json({ 
      message: 'User invitation feature not implemented',
      note: 'This endpoint verifies admin permissions but invitation logic is not implemented'
    });

  } catch (error) {
    console.error('Invite user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;