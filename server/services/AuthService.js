
import { 
  signInAnonymously, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  reload
} from 'firebase/auth';
import { auth } from '../../src/firebase-config.js';

class AuthService {
  constructor() {
    this.currentUser = null;
    this.authStateListeners = [];
    
    // Monitor auth state changes
    onAuthStateChanged(auth, (user) => {
      this.currentUser = user;
      this.authStateListeners.forEach(listener => listener(user));
    });
  }

  // Anonymous authentication (for testing/guest users)
  async signInAnonymously() {
    try {
      const result = await signInAnonymously(auth);
      console.log('Anonymous sign-in successful:', result.user.uid);
      return result.user;
    } catch (error) {
      console.error('Anonymous sign-in failed:', error);
      throw error;
    }
  }

  // Email/password authentication
  async signInWithEmail(email, password) {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log('Email sign-in successful:', result.user.uid);
      return result.user;
    } catch (error) {
      console.error('Email sign-in failed:', error);
      throw error;
    }
  }

  // Create new user account
  async createUserWithEmail(email, password) {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      console.log('User creation successful:', result.user.uid);
      return result.user;
    } catch (error) {
      console.error('User creation failed:', error);
      throw error;
    }
  }

  // Sign out
  async signOut() {
    try {
      await signOut(auth);
      console.log('Sign-out successful');
    } catch (error) {
      console.error('Sign-out failed:', error);
      throw error;
    }
  }

  // Get current user
  getCurrentUser() {
    return this.currentUser;
  }

  // Get user ID token for API authentication
  async getIdToken() {
    if (!this.currentUser) {
      throw new Error('No authenticated user');
    }
    return await this.currentUser.getIdToken();
  }

  // Listen to auth state changes
  onAuthStateChanged(callback) {
    this.authStateListeners.push(callback);
    return () => {
      this.authStateListeners = this.authStateListeners.filter(l => l !== callback);
    };
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.currentUser;
  }

  // Send email verification
  async sendEmailVerification() {
    if (!this.currentUser) {
      throw new Error('No authenticated user');
    }
    
    try {
      await sendEmailVerification(this.currentUser);
      console.log('Email verification sent');
      return { success: true };
    } catch (error) {
      console.error('Email verification failed:', error);
      throw error;
    }
  }

  // Check if email is verified
  isEmailVerified() {
    return this.currentUser?.emailVerified || false;
  }

  // Reload user to check latest verification status
  async reloadUser() {
    if (!this.currentUser) {
      throw new Error('No authenticated user');
    }
    
    try {
      await reload(this.currentUser);
      return this.currentUser.emailVerified;
    } catch (error) {
      console.error('Failed to reload user:', error);
      throw error;
    }
  }
}

export default AuthService;
