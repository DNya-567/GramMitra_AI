import { supabase } from '../api/supabaseClient';

let cachedSession = null;
let listeners = [];

/**
 * Initialize the user session cache and set up auth state listeners
 */
export const initUserSession = () => {
  // Set up Supabase auth state change listener to keep cache updated
  supabase.auth.onAuthStateChange((event, session) => {
    cachedSession = session;
    // Notify all listeners
    listeners.forEach(callback => callback(session));
  });
};

/**
 * Get the current user session, using cache if available
 * @returns {Promise<Object|null>} Promise resolving to the session object or null
 */
export const getUserSession = async () => {
  if (cachedSession !== null) {
    return cachedSession;
  }
  const { data: { session } } = await supabase.auth.getSession();
  cachedSession = session;
  return session;
};

/**
 * Subscribe to session changes
 * @param {Function} callback - Function to call when session changes
 * @returns {Function} Unsubscribe function
 */
export const onSessionChange = (callback) => {
  listeners.push(callback);
  return () => {
    listeners = listeners.filter(listener => listener !== callback);
  };
};

/**
 * Clear the cached session (e.g., on logout)
 */
export const clearSession = () => {
  cachedSession = null;
};