/**
 * Location utility module for GramMitra
 * Handles GPS location, profile storage, and caching
 */

import { supabase } from '../api/supabaseClient';

/**
 * Get current location via GPS with timeout and error handling
 * @returns {Promise<Object>} Promise resolving to {latitude, longitude} or rejecting with error
 */
export const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    const timeoutId = setTimeout(() => {
      reject(new Error('Location request timed out (10s)'));
    }, 10000);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timeoutId);
        // Round to 3 decimal places as requested
        resolve({
          latitude: parseFloat(position.coords.latitude.toFixed(3)),
          longitude: parseFloat(position.coords.longitude.toFixed(3))
        });
      },
      (error) => {
        clearTimeout(timeoutId);
        let message = 'Unknown location error';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location access denied. Please enable location permissions.';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            message = 'Location request timed out.';
            break;
          default:
            message = error.message;
        }
        reject(new Error(message));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  );
};

/**
 * Check location permission status
 * @returns {Promise<string>} Promise resolving to permission status
 */
export const checkLocationPermission = async () => {
  if (!navigator.permissions || !navigator.permissions.query) {
    return Promise.resolve('unsupported');
  }

  try {
    const permissionStatus = await navigator.permissions.query({name: 'geolocation'});
    return permissionStatus.state;
  } catch (err) {
    return 'error';
  }
};

/**
 * Save location to user profile
 * @param {Object} locationData - Object with latitude, longitude, and optional place info
 * @returns {Promise<Object>} Promise resolving to update result
 */
export const saveLocationToProfile = async (locationData) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const updates = {};
    if (locationData.latitude !== undefined) updates.latitude = locationData.latitude;
    if (locationData.longitude !== undefined) updates.longitude = locationData.longitude;
    if (locationData.village) updates.village = locationData.village;
    if (locationData.district) updates.district = locationData.district;
    if (locationData.state) updates.state = locationData.state;
    if (locationData.location) updates.location = locationData.location;

    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('user_id', user.id);

    if (error) throw error;
    return data;
  } catch (error) {
    throw error;
  }
};

/**
 * Get location from user profile
 * @returns {Promise<Object>} Promise resolving to location data or null
 */
export const getLocationFromProfile = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return null;
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .select('latitude, longitude, village, district, state, location')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
      throw error;
    }

    return data || null;
  } catch (error) {
    console.error('Error fetching location from profile:', error);
    return null;
  }
};

/**
 * Weather cache utility
 * Stores last weather response per location with timestamp in localStorage
 */
const STORAGE_KEY_PREFIX = 'grammitra_weather_';

/**
 * Cache weather response for a location
 * @param {string} cacheKey - Unique key for the location (e.g., "lat:12.34,lon:56.78" or "city:Delhi")
 * @param {Object} data - Weather data to cache
 */
export const cacheWeatherData = (cacheKey, data) => {
  try {
    const item = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(STORAGE_KEY_PREFIX + cacheKey, JSON.stringify(item));
  } catch (e) {
    console.warn('Failed to cache weather data:', e);
  }
};

/**
 * Get cached weather data for a location if not expired
 * @param {string} cacheKey - Unique key for the location
 * @param {number} maxAgeMinutes - Maximum age in minutes (default: 10)
 * @returns {Object|null} Cached data or null if not found/expired
 */
export const getCachedWeatherData = (cacheKey, maxAgeMinutes = 10) => {
  try {
    const item = localStorage.getItem(STORAGE_KEY_PREFIX + cacheKey);
    if (!item) return null;

    const parsed = JSON.parse(item);
    const ageMinutes = (Date.now() - parsed.timestamp) / 60000;
    if (ageMinutes > maxAgeMinutes) {
      // Remove expired cache
      localStorage.removeItem(STORAGE_KEY_PREFIX + cacheKey);
      return null;
    }

    return parsed.data;
  } catch (e) {
    console.warn('Failed to get cached weather data:', e);
    return null;
  }
};

/**
 * Generate cache key from location data
 * @param {Object} location - Location object with latitude/longitude or place name
 * @returns {string} Cache key
 */
export const generateWeatherCacheKey = (location) => {
  if (location.latitude !== undefined && location.longitude !== undefined) {
    return `lat:${location.latitude},lon:${location.longitude}`;
  } else if (location.location) {
    return `city:${location.location}`;
  } else {
    return `unknown:${Math.random()}`; // Fallback
  }
};

/**
 * Format minutes ago string
 * @param {number} minutes - Number of minutes
 * @returns {string} Formatted string (e.g., "Updated 5 minutes ago")
 */
export const formatTimeAgo = (minutes) => {
  if (minutes < 1) return 'Just updated';
  if (minutes === 1) return 'Updated 1 minute ago';
  return `Updated ${Math.round(minutes)} minutes ago`;
};