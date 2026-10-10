import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../api/supabaseClient';
import useFarmLocation from '../utils/useFarmLocation';
import { cacheWeatherData, getCachedWeatherData, generateWeatherCacheKey, formatTimeAgo } from '../lib/location.jsx';
import { getUserSession } from '../lib/userSession';
import { useProfile } from '../lib/profileContext.jsx';

export default function WeatherAdvisory() {
  const navigate = useNavigate();
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState(false);
  const isMountedRef = useRef(false);

  // Location hook
  const {
    location,
    loading: locLoading,
    error: locError,
    getCurrentPosition,
    checkPermission,
    saveLocation,
    loadLocationFromProfile
  } = useFarmLocation();

  // Profile context
  const { profile, loading: profileCtxLoading, error: profileCtxError } = useProfile();

  // Helper function to format date as "Thu, 8 Oct"
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const options = { weekday: 'short', day: 'numeric', month: 'short' };
    try {
      return new Date(dateString).toLocaleDateString(undefined, options);
    } catch (e) {
      return dateString;
    }
  };

  // Helper function to construct display name from location object
  const getDisplayName = (loc) => {
    if (!loc) return 'Your Location';
    // Construct from village, district, state
    const parts = [loc.village, loc.district, loc.state].filter(Boolean);
    if (parts.length > 0) {
      return parts.join(', ');
    }
    if (typeof loc.location === 'string' && loc.location.trim() !== '') {
      return loc.location;
    }
    if (typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
      return `Lat: ${loc.latitude}, Lon: ${loc.longitude}`;
    }
    return 'Your Location';
  };

  // Load location from profile when component mounts
  useEffect(() => {
    loadLocationFromProfile();
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // Handle profile loading states from context
  useEffect(() => {
    setProfileLoading(profileCtxLoading);
    setProfileError(profileCtxError);
  }, [profileCtxLoading, profileCtxError]);

  // Fetch weather data when we have location data (from profile or location hook)
  useEffect(() => {
    let isMounted = true;

    const loadWeatherData = async () => {
      try {
        // Get session token
        const session = await getUserSession();
        if (!session) {
          if (isMountedRef.current) setError('No active session');
          return;
        }
        const token = session.access_token;

        let lat = undefined;
        let lon = undefined;
        let region = undefined;

        // Try to get location from profile first
        if (profile) {
          if (profile.latitude !== null && profile.longitude !== null) {
            lat = profile.latitude;
            lon = profile.longitude;
          } else if (profile.location) {
            region = profile.location;
          }
        }

        // Fallback to location hook data
        if ((lat === undefined || lon === undefined) && locData) {
          if (locData.latitude !== undefined && locData.longitude !== undefined) {
            lat = locData.latitude;
            lon = locData.longitude;
          } else if (locData.location) {
            region = locData.location;
          }
        }

        // Final fallback
        if ((lat === undefined || lon === undefined) && !region) {
          region = "Delhi";
        }

        // Fetch weather data
        await fetchWeatherData({ lat, lon, region, token });
      } catch (err) {
        if (isMountedRef.current) {
          console.error("Failed to load weather data:", err);
          setError(`Failed to load weather: ${err.message}`);
        }
      }
    };

    loadWeatherData();
    return () => { isMountedRef.current = false; };
  }, [profile, location]);

  const fetchWeatherData = useCallback(async ({ lat, lon, region, token }) => {
    try {
      setLoading(true);
      setError(null);

      // Build URL with optional parameters
      let url = '/api/v1/weather/weather-advisory';
      const params = new URLSearchParams();

      if (lat !== undefined && lon !== undefined) {
        params.append('lat', lat);
        params.append('lon', lon);
      }
      if (region) {
        params.append('region', region);
      }

      if (params.toString()) {
        url += '?' + params.toString();
      }

      // Generate cache key for this request
      const cacheKey = generateWeatherCacheKey({
        latitude: lat,
        longitude: lon,
        location: region
      });

      // Try to get cached data first (for instant display)
      const cachedItem = getCachedWeatherData(cacheKey, 30); // Cache for 30 minutes

      if (cachedItem) {
        // Show cached data immediately
        if (isMountedRef.current) {
          setWeatherData({
            ...cachedItem.data,
            _isCached: true,
            _cacheTimestamp: cachedItem.timestamp
          });
        }
      }

      // Fetch fresh data
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        // Try to get error details from response
        let errorMessage = `Weather API error: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.detail) {
            errorMessage = errorData.detail;
          }
        } catch (e) {
          // If we can't parse JSON, use the status text
          errorMessage = `${response.status} ${response.statusText}`;
        }

        // If we have cached data, use it with a warning instead of throwing error
        if (cachedItem) {
          if (isMountedRef.current) {
            setWeatherData(cachedItem.data);
            setError(`Using cached data (${formatTimeAgo((Date.now() - cachedItem.timestamp)/60000)} ago)`);
          }
          return; // Exit early since we're showing cached data
        }

        if (isMountedRef.current) throw new Error(errorMessage);
      }

      const data = await response.json();
      // Cache the successful response
      cacheWeatherData(cacheKey, data);

      if (isMountedRef.current) {
        setWeatherData(data);
        // Clear error if we were showing cached data warning
        if (error && error.includes('Using cached data')) {
          setError(null);
        }
      }
    } catch (err) {
      if (isMountedRef.current) {
        // If we have cached data, use it with a warning
        const cacheKey = generateWeatherCacheKey({
          latitude: lat,
          longitude: lon,
          location: region
        });
        const cachedItem = getCachedWeatherData(cacheKey, 30); // Cache for 30 minutes

        if (cachedItem) {
          setWeatherData(cachedItem.data);
          setError(`Using cached data (${formatTimeAgo((Date.now() - cachedItem.timestamp)/60000)} ago)`);
        } else {
          setError(err.message);
        }
      }
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [profile, location]);

  const handleRefresh = async () => {
    try {
      const session = await getUserSession();
      const token = session?.access_token;
      if (!token) {
        setError('No session token');
        return;
      }
      if (location && location.latitude !== undefined && location.longitude !== undefined) {
        fetchWeatherData({ lat: location.latitude, lon: location.longitude, token });
      } else if (location && location.location) {
        fetchWeatherData({ region: location.location, token });
      }
    } catch (err) {
      setError(err.message);
    }
  };

  if (profileLoading && !profile) return (
    <div className="centered-container">
      <p>Loading weather advisory...</p>
    </div>
  );

  if (profileError && !profile) return (
    <div className="centered-container">
      <p className="error-text">Error loading profile data</p>
      <button className="btn-primary" onClick={() => window.location.reload()}>
        Try Again
      </button>
    </div>
  );

  if (loading) return (
    <div className="centered-container">
      <p>Loading weather advisory...</p>
    </div>
  );

  if (error) return (
    <div className="centered-container">
      <p className="error-text">Error: {error}</p>
      <button className="btn-primary" onClick={handleRefresh}>
        Try Again
      </button>
    </div>
  );

  {/* Show cache status when using cached data due to request failure */}
  {error && error.includes('Using cached data') && (
    <p style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--color-ink-soft)' }}>
      {error}
    </p>
  )}

  // If no location is saved, show location setup UI
  if (!location || (location.latitude === undefined && location.longitude === undefined && !location.location)) {
    return (
      <div className="centered-container">
        <div className="dashboard-tile" style={{ borderLeftColor: 'var(--color-accent)' }}>
          <h2>Set your farm location</h2>
          <p>Get accurate weather advisories for your specific location</p>

          {/* Location input methods */}
          <div style={{ margin: '1.5rem 0' }}>
            <button
              className="btn-primary"
              onClick={async () => {
                try {
                  const pos = await getCurrentPosition();
                  await saveLocation({
                    latitude: pos.latitude,
                    longitude: pos.longitude
                  });
                  // Refresh weather data
                  if (pos.latitude !== undefined && pos.longitude !== undefined) {
                    const session = await getUserSession();
                    const token = session?.access_token;
                    if (token) {
                      fetchWeather({ lat: pos.latitude, lon: pos.longitude, token });
                    } else {
                      setError('No session token');
                    }
                  }
                } catch (err) {
                  // Error is handled by the hook's error state
                }
              }}
            >
              Use my location
            </button>
          </div>

          {/* Search box would go here - for now we'll show a placeholder */}
          <div style={{ margin: '1rem 0', padding: '1rem', backgroundColor: 'var(--color-background)', borderRadius: '4px' }}>
            <input
              type="text"
              placeholder="Search for your village/town..."
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid var(--color-border)',
                borderRadius: '4px'
              }}
            />
            <button
              className="btn-text"
              style={{ marginTop: '0.5rem' }}
              onClick={() => {
                // TODO: Implement search functionality
                alert('Search functionality coming soon!');
              }}
            >
              Search
            </button>
          </div>

          <p className="error-text" style={{ textAlign: 'center', color: 'var(--color-error)' }}>
            {locError}
          </p>

          <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--color-ink-soft)' }}>
            <em>Location data is stored privately in your profile and never shared.</em>
          </div>
        </div>
      </div>
    );
  }

  // Show weather data when location is available
  return (
    <div className="centered-container">
      <div className="dashboard-header">
        <h1>Weather Advisory for {getDisplayName(location)}</h1>
        <button className="btn-text" onClick={handleRefresh}>
          Refresh Data
        </button>
      </div>

      {weatherData?.error && (
        <div className="dashboard-tile" style={{ borderLeftColor: 'var(--color-clay)' }}>
          <h2>Error</h2>
          <p className="error-text">{weatherData.error}</p>
        </div>
      )}

      {! (weatherData?.error) && weatherData?.current && (
        <>
          {/* New advisory info section near the top */}
          <div className="dashboard-tile" style={{ borderLeftColor: 'var(--color-success)' }}>
            <h2>Advisory Summary</h2>
            {weatherData?.best_spray_window && weatherData?.best_spray_window?.length > 0 && (
              <>
                <p><strong>Best Spray Window:</strong> {weatherData?.best_spray_window?.slice(0, 5).join(' • ')}</p>
                {weatherData?.best_spray_window?.length > 5 && <p><em>+ {weatherData?.best_spray_window?.length - 5} more slots</em></p>}
              </>
            )}
            {(!weatherData?.best_spray_window || weatherData?.best_spray_window?.length === 0) && (
              <p><em>No optimal spray window found for today/tomorrow (wind &lt; 15 km/h, no rain)</em></p>
            )}
          </div>

          <div className="dashboard-tile" style={{ borderLeftColor: 'var(--color-sky)' }}>
            <h2>Current Conditions</h2>
            {weatherData?.current?.temperature != null && (
              <p>Temperature: {weatherData?.current?.temperature}°C</p>
            )}
            {weatherData?.current?.humidity != null && (
              <p>Humidity: {weatherData?.current?.humidity}%</p>
            )}
            {weatherData?.current?.condition && (
              <p>Condition: {weatherData?.current?.condition}</p>
            )}
          </div>

          {(weatherData?.forecast ?? []).length > 0 && (
            <div className="dashboard-tile" style={{ borderLeftColor: 'var(--color-primary)' }}>
              <h2>Forecast ({(weatherData?.forecast ?? []).length} days)</h2>
              {(weatherData?.forecast ?? []).map((day, index) => (
                <div key={index} style={{
                  marginBottom: '0.75rem',
                  paddingBottom: '0.5rem',
                  borderBottom: index < (weatherData?.forecast ?? []).length - 1 ? '1px solid var(--color-line)' : 'none'
                }}>
                  <strong>{formatDate(day.date) || `Day ${index + 1}`}:</strong>
                  {day.max_temp != null && day.min_temp != null && (
                    <>
                      {day.max_temp}°/{day.min_temp}°C
                      {day.description && (
                        <>
                          <br />
                          <small>{day.description}</small>
                        </>
                      )}
                    </>
                  )}
                  {day.max_temp != null && day.min_temp == null && (
                    <>
                      {day.max_temp}°C
                      {day.description && (
                        <>
                          <br />
                          <small>{day.description}</small>
                        </>
                      )}
                    </>
                  )}
                  {day.max_temp == null && day.min_temp != null && (
                    <>
                      {day.min_temp}°C
                      {day.description && (
                        <>
                          <br />
                          <small>{day.description}</small>
                        </>
                      )}
                    </>
                  )}
                  {/* Additional forecast fields */}
                  {day.rain_probability !== null && day.rain_mm !== null && (
                    <p style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>
                      💧 Rain: {Math.round(day.rain_probability || 0)}% ({day.rain_mm || 0} mm)
                    </p>
                  )}
                  {day.wind_max !== null && (
                    <p style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>
                      💨 Wind: {Math.round(day.wind_max || 0)} km/h max
                    </p>
                  )}
                  {day.et0 !== null && (
                    <p style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>
                      💧 ET0: {(day.et0 || 0).toFixed(1)} mm/day
                    </p>
                  )}
                  {day.uv_index !== null && (
                    <p style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>
                      ☀️ UV Index: {Math.round(day.uv_index || 0)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="dashboard-tile" style={{ borderLeftColor: 'var(--color-accent)' }}>
            <h2>Farming Advisory</h2>
            <p>{weatherData?.advisory_tip || 'No specific advisory available'}</p>
          </div>
        </>
      )}

      {/* Show cache status when using cached data due to request failure */}
      {error && error.includes('Using cached data') && (
        <p style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--color-ink-soft)' }}>
          {error}
        </p>
      )}
      {/* Show data source for debugging */}
      {weatherData?.source && error && !error.includes('Using cached data') && (
        <p style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--color-ink-soft)' }}>
          Data source: {weatherData.source === 'indian_api_imd' ? 'Indian Meteorological Department' : weatherData.source === 'open_meteo' ? 'Open-Meteo' : 'Global Weather API'}
        </p>
      )}
    </div>
  );
}