
export class MemoryManager {
  constructor() {
    // Server-side memory manager - communicates with FirebaseMemoryService directly
    this.firebaseService = null;
  }

  setFirebaseService(service) {
    this.firebaseService = service;
  }

  async getConversationHistory(userUUID, limit = 50) {
    if (!this.firebaseService) {
      throw new Error('Firebase service not initialized');
    }
    return await this.firebaseService.getConversationHistory(userUUID, limit);
  }

  async getUserProfile(userUUID) {
    if (!this.firebaseService) {
      throw new Error('Firebase service not initialized');
    }
    return await this.firebaseService.getUserProfile(userUUID);
  }

  async storeConversation(userUUID, conversationData) {
    if (!this.firebaseService) {
      throw new Error('Firebase service not initialized');
    }
    return await this.firebaseService.storeConversation(userUUID, conversationData);
  }

  async getUserStageProgressions(userUUID, limit = 20) {
    if (!this.firebaseService) {
      throw new Error('Firebase service not initialized');
    }
    return await this.firebaseService.getUserStageProgressions(userUUID, limit);
  }

  async getUserContext(userUUID, limit = 20) {
    if (!this.firebaseService) {
      throw new Error('Firebase service not initialized');
    }
    return await this.firebaseService.getUserContext(userUUID, limit);
  }
}
