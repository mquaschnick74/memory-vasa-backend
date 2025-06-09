import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, query, orderBy, limit, where, deleteDoc, writeBatch } from 'firebase/firestore';
import firebaseConfig from '../firebase-config.js';

class FirebaseMemoryService {
  constructor() {
    try {
      // Initialize Firebase only if not already initialized
      if (getApps().length === 0) {
        this.app = initializeApp(firebaseConfig);
        console.log('✅ Firebase app initialized');
      } else {
        this.app = getApps()[0];
        console.log('✅ Using existing Firebase app');
      }

      this.db = getFirestore(this.app);
      console.log('✅ Firestore database connected');
    } catch (error) {
      console.error('❌ Firebase initialization error:', error);
      throw error;
    }
  }

  async healthCheck() {
    try {
      // Test Firestore connection by reading a test document
      const testDoc = doc(this.db, 'health', 'test');
      await getDoc(testDoc);
      return { status: 'healthy', service: 'firebase' };
    } catch (error) {
      console.error('Firebase health check failed:', error);
      return { status: 'unhealthy', service: 'firebase', error: error.message };
    }
  }

  async storeConversation(userUUID, conversationData) {
    try {
      const conversationRef = doc(collection(this.db, 'users', userUUID, 'conversations'));
      await setDoc(conversationRef, {
        ...conversationData,
        timestamp: conversationData.timestamp || new Date().toISOString(),
        createdAt: new Date().toISOString()
      });

      console.log('✅ Conversation stored in Firebase');
      return { success: true, id: conversationRef.id };
    } catch (error) {
      console.error('❌ Error storing conversation:', error);
      return { success: false, error: error.message };
    }
  }

  async getConversationHistory(userUUID, limitCount = 50) {
    try {
      const conversationsRef = collection(this.db, 'users', userUUID, 'conversations');
      const q = query(conversationsRef, orderBy('timestamp', 'desc'), limit(limitCount));
      const querySnapshot = await getDocs(q);

      const conversations = [];
      querySnapshot.forEach((doc) => {
        conversations.push({ id: doc.id, ...doc.data() });
      });

      console.log(`✅ Retrieved ${conversations.length} conversations for user ${userUUID}`);
      return conversations;
    } catch (error) {
      console.error('❌ Error getting conversation history:', error);
      return [];
    }
  }

  async storeStageProgression(userUUID, stageData) {
    try {
      const stageRef = doc(collection(this.db, 'users', userUUID, 'stages'));
      await setDoc(stageRef, {
        ...stageData,
        timestamp: stageData.timestamp || new Date().toISOString(),
        createdAt: new Date().toISOString()
      });

      console.log('✅ Stage progression stored in Firebase');
      return { success: true, id: stageRef.id };
    } catch (error) {
      console.error('❌ Error storing stage progression:', error);
      return { success: false, error: error.message };
    }
  }

  async storeUserProfile(userUUID, profileData) {
    try {
      const profileRef = doc(this.db, 'users', userUUID);
      await setDoc(profileRef, {
        ...profileData,
        lastUpdated: new Date().toISOString()
      }, { merge: true });

      console.log('✅ User profile stored in Firebase');
      return { success: true };
    } catch (error) {
      console.error('❌ Error storing user profile:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserProfile(userUUID) {
    try {
      const profileRef = doc(this.db, 'users', userUUID);
      const profileSnap = await getDoc(profileRef);

      if (profileSnap.exists()) {
        console.log('✅ User profile retrieved from Firebase');
        return profileSnap.data();
      } else {
        console.log('ℹ️ No user profile found');
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting user profile:', error);
      return null;
    }
  }

  async clearUserData(userUUID) {
    try {
      const batch = writeBatch(this.db);

      // Delete user profile
      const userRef = doc(this.db, 'users', userUUID);
      batch.delete(userRef);

      // Delete conversations
      const conversationsRef = collection(this.db, 'users', userUUID, 'conversations');
      const conversationsSnapshot = await getDocs(conversationsRef);
      conversationsSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // Delete stages
      const stagesRef = collection(this.db, 'users', userUUID, 'stages');
      const stagesSnapshot = await getDocs(stagesRef);
      stagesSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      console.log('✅ User data cleared from Firebase');
      return { success: true };
    } catch (error) {
      console.error('❌ Error clearing user data:', error);
      return { success: false, error: error.message };
    }
  }

  async storeUserContext(userUUID, contextData) {
    try {
      const contextRef = doc(collection(this.db, 'users', userUUID, 'context'));
      await setDoc(contextRef, {
        ...contextData,
        timestamp: contextData.timestamp || new Date().toISOString(),
        createdAt: new Date().toISOString()
      });

      console.log('✅ User context stored in Firebase');
      return { success: true, id: contextRef.id };
    } catch (error) {
      console.error('❌ Error storing user context:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserStageProgressions(userUUID, limitCount = 50) {
    try {
      const stagesRef = collection(this.db, 'users', userUUID, 'stages');
      const q = query(stagesRef, orderBy('timestamp', 'desc'), limit(limitCount));
      const querySnapshot = await getDocs(q);

      const progressions = [];
      querySnapshot.forEach((doc) => {
        progressions.push({ id: doc.id, ...doc.data() });
      });

      return progressions;
    } catch (error) {
      console.error('❌ Error getting stage progressions:', error);
      return [];
    }
  }

  async getUserContext(userUUID, limitCount = 20) {
    try {
      const contextRef = collection(this.db, 'users', userUUID, 'context');
      const q = query(contextRef, orderBy('timestamp', 'desc'), limit(limitCount));
      const querySnapshot = await getDocs(q);

      const contexts = [];
      querySnapshot.forEach((doc) => {
        contexts.push({ id: doc.id, ...doc.data() });
      });

      return contexts;
    } catch (error) {
      console.error('❌ Error getting user context:', error);
      return [];
    }
  }

  async storeSessionStageProgression(userUUID, sessionId, stageData) {
    try {
      const sessionRef = doc(collection(this.db, 'users', userUUID, 'sessions', sessionId, 'stages'));
      await setDoc(sessionRef, {
        ...stageData,
        sessionId,
        timestamp: stageData.timestamp || new Date().toISOString(),
        createdAt: new Date().toISOString()
      });

      return { success: true, id: sessionRef.id };
    } catch (error) {
      console.error('❌ Error storing session stage:', error);
      return { success: false, error: error.message };
    }
  }

  async storeSessionUserContext(userUUID, sessionId, contextData) {
    try {
      const sessionRef = doc(collection(this.db, 'users', userUUID, 'sessions', sessionId, 'context'));
      await setDoc(sessionRef, {
        ...contextData,
        sessionId,
        timestamp: contextData.timestamp || new Date().toISOString(),
        createdAt: new Date().toISOString()
      });

      return { success: true, id: sessionRef.id };
    } catch (error) {
      console.error('❌ Error storing session context:', error);
      return { success: false, error: error.message };
    }
  }

  async storeBreakthroughMoment(userUUID, sessionId, breakthroughData) {
    try {
      const breakthroughRef = doc(collection(this.db, 'users', userUUID, 'sessions', sessionId, 'breakthroughs'));
      await setDoc(breakthroughRef, {
        ...breakthroughData,
        sessionId,
        timestamp: breakthroughData.timestamp || new Date().toISOString(),
        createdAt: new Date().toISOString()
      });

      return { success: true, id: breakthroughRef.id };
    } catch (error) {
      console.error('❌ Error storing breakthrough moment:', error);
      return { success: false, error: error.message };
    }
  }

  async storeTherapeuticTheme(userUUID, sessionId, themeData) {
    try {
      const themeRef = doc(collection(this.db, 'users', userUUID, 'sessions', sessionId, 'themes'));
      await setDoc(themeRef, {
        ...themeData,
        sessionId,
        timestamp: themeData.timestamp || new Date().toISOString(),
        createdAt: new Date().toISOString()
      });

      return { success: true, id: themeRef.id };
    } catch (error) {
      console.error('❌ Error storing therapeutic theme:', error);
      return { success: false, error: error.message };
    }
  }

  async getSessionData(userUUID, sessionId, dataType = 'all') {
    try {
      const sessionData = {};

      if (dataType === 'all' || dataType === 'stages') {
        const stagesRef = collection(this.db, 'users', userUUID, 'sessions', sessionId, 'stages');
        const stagesSnapshot = await getDocs(stagesRef);
        sessionData.stages = [];
        stagesSnapshot.forEach((doc) => {
          sessionData.stages.push({ id: doc.id, ...doc.data() });
        });
      }

      if (dataType === 'all' || dataType === 'context') {
        const contextRef = collection(this.db, 'users', userUUID, 'sessions', sessionId, 'context');
        const contextSnapshot = await getDocs(contextRef);
        sessionData.context = [];
        contextSnapshot.forEach((doc) => {
          sessionData.context.push({ id: doc.id, ...doc.data() });
        });
      }

      if (dataType === 'all' || dataType === 'breakthroughs') {
        const breakthroughsRef = collection(this.db, 'users', userUUID, 'sessions', sessionId, 'breakthroughs');
        const breakthroughsSnapshot = await getDocs(breakthroughsRef);
        sessionData.breakthroughs = [];
        breakthroughsSnapshot.forEach((doc) => {
          sessionData.breakthroughs.push({ id: doc.id, ...doc.data() });
        });
      }

      if (dataType === 'all' || dataType === 'themes') {
        const themesRef = collection(this.db, 'users', userUUID, 'sessions', sessionId, 'themes');
        const themesSnapshot = await getDocs(themesRef);
        sessionData.themes = [];
        themesSnapshot.forEach((doc) => {
          sessionData.themes.push({ id: doc.id, ...doc.data() });
        });
      }

      return sessionData;
    } catch (error) {
      console.error('❌ Error getting session data:', error);
      return {};
    }
  }

  async getCurrentSessionId(userUUID) {
    try {
      // For now, generate a simple session ID based on date
      const today = new Date().toISOString().split('T')[0];
      return `session_${today}_${Date.now()}`;
    } catch (error) {
      console.error('❌ Error getting current session:', error);
      return `session_${Date.now()}`;
    }
  }
}

export default FirebaseMemoryService;