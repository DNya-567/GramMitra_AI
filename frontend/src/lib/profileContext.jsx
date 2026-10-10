import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../api/supabaseClient';

const PROFILE_STORAGE_KEY = 'grammitra_user_profile';
const PROFILE_CACHE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export const ProfileContext = createContext(null);

export function ProfileProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load profile from localStorage on init
  useEffect(() => {
    try {
      const cached = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        // Check if cache is still valid
        if (Date.now() - parsed.timestamp < PROFILE_CACHE_TIMEOUT) {
          setProfile(parsed.data);
        }
      }
    } catch (e) {
      console.warn('Failed to load profile from cache:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch profile from API - only if we have a session
  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // No session, set loading to false and return
        setLoading(false);
        return null;
      }

      const { data, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (profileError) throw profileError;

      // Cache the profile
      const profileData = {
        data: data,
        timestamp: Date.now()
      };
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profileData));

      setProfile(data);
      return data;
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Refresh profile in background
  const refreshProfile = async () => {
    try {
      await fetchProfile();
    } catch (err) {
      // Silently fail for background refresh
      console.warn('Background profile refresh failed:', err);
    }
  };

  // Initialize: load from cache, then set up auth state listener
  useEffect(() => {
    // Load profile from cache on init
    try {
      const cached = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        // Check if cache is still valid
        if (Date.now() - parsed.timestamp < PROFILE_CACHE_TIMEOUT) {
          setProfile(parsed.data);
        }
      }
    } catch (e) {
      console.warn('Failed to load profile from cache:', e);
    } finally {
      setLoading(false);
    }

    // Set up auth state change listener to re-fetch profile on login/logout
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session) {
          // User logged in or session created - fetch profile
          await fetchProfile();
        } else {
          // User logged out or session cleared - clear profile and cache
          setProfile(null);
          setError(null);
          localStorage.removeItem(PROFILE_STORAGE_KEY);
        }
      }
    );

    // Clean up subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    profile,
    loading,
    error,
    refetch: fetchProfile,
    refresh: refreshProfile
  };

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
}

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};