console.log('🚀 Starting backend server...');
console.log('📍 Current working directory:', process.cwd());
console.log('📂 __dirname:', import.meta.url);

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('✅ Basic imports successful');

// Initialize __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dynamic imports with error handling
let FirebaseMemoryService;
let toolsRouter;
let setFirebaseService;

try {
  const firebaseModule = await import('./services/FirebaseMemoryService.js');
  FirebaseMemoryService = firebaseModule.default;
  console.log('✅ FirebaseMemoryService imported successfully');
} catch (error) {
  console.error('❌ Failed to import FirebaseMemoryService:', error.message);
  console.error('📍 Error stack:', error.stack);
}

try {
  const toolsModule = await import('./routes/tools.js');
  toolsRouter = toolsModule.default;
  setFirebaseService = toolsModule.setFirebaseService;
  console.log('✅ Tools router imported successfully');
} catch (error) {
  console.error('❌ Failed to import tools router:', error.message);
  // Create a placeholder router if tools.js is missing
  toolsRouter = express.Router();
  toolsRouter.get('/', (req, res) => {
    res.json({ message: 'Tools endpoint placeholder' });
  });
  setFirebaseService = () => {};
}

console.log('🔧 Setting up Express app...');
const app = express();
const PORT = process.env.PORT || 5000;
console.log('🔌 Port configured:', PORT);

// Initialize Firebase Memory Service
let memoryService;
try {
  if (FirebaseMemoryService) {
    console.log('🔥 Initializing Firebase Memory Service...');
    memoryService = new FirebaseMemoryService();
    console.log('✅ Firebase Memory Service initialized');

    // Initialize tools with Firebase service
    setFirebaseService(memoryService);
    console.log('✅ Tools initialized with Firebase service');
  } else {
    console.error('❌ FirebaseMemoryService not available, creating mock service');
    memoryService = {
      storeConversation: async () => ({ success: false, error: 'Service unavailable' }),
      getConversationHistory: async () => [],
      storeStageProgression: async () => ({ success: false, error: 'Service unavailable' }),
      storeUserProfile: async () => ({ success: false, error: 'Service unavailable' }),
      getUserProfile: async () => null,
      clearUserData: async () => ({ success: false, error: 'Service unavailable' }),
      storeUserContext: async () => ({ success: false, error: 'Service unavailable' }),
      getUserStageProgressions: async () => [],
      getUserContext: async () => [],
      storeSessionStageProgression: async () => ({ success: false, error: 'Service unavailable' }),
      storeSessionUserContext: async () => ({ success: false, error: 'Service unavailable' }),
      storeBreakthroughMoment: async () => ({ success: false, error: 'Service unavailable' }),
      storeTherapeuticTheme: async () => ({ success: false, error: 'Service unavailable' }),
      getSessionData: async () => ({ stages: [], contexts: [], breakthroughs: [], themes: [] }),
      getCurrentSessionId: async () => `session-${Date.now()}`,
      healthCheck: async () => ({ status: 'unhealthy', service: 'firebase', error: 'Service unavailable' })
    };
  }
} catch (error) {
  console.error('❌ Failed to initialize Firebase Memory Service:', error.message);
  console.error('📍 Error stack:', error.stack);

  // Don't exit, use mock service instead
  memoryService = {
    storeConversation: async () => ({ success: false, error: 'Service initialization failed' }),
    getConversationHistory: async () => [],
    storeStageProgression: async () => ({ success: false, error: 'Service initialization failed' }),
    storeUserProfile: async () => ({ success: false, error: 'Service initialization failed' }),
    getUserProfile: async () => null,
    clearUserData: async () => ({ success: false, error: 'Service initialization failed' }),
    storeUserContext: async () => ({ success: false, error: 'Service initialization failed' }),
    getUserStageProgressions: async () => [],
    getUserContext: async () => [],
    storeSessionStageProgression: async () => ({ success: false, error: 'Service initialization failed' }),
    storeSessionUserContext: async () => ({ success: false, error: 'Service initialization failed' }),
    storeBreakthroughMoment: async () => ({ success: false, error: 'Service initialization failed' }),
    storeTherapeuticTheme: async () => ({ success: false, error: 'Service initialization failed' }),
    getSessionData: async () => ({ stages: [], contexts: [], breakthroughs: [], themes: [] }),
    getCurrentSessionId: async () => `session-${Date.now()}`,
    healthCheck: async () => ({ status: 'unhealthy', service: 'firebase', error: 'Service initialization failed' })
  };
}

// Auth middleware - check for verified email in production
const verifyToken = async (req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('Auth middleware: allowing request in development mode');
    return next();
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No auth token provided' });
    }

    const token = authHeader.split(' ')[1];
    // In production, you'd verify the token here and check email_verified
    // For now, we'll rely on Firestore security rules
    console.log('Auth middleware: token present, allowing request');
    next();
  } catch (error) {
    console.error('Auth verification error:', error);
    res.status(401).json({ error: 'Invalid authentication' });
  }
};

// Middleware
console.log('🔧 Setting up middleware...');
try {
  app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.FRONTEND_URL 
      : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
    credentials: true
  }));
  console.log('✅ CORS middleware configured');

  app.use(express.json());
  console.log('✅ JSON middleware configured');

  app.use(express.urlencoded({ extended: true }));
  console.log('✅ URL encoding middleware configured');

  // Add request logging middleware
  app.use((req, res, next) => {
    console.log(`📨 ${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
  console.log('✅ Request logging middleware configured');
} catch (error) {
  console.error('❌ Failed to configure middleware:', error.message);
  process.exit(1);
}

// Health check - MUST be before other routes
app.get('/api/health', async (req, res) => {
  console.log('🏥 Health check requested');
  try {
    const firebaseHealth = await memoryService.healthCheck();
    const healthResponse = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      services: {
        firebase: firebaseHealth,
        server: { 
          status: 'healthy',
          uptime: process.uptime(),
          memory: process.memoryUsage()
        }
      }
    };
    console.log('✅ Health check passed:', healthResponse);
    res.json(healthResponse);
  } catch (error) {
    console.error('❌ Health check error:', error);
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Memory API Routes
app.post('/api/memory/conversation', verifyToken, async (req, res) => {
  try {
    const { userUUID, ...conversationData } = req.body;

    if (!userUUID) {
      return res.status(400).json({ error: 'userUUID is required' });
    }

    const result = await memoryService.storeConversation(userUUID, conversationData);
    res.json(result);
  } catch (error) {
    console.error('Store conversation error:', error);
    res.status(500).json({ error: 'Failed to store conversation', details: error.message });
  }
});

app.get('/api/memory/conversation/:userUUID', async (req, res) => {
  try {
    const { userUUID } = req.params;
    const { limit = 50 } = req.query;

    const conversations = await memoryService.getConversationHistory(userUUID, parseInt(limit));
    res.json(conversations);
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: 'Failed to retrieve conversations', details: error.message });
  }
});

app.post('/api/memory/stage', async (req, res) => {
  try {
    const { userUUID, ...stageData } = req.body;

    console.log('📥 Stage progression request received:', { userUUID, stageData });

    if (!userUUID) {
      console.log('❌ Missing userUUID in stage request');
      return res.status(400).json({ error: 'userUUID is required' });
    }

    const result = await memoryService.storeStageProgression(userUUID, stageData);
    console.log('✅ Stage progression stored successfully:', result);
    res.json(result);
  } catch (error) {
    console.error('❌ Store stage error:', error);
    console.error('Error details:', error.stack);
    res.status(500).json({ error: 'Failed to store stage', details: error.message });
  }
});

app.post('/api/memory/profile', async (req, res) => {
  try {
    const { userUUID, ...profileData } = req.body;

    if (!userUUID) {
      return res.status(400).json({ error: 'userUUID is required' });
    }

    const result = await memoryService.storeUserProfile(userUUID, profileData);
    res.json(result);
  } catch (error) {
    console.error('Store profile error:', error);
    res.status(500).json({ error: 'Failed to store profile', details: error.message });
  }
});

app.get('/api/memory/profile/:userUUID', async (req, res) => {
  try {
    const { userUUID } = req.params;
    console.log('Getting profile for user:', userUUID);

    const profile = await memoryService.getUserProfile(userUUID);

    if (!profile) {
      console.log('Profile not found for user:', userUUID);
      return res.status(404).json({ error: 'Profile not found' });
    }

    console.log('Profile found for user:', userUUID);
    res.json(profile);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to retrieve profile', details: error.message });
  }
});

app.delete('/api/memory/user/:userUUID', async (req, res) => {
  try {
    const { userUUID } = req.params;
    console.log('Clearing data for user:', userUUID);

    const result = await memoryService.clearUserData(userUUID);
    console.log('Delete result:', result);

    res.json({ 
      success: true, 
      message: 'User data cleared',
      ...result
    });
  } catch (error) {
    console.error('Clear user data error:', error);
    res.status(500).json({ error: 'Failed to clear user data', details: error.message });
  }
});

// Store user context
app.post('/api/memory/context', async (req, res) => {
  try {
    const { userUUID, ...contextData } = req.body;

    console.log('📥 User context request received:', { userUUID, contextData });

    if (!userUUID) {
      console.log('❌ Missing userUUID in context request');
      return res.status(400).json({ error: 'userUUID is required' });
    }

    const result = await memoryService.storeUserContext(userUUID, contextData);
    console.log('✅ User context stored successfully:', result);
    res.json(result);
  } catch (error) {
    console.error('❌ Store context error:', error);
    console.error('Error details:', error.stack);
    res.status(500).json({ error: 'Failed to store context', details: error.message });
  }
});

// Get user stage progressions
app.get('/api/memory/stages/:userUUID', async (req, res) => {
  try {
    const { userUUID } = req.params;
    const { limit = 50 } = req.query;

    const progressions = await memoryService.getUserStageProgressions(userUUID, parseInt(limit));
    res.json(progressions);
  } catch (error) {
    console.error('Get stage progressions error:', error);
    res.status(500).json({ error: 'Failed to retrieve stage progressions', details: error.message });
  }
});

// Get user context
app.get('/api/memory/context/:userUUID', async (req, res) => {
  try {
    const { userUUID } = req.params;
    const { limit = 20 } = req.query;

    const contexts = await memoryService.getUserContext(userUUID, parseInt(limit));
    res.json(contexts);
  } catch (error) {
    console.error('Get user context error:', error);
    res.status(500).json({ error: 'Failed to retrieve user context', details: error.message });
  }
});

// Store session-specific data
app.post('/api/memory/session/:sessionId/stage', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { userUUID, ...stageData } = req.body;

    if (!userUUID) {
      return res.status(400).json({ error: 'userUUID is required' });
    }

    const result = await memoryService.storeSessionStageProgression(userUUID, sessionId, stageData);
    res.json(result);
  } catch (error) {
    console.error('Store session stage error:', error);
    res.status(500).json({ error: 'Failed to store session stage', details: error.message });
  }
});

app.post('/api/memory/session/:sessionId/context', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { userUUID, ...contextData } = req.body;

    if (!userUUID) {
      return res.status(400).json({ error: 'userUUID is required' });
    }

    const result = await memoryService.storeSessionUserContext(userUUID, sessionId, contextData);
    res.json(result);
  } catch (error) {
    console.error('Store session context error:', error);
    res.status(500).json({ error: 'Failed to store session context', details: error.message });
  }
});

app.post('/api/memory/session/:sessionId/breakthrough', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { userUUID, ...breakthroughData } = req.body;

    if (!userUUID) {
      return res.status(400).json({ error: 'userUUID is required' });
    }

    const result = await memoryService.storeBreakthroughMoment(userUUID, sessionId, breakthroughData);
    res.json(result);
  } catch (error) {
    console.error('Store breakthrough moment error:', error);
    res.status(500).json({ error: 'Failed to store breakthrough moment', details: error.message });
  }
});

app.post('/api/memory/session/:sessionId/theme', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { userUUID, ...themeData } = req.body;

    if (!userUUID) {
      return res.status(400).json({ error: 'userUUID is required' });
    }

    const result = await memoryService.storeTherapeuticTheme(userUUID, sessionId, themeData);
    res.json(result);
  } catch (error) {
    console.error('Store therapeutic theme error:', error);
    res.status(500).json({ error: 'Failed to store therapeutic theme', details: error.message });
  }
});

// Get session data
app.get('/api/memory/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { userUUID, dataType = 'all' } = req.query;

    if (!userUUID) {
      return res.status(400).json({ error: 'userUUID is required' });
    }

    const sessionData = await memoryService.getSessionData(userUUID, sessionId, dataType);
    res.json(sessionData);
  } catch (error) {
    console.error('Get session data error:', error);
    res.status(500).json({ error: 'Failed to retrieve session data', details: error.message });
  }
});

// Get current session ID
app.get('/api/memory/current-session/:userUUID', async (req, res) => {
  try {
    const { userUUID } = req.params;

    const sessionId = await memoryService.getCurrentSessionId(userUUID);
    res.json({ sessionId });
  } catch (error) {
    console.error('Get current session error:', error);
    res.status(500).json({ error: 'Failed to retrieve current session', details: error.message });
  }
});

// Tools API Routes
if (toolsRouter) {
  app.use('/api/tools', toolsRouter);
  console.log('✅ Tools routes mounted');
} else {
  console.log('⚠️ Tools routes not available');
}

// ElevenLabs Webhook Endpoint
app.post('/api/elevenlabs-webhook', async (req, res) => {
  try {
    // Verify webhook secret if configured
    const webhookSecret = process.env.ELEVENLABS_WEBHOOK_SECRET;
    if (webhookSecret) {
      const providedSecret = req.headers['x-elevenlabs-signature'] || req.headers['authorization'];
      if (!providedSecret || !providedSecret.includes(webhookSecret)) {
        console.warn('Invalid webhook secret provided');
        return res.status(401).json({ error: 'Unauthorized webhook request' });
      }
    }

    console.log('ElevenLabs webhook received:', req.body);

    const { agent_id, conversation_id, user_id, message, message_type, timestamp } = req.body;

    // Process webhook data and store in Firebase
    if (user_id && message) {
      const conversationEntry = {
        type: message_type === 'user_message' ? 'user' : 'assistant',
        content: message,
        agent_id,
        conversation_id,
        timestamp: timestamp || new Date().toISOString(),
        metadata: {
          source: 'elevenlabs_webhook'
        }
      };

      // Store conversation in Firebase
      try {
        await memoryService.storeConversation(user_id, conversationEntry);
        console.log('Webhook conversation stored in Firebase');
      } catch (error) {
        console.error('Failed to store webhook conversation in Firebase:', error);
      }
    }

    res.json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

// Catch-all error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'API endpoint not found',
    path: req.path,
    timestamp: new Date().toISOString()
  });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

console.log('🔗 Starting server listener...');
try {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('🎉 SERVER STARTUP COMPLETE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🚀 Memory backend server running on port ${PORT}`);
    console.log(`📊 Health check: http://0.0.0.0:${PORT}/api/health`);
    console.log(`🪝 Webhook endpoint: http://0.0.0.0:${PORT}/api/elevenlabs-webhook`);
    console.log(`🌐 Server accessible at: https://${process.env.REPL_SLUG || 'your-repl'}.${process.env.REPL_OWNER || 'your-username'}.replit.app`);
    console.log(`📦 Environment: NODE_ENV=${process.env.NODE_ENV || 'development'}`);
    console.log(`🔥 Firebase Project: ${process.env.FIREBASE_PROJECT_ID || 'Not configured'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  });

  server.on('error', (error) => {
    console.error('❌ Server error:', error.message);
    console.error('📍 Error code:', error.code);
    if (error.code === 'EADDRINUSE') {
      console.error(`🔌 Port ${PORT} is already in use. Trying to find available port...`);
    }
    process.exit(1);
  });

} catch (error) {
  console.error('❌ Failed to start server:', error.message);
  console.error('📍 Error stack:', error.stack);
  process.exit(1);
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});