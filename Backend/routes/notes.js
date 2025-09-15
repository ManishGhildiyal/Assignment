const express = require('express');
const { query, get, run } = require('../database');

const router = express.Router();

// Helper function to check note limits for free plans
const checkNoteLimit = async (tenantId, tenantPlan) => {
  if (tenantPlan === 'pro') {
    return { allowed: true };
  }

  const result = await get(
    'SELECT COUNT(*) as count FROM notes WHERE tenant_id = ?',
    [tenantId]
  );

  const currentCount = result.count;
  const limit = 3; // Free plan limit

  return {
    allowed: currentCount < limit,
    current: currentCount,
    limit: limit,
    remaining: limit - currentCount
  };
};

// POST /notes - Create a note
router.post('/', async (req, res) => {
  try {
    const { title, content } = req.body;
    const { id: userId, tenantId, tenantPlan } = req.user;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Check note limit for free plans
    const limitCheck = await checkNoteLimit(tenantId, tenantPlan);
    if (!limitCheck.allowed) {
      return res.status(403).json({
        error: 'Note limit reached',
        message: `Free plan allows maximum ${limitCheck.limit} notes. Please upgrade to Pro for unlimited notes.`,
        limit: limitCheck.limit,
        current: limitCheck.current
      });
    }

    const result = await run(
      'INSERT INTO notes (title, content, tenant_id, user_id) VALUES (?, ?, ?, ?)',
      [title, content || '', tenantId, userId]
    );

    const newNote = await get(
      'SELECT * FROM notes WHERE id = ?',
      [result.id]
    );

    res.status(201).json({
      note: newNote,
      message: 'Note created successfully'
    });

  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /notes - List all notes for the current tenant
router.get('/', async (req, res) => {
  try {
    const { tenantId } = req.user;

    const notes = await query(
      `SELECT n.*, u.email as author_email 
       FROM notes n 
       JOIN users u ON n.user_id = u.id 
       WHERE n.tenant_id = ? 
       ORDER BY n.created_at DESC`,
      [tenantId]
    );

    res.json({
      notes,
      count: notes.length
    });

  } catch (error) {
    console.error('List notes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /notes/:id - Retrieve a specific note
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { tenantId } = req.user;

    const note = await get(
      `SELECT n.*, u.email as author_email 
       FROM notes n 
       JOIN users u ON n.user_id = u.id 
       WHERE n.id = ? AND n.tenant_id = ?`,
      [id, tenantId]
    );

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    res.json({ note });

  } catch (error) {
    console.error('Get note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /notes/:id - Update a note
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;
    const { tenantId } = req.user;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Check if note exists and belongs to tenant
    const existingNote = await get(
      'SELECT * FROM notes WHERE id = ? AND tenant_id = ?',
      [id, tenantId]
    );

    if (!existingNote) {
      return res.status(404).json({ error: 'Note not found' });
    }

    await run(
      'UPDATE notes SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND tenant_id = ?',
      [title, content || '', id, tenantId]
    );

    const updatedNote = await get(
      `SELECT n.*, u.email as author_email 
       FROM notes n 
       JOIN users u ON n.user_id = u.id 
       WHERE n.id = ?`,
      [id]
    );

    res.json({
      note: updatedNote,
      message: 'Note updated successfully'
    });

  } catch (error) {
    console.error('Update note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /notes/:id - Delete a note
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { tenantId } = req.user;

    // Check if note exists and belongs to tenant
    const existingNote = await get(
      'SELECT * FROM notes WHERE id = ? AND tenant_id = ?',
      [id, tenantId]
    );

    if (!existingNote) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const result = await run(
      'DELETE FROM notes WHERE id = ? AND tenant_id = ?',
      [id, tenantId]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }

    res.json({ message: 'Note deleted successfully' });

  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /notes/stats/limit - Get current note count and limit info
router.get('/stats/limit', async (req, res) => {
  try {
    const { tenantId, tenantPlan } = req.user;

    const result = await get(
      'SELECT COUNT(*) as count FROM notes WHERE tenant_id = ?',
      [tenantId]
    );

    const currentCount = result.count;
    const limit = tenantPlan === 'pro' ? null : 3;

    res.json({
      current: currentCount,
      limit: limit,
      plan: tenantPlan,
      unlimited: tenantPlan === 'pro',
      remaining: limit ? Math.max(0, limit - currentCount) : null,
      canCreate: tenantPlan === 'pro' || currentCount < limit
    });

  } catch (error) {
    console.error('Get notes stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;