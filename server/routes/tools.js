import express from 'express';
import { initializeToolsWithFirebase, getTools } from './index.js';

const router = express.Router();

// Store reference to Firebase service
let firebaseService = null;

// Initialize tools with Firebase service
export { initializeToolsWithFirebase };

export function setFirebaseService(service) {
  firebaseService = service;
  initializeToolsWithFirebase(service);
  console.log('✅ Tools router initialized with Firebase service');
}

// Route to execute context tool
router.post('/context', async (req, res) => {
  try {
    if (!firebaseService) {
      return res.status(500).json({
        error: 'Firebase service not initialized'
      });
    }

    const tools = getTools();
    if (!tools || !tools.get_user_context) {
      return res.status(500).json({
        error: 'Context tool not available'
      });
    }

    const { user_id, context_type = 'all', limit = 10 } = req.body;

    if (!user_id) {
      return res.status(400).json({
        error: 'user_id is required'
      });
    }

    // Execute context tool
    const result = await tools.get_user_context.execute({
      user_id,
      context_type,
      limit
    });

    res.json(result);
  } catch (error) {
    console.error('Context tool execution error:', error);
    res.status(500).json({
      error: 'Failed to execute context tool',
      details: error.message
    });
  }
});

export default router;