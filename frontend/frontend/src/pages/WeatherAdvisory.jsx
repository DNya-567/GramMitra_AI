import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../api/supabaseClient';
import useFarmLocation from '../utils/useFarmLocation';
import { cacheWeatherData, getCachedWeatherData, generateWeatherCacheKey, formatTimeAgo } from '../lib/location';

export default function WeatherAdvisory() {
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Location hook
  const {
    location,
    loading: locLoading,
    error: locError,
    getCurrentPosition,
    checkPermission,
    saveLocation
  } = useFarmLocation();

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

  useEffect(() => {
    // Load location from profile when component mounts
    const loadLocation = async () => {
      // We don't set loading state here to avoid double loading indicators
      // The location hook handles its own loading state
    };

    loadLocation();
  }, []);

  const fetchWeatherData = async (lat, lon, region) => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

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

      // Try to get cached data first (optional - we'll still make the request)
      const cachedData = getCachedWeatherData(cacheKey, 30); // Cache for 30 minutes
      // Note: We don't use cached data here to always get fresh data,
      // but we'll use it if the request fails

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
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
        if (cachedData) {
          setWeatherData(cachedData);
          setError(`Using cached data (${formatTimeAgo((Date.now() - cachedData.timestamp)/60000)} ago)`);
          return; // Exit early since we're showing cached data
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      // Cache the successful response
      cacheWeatherData(cacheKey, data);
      setWeatherData(data);
    } catch (err) {
      // If we have cached data, use it with a warning
      const cacheKey = generateWeatherCacheKey({
        latitude: lat,
        longitude: lon,
        location: region
      });
      const cachedData = getCachedWeatherData(cacheKey, 30); // Cache for 30 minutes

      if (cachedData) {
        setWeatherData(cachedData);
        setError(`Using cached data (${formatTimeAgo((Date.now() - cachedData.timestamp)/60000)} ago)`);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    if (location && location.latitude !== undefined && location.longitude !== undefined) {
      fetchWeatherData(location.latitude, location.longitude);
    } else if (location && location.location) {
      fetchWeatherData(undefined, undefined, location.location);
    }
  };

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
                    fetchWeatherData(pos.latitude, pos.longitude);
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
        <h1>Weather Advisory for {location.place_name || (location.latitude !== undefined && location.longitude !== undefined ? `Lat: ${location.latitude}, Lon: ${location.longitude}` : location.location || 'Your Location')}</h1>
        <button className="btn-text" onClick={handleRefresh}>
          Refresh Data
        </button>
      </div>

      {weatherData.error && (
        <div className="dashboard-tile" style={{ borderLeftColor: 'var(--color-clay)' }}>
          <h2>Error</h2>
          <p className="error-text">{weatherData.error}</p>
        </div>
      )}

      {!weatherData.error && weatherData.current && (
        <>
          {/* New advisory info section near the top */}
          <div className="dashboard-tile" style={{ borderLeftColor: 'var(--color-success)' }}>
            <h2>Advisory Summary</h2>
            {weatherData.best_spray_window && weatherData.best_spray_window.length > 0 && (
              <>
                <p><strong>Best Spray Window:</strong> {weatherData.best_spray_window.slice(0, 5).join(' • ')}</p>
                {weatherData.best_spray_window.length > 5 && <p><em>+ {weatherData.best_spray_window.length - 5} more slots</em></p>}
              </>
            )}
            {(!weatherData.best_spray_window || weatherData.best_spray_window.length === 0) && (
              <p><em>No optimal spray window found for today/tomorrow (wind &lt; 15 km/h, no rain)</em></p>
            )}
          </div>

          <div className="dashboard-tile" style={{ borderLeftColor: 'var(--color-sky)' }}>
            <h2>Current Conditions</h2>
            {weatherData.current.temperature != null && (
              <p>Temperature: {weatherData.current.temperature}°C</p>
            )}
            {weatherData.current.humidity != null && (
              <p>Humidity: {weatherData.current.humidity}%</p>
            )}
            {weatherData.current.condition && (
              <p>Condition: {weatherData.current.condition}</p>
            )}
          </div>

          {weatherData.forecast && weatherData.forecast.length > 0 && (
            <div className="dashboard-tile" style={{ borderLeftColor: 'var(--color-primary)' }}>
              <h2>Forecast ({weatherData.forecast.length} days)</h2>
              {weatherData.forecast.map((day, index) => (
                <div key={index} style={{
                  marginBottom: '0.75rem',
                  paddingBottom: '0.5rem',
                  borderBottom: index < weatherData.forecast.length - 1 ? '1px solid var(--color-line)' : 'none'
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
            <p>{weatherData.advisory_tip || 'No specific advisory available'}</p>
          </div>
        </>
      )}

      {/* Show data source for debugging */}
      {weatherData.source && (
        <p style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--color-ink-soft)' }}>
          Data source: {weatherData.source === 'indian_api_imd' ? 'Indian Meteorological Department' : 'Global Weather API'}
        </p>
      )}
    </div>
  );
}