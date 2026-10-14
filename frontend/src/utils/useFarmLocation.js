import { useState, useCallback } from 'react';
import {
  getCurrentLocation,
  checkLocationPermission,
  saveLocationToProfile,
  reverseGeocode
} from '../lib/location.js';
import { useProfile } from '../lib/profileContext.jsx';

/**
 * Custom hook for farm location handling in GramMitra
 * Provides location state, loading states, and functions to get/save location
 */
export const useFarmLocation = () => {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState(null);
  const { profile } = useProfile();

  // Load location from profile on init
  const loadLocationFromProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (profile) {
        const locationData = {
          latitude: profile.latitude,
          longitude: profile.longitude,
          village: profile.village,
          district: profile.district,
          state: profile.state,
          location: profile.location
        };
        // If all fields are null, set location to null
        if (locationData.latitude === null && locationData.longitude === null &&
            locationData.village === null && locationData.district === null &&
            locationData.state === null && locationData.location === null) {
          setLocation(null);
        } else {
          setLocation(locationData);
        }
      } else {
        setLocation(null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [profile]);

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
      // If we have latitude and longitude but missing structured data, try to reverse geocode
      let processedData = { ...locationData };
      if (
        (processedData.latitude !== undefined && processedData.latitude !== null) ||
        (processedData.longitude !== undefined && processedData.longitude !== null)
      ) {
        // Check if we are missing any of village, district, state
        if (
          !processedData.village ||
          !processedData.district ||
          !processedData.state
        ) {
          // Try to reverse geocode
          const reverseData = await reverseGeocode(
            processedData.latitude,
            processedData.longitude
          );
          // Merge reverseData into processedData, but don't overwrite existing non-null fields
          processedData = {
            ...processedData,
            ...reverseData
          };
        }
      }

      await saveLocationToProfile(processedData);
      setLocation(processedData);
      return processedData;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [reverseGeocode, saveLocationToProfile]);

  // Get current location via GPS
  const getCurrentPosition = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const pos = await getCurrentLocation();
      // Save to profile (will reverse geocode if needed)
      await saveLocation(pos);
      setLocation(pos);
      return pos;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [saveLocation]);

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