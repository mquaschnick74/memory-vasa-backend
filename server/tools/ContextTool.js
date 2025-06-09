class ContextTool {
  constructor(firebaseService = null) {
    this.name = 'get_user_context';
    this.description = 'Retrieve conversation history, user profile, and symbolic progression data to maintain continuity across sessions.';
    this.firebaseService = firebaseService;

    // Tool schema for ElevenLabs
    this.schema = {
      type: 'function',
      function: {
        name: this.name,
        description: this.description,
        parameters: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'The unique identifier for the user'
            },
            context_type: {
              type: 'string',
              enum: ['conversation', 'profile', 'stages', 'session', 'all'],
              description: 'Type of context to retrieve'
            },
            session_id: {
              type: 'string',
              description: 'Specific session ID to retrieve data for (optional, uses current session if not provided)'
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 50,
              default: 10,
              description: 'Number of recent entries to retrieve'
            }
          },
          required: ['user_id']
        }
      }
    };
  }

  async execute(parameters) {
    try {
      const { user_id, context_type = 'all', session_id, limit = 10 } = parameters;

      if (!user_id) {
        return {
          success: false,
          error: 'User ID is required'
        };
      }

      if (!this.firebaseService) {
        return {
          success: false,
          error: 'Firebase service not available'
        };
      }

      // Get current session ID if not provided
      const currentSessionId = session_id || await this.firebaseService.getCurrentSessionId(user_id);

      const result = {
        user_id,
        session_id: currentSessionId,
        timestamp: new Date().toISOString(),
        context: {}
      };

      // Get conversation history
      if (context_type === 'conversation' || context_type === 'all') {
        try {
          const conversations = await this.firebaseService.getConversationHistory(user_id, limit);
          result.context.conversations = {
            total: conversations.length,
            recent_messages: conversations.slice(-5).map(msg => ({
              type: msg.type,
              content: msg.content?.substring(0, 200) + (msg.content?.length > 200 ? '...' : ''),
              stage: msg.stage,
              timestamp: msg.timestamp
            })),
            summary: this.generateConversationSummary(conversations)
          };
        } catch (error) {
          result.context.conversations = { error: 'Failed to retrieve conversations' };
        }
      }

      // Get user profile
      if (context_type === 'profile' || context_type === 'all') {
        try {
          const profile = await this.firebaseService.getUserProfile(user_id);
          if (profile) {
            result.context.profile = {
              symbolic_name: profile.symbolicName || profile.name,
              current_stage: profile.currentStage || profile.lastStage,
              registration_date: profile.registrationDate || profile.createdAt,
              session_count: profile.sessionCount || 0,
              themes: profile.recurring_themes || []
            };
          }
        } catch (error) {
          result.context.profile = { error: 'Failed to retrieve profile' };
        }
      }

      // Get stage progressions
      if (context_type === 'stages' || context_type === 'all') {
        try {
          const stages = await this.firebaseService.getUserStageProgressions(user_id, limit);
          result.context.stages = {
            current_stage: result.context.profile?.current_stage || '⊙',
            progression_notes: 'Stage progression tracking active',
            total_progressions: stages.length
          };
        } catch (error) {
          result.context.stages = { error: 'Failed to retrieve stage data' };
        }
      }

      // Get session-specific data
      if ((context_type === 'session' || context_type === 'all') && currentSessionId) {
        try {
          const sessionData = await this.firebaseService.getSessionData(user_id, currentSessionId);
          result.context.session = {
            session_id: currentSessionId,
            stage_progressions: sessionData.stage_progressions || [],
            user_context: sessionData.user_context || [],
            breakthrough_moments: sessionData.breakthrough_moments || [],
            therapeutic_themes: sessionData.therapeutic_themes || [],
            summary: this.generateSessionSummary(sessionData)
          };
        } catch (error) {
          result.context.session = { error: 'Failed to retrieve session data' };
        }
      }

      return {
        success: true,
        data: result,
        instructions: this.generateInstructions(result)
      };

    } catch (error) {
      return {
        success: false,
        error: `Context retrieval failed: ${error.message}`
      };
    }
  }

  generateConversationSummary(conversations) {
    if (!conversations || conversations.length === 0) {
      return 'No previous conversation history found.';
    }

    const userMessages = conversations.filter(c => c.type === 'user').length;
    const assistantMessages = conversations.filter(c => c.type === 'assistant').length;
    const stages = [...new Set(conversations.filter(c => c.stage).map(c => c.stage))];

    let summary = `Previous sessions: ${userMessages} user messages, ${assistantMessages} VASA responses.`;

    if (stages.length > 0) {
      summary += ` CSS stages explored: ${stages.join(', ')}.`;
    }

    // Identify recurring themes
    const allContent = conversations.map(c => c.content || '').join(' ').toLowerCase();
    const themes = [];
    if (allContent.includes('contradiction')) themes.push('contradictions/tensions');
    if (allContent.includes('completion')) themes.push('completion work');
    if (allContent.includes('fragment')) themes.push('fragmentation');
    if (allContent.includes('integration')) themes.push('integration');

    if (themes.length > 0) {
      summary += ` Recurring themes: ${themes.join(', ')}.`;
    }

    return summary;
  }

  generateInstructions(contextData) {
    const instructions = [];

    if (contextData.context.conversations?.total > 0) {
      instructions.push('Reference previous conversation when relevant.');
      instructions.push('Build upon established symbolic themes and patterns.');
    }

    if (contextData.context.profile?.symbolic_name) {
      instructions.push(`Address user by their symbolic name: ${contextData.context.profile.symbolic_name}.`);
    }

    if (contextData.context.profile?.current_stage) {
      instructions.push(`Continue from CSS stage: ${contextData.context.profile.current_stage}.`);
    }

    instructions.push('Acknowledge conversation continuity naturally in your response.');

    return instructions.join(' ');
  }

  generateSessionSummary(sessionData) {
    const parts = [];
    
    if (sessionData.stage_progressions?.length > 0) {
      const stages = sessionData.stage_progressions.map(s => s.stage).join(', ');
      parts.push(`CSS stages in this session: ${stages}`);
    }
    
    if (sessionData.breakthrough_moments?.length > 0) {
      parts.push(`${sessionData.breakthrough_moments.length} breakthrough moment(s) identified`);
    }
    
    if (sessionData.therapeutic_themes?.length > 0) {
      const themes = sessionData.therapeutic_themes.map(t => t.theme || t.name).join(', ');
      parts.push(`Therapeutic themes: ${themes}`);
    }
    
    if (sessionData.user_context?.length > 0) {
      parts.push(`${sessionData.user_context.length} context entries recorded`);
    }
    
    return parts.join('. ') || 'New session, no data recorded yet.';
  }
}

export default ContextTool;