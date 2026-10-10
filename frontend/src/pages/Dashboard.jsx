import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, Thermometer, Sparkles, MessageSquare, AlertTriangle, DollarSign, Building } from "lucide-react";
import useFarmLocation from "../utils/useFarmLocation";
import { cacheWeatherData, getCachedWeatherData, generateWeatherCacheKey, formatTimeAgo } from "../lib/location.jsx";
import { getUserSession } from "../lib/userSession";
import { useProfile } from "../lib/profileContext.jsx";

const FEATURES = [
  { title: "Crop Recommendation", desc: "Get a crop suggestion based on your soil and rainfall.", path: "/crop", color: "#33633c", icon: Activity },
  { title: "Weather Advisory", desc: "See how the forecast should change your plans.", path: "/weather", color: "#4a7c96", icon: Thermometer },
  { title: "Fertilizer Suggestion", desc: "Find the right fertilizer for your crop and soil.", path: "/fertilizer", color: "#d9a441", icon: Sparkles },
  { title: "Ask GramMitra", desc: "Chat in your own language about schemes or crops.", path: "/chatbot", color: "#33633c", icon: MessageSquare },
  { title: "Report a Problem", desc: "Route electricity, water, or crop issues to the right office.", path: "/complaint", color: "#b15e3b", icon: AlertTriangle },
  { title: "Market Prices", desc: "Check today's mandi prices near you.", path: "/prices", color: "#4a7c96", icon: DollarSign },
  { title: "Scheme Guidance", desc: "Check eligibility for PM-KISAN, PMFBY, and more.", path: "/schemes", color: "#d9a441", icon: Building },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("Friend");
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState(null);

  // Location hook
  const {
    location: locData,
    loading: locLoading,
    error: locError,
    getCurrentPosition
  } = useFarmLocation();

  // Profile context
  const { profile, loading: profileCtxLoading, error: profileCtxError, refetch: refreshProfile } = useProfile();

  // Extract first name from email or profile
  useEffect(() => {
    if (profile) {
      // Try to get first name from profile first
      const nameFromProfile = profile.first_name || profile.name ||
        (profile.email ? profile.email.split('@')[0] : null) ||
        "Friend";
      const formattedName = nameFromProfile.charAt(0).toUpperCase() + nameFromProfile.slice(1);
      setFirstName(formattedName);
    }
  }, [profile]);

  // Fetch weather data when we have location data (from profile or location hook)
  useEffect(() => {
    let isMounted = true;

    const loadWeatherData = async () => {
      try {
        // Get session token
        const session = await getUserSession();
        if (!session) {
          if (isMounted) setError('No active session');
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
        if (isMounted) {
          console.error("Failed to load weather data:", err);
          setError(`Failed to load weather: ${err.message}`);
        }
      }
    };

    loadWeatherData();
    return () => { isMounted = false; };
  }, [profile, locData]);

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
      } else if (region) {
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
        if (isMounted) {
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
          if (isMounted) {
            setWeatherData(cachedItem.data);
            setError(`Using cached data (${formatTimeAgo((Date.now() - cachedItem.timestamp)/60000)} ago)`);
          }
          return; // Exit early since we're showing cached data
        }

        if (isMounted) throw new Error(errorMessage);
      }

      const weatherDataJson = await response.json();
      // Cache the successful response
      cacheWeatherData(cacheKey, weatherDataJson);

      if (isMounted) {
        setWeatherData(weatherDataJson);
        // Clear error if we were showing cached data warning
        if (error && error.includes('Using cached data')) {
          setError(null);
        }
      }
    } catch (err) {
      if (isMounted) {
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
          console.error("Failed to fetch weather data:", err);
          setError(`Failed to load weather data: ${err.message}`);
        }
      }
    } finally {
      if (isMounted) setLoading(false);
    }
  }, [profile, locData]);

  // Handle profile loading states from context
  useEffect(() => {
    setProfileLoading(profileCtxLoading);
    setProfileError(profileCtxError);
  }, [profileCtxLoading, profileCtxError]);

  if (profileLoading && !profile) return (
    <div className="page-container">
      {/* Greeting Card */}
      <div className="greeting-card">
        <div className="greeting-text">
          Good morning, Friend! 👋
        </div>
        <div className="location-weather">
          Loading profile...
        </div>
      </div>

      <h2 className="dashboard-title">What do you need today?</h2>
      <p className="dashboard-description">Pick a service below to get started.</p>

      <div className="dashboard-grid">
        {FEATURES.map((f) => (
          <button
            key={f.path}
            onClick={() => navigate(f.path)}
            className={`dashboard-tile ${`border-left-${f.color.replace('#', '')}`}`}
          >
            <div className="feature-icon-badge" style={{ backgroundColor: f.color }}>
              <f.icon className="feature-icon" size={20} color="#fff" />
            </div>
            <div>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-desc">{f.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Tip of the Day Card */}
      <div className="tip-card">
        <div className="tip-card-label">TIP OF THE DAY</div>
        <p className="tip-card-text">For better crop yield, ensure proper soil preparation by tilling to a depth of 6-8 inches and adding organic compost before planting.</p>
      </div>
    </div>
  );

  if (profileError && !profile) return (
    <div className="page-container">
      {/* Greeting Card */}
      <div className="greeting-card">
        <div className="greeting-text">
          Good morning, Friend! 👋
        </div>
        <div className="location-weather">
          Error loading profile
        </div>
      </div>

      <h2 className="dashboard-title">What do you need today?</h2>
      <p className="dashboard-description">Pick a service below to get started.</p>

      <div className="dashboard-grid">
        {FEATURES.map((f) => (
          <button
            key={f.path}
            onClick={() => navigate(f.path)}
            className={`dashboard-tile ${`border-left-${f.color.replace('#', '')}`}`}
          >
            <div className="feature-icon-badge" style={{ backgroundColor: f.color }}>
              <f.icon className="feature-icon" size={20} color="#fff" />
            </div>
            <div>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-desc">{f.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Tip of the Day Card */}
      <div className="tip-card">
        <div className="tip-card-label">TIP OF THE DAY</div>
        <p className="tip-card-text">For better crop yield, ensure proper soil preparation by tilling to a depth of 6-8 inches and adding organic compost before planting.</p>
      </div>

      {/* Retry button for profile loading errors */}
      <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
        <button
          className="btn-primary"
          onClick={() => {
            setProfileLoading(true);
            refreshProfile().catch(() => {
              setProfileError('Failed to refresh profile. Please try again.');
              setProfileLoading(false);
            });
          }}
        >
          Try Again
        </button>
      </div>
    </div>
  );

  return (
    <div className="page-container">
      {/* Greeting Card */}
      <div className="greeting-card">
        <div className="greeting-text">
          Good morning, {firstName}! 👋
        </div>
        <div className="location-weather">
          {weatherData ? (
            <>
              {(weatherData.place_name ||
                (weatherData.latitude !== undefined && weatherData.longitude !== undefined ?
                 `Lat: ${weatherData.latitude}, Lon: ${weatherData.longitude}` :
                 weatherData.region || 'Your Location')) && (
                <>
                  <span>{weatherData.place_name ||
                    (weatherData.latitude !== undefined && weatherData.longitude !== undefined ?
                     `Lat: ${weatherData.latitude}, Lon: ${weatherData.longitude}` :
                     weatherData.region || 'Your Location')}</span><br />
                </>
              )}
              {weatherData.current && weatherData.current.temperature !== null && (
                <>
                  {Math.round(weatherData.current.temperature)}°C ·
                  {weatherData.current.condition || "Partly cloudy"}
                </>
              )}
              {!weatherData.current || weatherData.current.temperature === null ? (
                <span>Weather data unavailable</span>
              ) : null}
              {/* Show cache status */}
              {weatherData._isCached && (
                <p style={{ fontSize: '0.75rem', color: 'var(--color-ink-soft)' }}>
                  Updated {formatTimeAgo((Date.now() - (weatherData._cacheTimestamp || Date.now())) / 60000)} ago
                </p>
              )}
            </>
          ) : (
            <span>Loading weather...</span>
          )}
        </div>
      </div>

      <h2 className="dashboard-title">What do you need today?</h2>
      <p className="dashboard-description">Pick a service below to get started.</p>

      <div className="dashboard-grid">
        {FEATURES.map((f) => (
          <button
            key={f.path}
            onClick={() => navigate(f.path)}
            className={`dashboard-tile ${`border-left-${f.color.replace('#', '')}`}`}
          >
            <div className="feature-icon-badge" style={{ backgroundColor: f.color }}>
              <f.icon className="feature-icon" size={20} color="#fff" />
            </div>
            <div>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-desc">{f.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Tip of the Day Card */}
      <div className="tip-card">
        <div className="tip-card-label">TIP OF THE DAY</div>
        <p className="tip-card-text">For better crop yield, ensure proper soil preparation by tilling to a depth of 6-8 inches and adding organic compost before planting.</p>
      </div>
    </div>
  );
}