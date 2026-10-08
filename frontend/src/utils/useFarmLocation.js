import { useState, useCallback } from 'react';
import {
  getCurrentLocation,
  checkLocationPermission,
  saveLocationToProfile,
  getLocationFromProfile
} from '../lib/location.jsx';

/**
 * Custom hook for farm location handling in GramMitra
 * Provides location state, loading states, and functions to get/save location
 */
export const useFarmLocation = () => {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState(null);

  // Load location from profile on init
  const loadLocationFromProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const loc = await getLocationFromProfile();
      setLocation(loc);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Get current location via GPS
  const getCurrentPosition = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const pos = await getCurrentLocation();
      setLocation(pos);
      // Save to profile
      await saveLocationToProfile(pos);
      return pos;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Check location permission status
  const checkPermission = useCallback(async () => {
    try {
      const status = await checkLocationPermission();
      setPermissionStatus(status);
      return status;
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, []);

  // Save location manually (e.g., from search results)
  const saveLocation = useCallback(async (locationData) => {
    setLoading(true);
    setError(null);
    try {
      await saveLocationToProfile(locationData);
      setLocation(locationData);
      return locationData;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize
  // Note: In a real app, you'd call loadLocationFromProfile in useEffect
  // but we're keeping this hook pure for now - components should call it

  return {
    location,
    loading,
    error,
    permissionStatus,
    loadLocationFromProfile,
    getCurrentPosition,
    checkPermission,
    saveLocation
  };
};

// Default export for convenience
export default useFarmLocation;