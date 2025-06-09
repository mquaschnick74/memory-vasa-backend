
import ContextTool from './ContextTool.js';

let toolsInstance = null;

export function initializeToolsWithFirebase(firebaseService) {
  const contextTool = new ContextTool(firebaseService);
  
  toolsInstance = {
    get_user_context: contextTool
  };
  
  console.log('✅ Tools initialized with Firebase service');
  return toolsInstance;
}

export function getTools() {
  return toolsInstance;
}

export default {
  initializeToolsWithFirebase,
  getTools
};
