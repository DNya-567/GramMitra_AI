import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../api/supabaseClient";
import { Activity, Thermometer, Sparkles, MessageSquare, AlertTriangle, DollarSign, Building } from "lucide-react";
import useFarmLocation from "../utils/useFarmLocation";
import { cacheWeatherData, getCachedWeatherData, generateWeatherCacheKey, formatTimeAgo } from "../lib/location.jsx";
import { getUserSession } from "../lib/userSession";

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
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("Friend");
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Location hook
  const {
    location: locData,
    loading: locLoading,
    error: locError,
    getCurrentPosition
  } = useFarmLocation();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Get cached session (avoids refetching profile/session)
        const session = await getUserSession();
        if (!session) {
          navigate("/login");
          return;
        }
        setEmail(session.user.email);
        // Extract first name from email (before @) or use a default
        const namePart = session.user.email?.split('@')[0] || "Friend";
        setFirstName(namePart.charAt(0).toUpperCase() + namePart.slice(1));

        // Use location from hook if available, otherwise fall back to manual fetch
        if (locData && (locData.latitude !== undefined || locData.longitude !== undefined || locData.location)) {
          // We have location data from the hook
          if (locData.latitude !== undefined && locData.longitude !== undefined) {
            // Fetch weather data using coordinates
            fetchWeather({ lat: locData.latitude, lon: locData.longitude, token: session.access_token });
          } else if (locData.location) {
            // Fetch weather data using location string
            fetchWeather({ region: locData.location, token: session.access_token });
          }
        } else {
          // Fallback: fetch location from profile directly (original logic)
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('location, latitude, longitude')
            .eq('user_id', session.user.id)
            .single();

          let location = "Delhi"; // Default location
          let latitude = undefined;
          let longitude = undefined;

          if (!profileError && profile) {
            if (profile.location) location = profile.location;
            if (profile.latitude !== null) latitude = profile.latitude;
            if (profile.longitude !== null) longitude = profile.longitude;
          }

          // Fetch weather data for the location
          if (latitude !== undefined && longitude !== undefined) {
            fetchWeather({ lat: latitude, lon: longitude, token: session.access_token });
          } else if (location) {
            fetchWeather({ region: location, token: session.access_token });
          } else {
            fetchWeather({ region: "Delhi", token: session.access_token }); // Final fallback
          }
        }
      } catch (err) {
        console.error("Failed to fetch user data:", err);
        setError("Failed to load user information");
      }
    };

    fetchUserData();
  }, [navigate, locData]);

  const fetchWeather = async ({ lat, lon, region, token }) => {
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

      // Check for cached data (to use if request fails)
      const cachedData = getCachedWeatherData(cacheKey, 30); // Cache for 30 minutes

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
        if (cachedData) {
          setWeatherData(cachedData);
          setError(`Using cached data (${formatTimeAgo((Date.now() - cachedData.timestamp)/60000)} ago)`);
          return; // Exit early since we're showing cached data
        }

        throw new Error(errorMessage);
      }

      const weatherDataJson = await response.json();
      // Cache the successful response
      cacheWeatherData(cacheKey, weatherDataJson);
      setWeatherData(weatherDataJson);
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
        console.error("Failed to fetch weather data:", err);
        setError(`Failed to load weather data: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="page-container">
      {/* Greeting Card */}
      <div className="greeting-card">
        <div className="greeting-text">
          Good morning, {firstName}! 👋
        </div>
        <div className="location-weather">
          Loading weather...
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

  if (error) return (
    <div className="page-container">
      {/* Greeting Card */}
      <div className="greeting-card">
        <div className="greeting-text">
          Good morning, {firstName}! 👋
        </div>
        <div className="location-weather">
          Error loading weather
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

      {/* Show cache status when using cached data due to request failure */}
      {error && error.includes('Using cached data') && (
        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--color-ink-soft)', marginTop: '1rem' }}>
          {error}
        </p>
      )}
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
              {/* Show cache timestamp if available */}
              {weatherData._cacheTimestamp && (
                <p style={{ fontSize: '0.75rem', color: 'var(--color-ink-soft)' }}>
                  Updated {formatTimeAgo((Date.now() - weatherData._cacheTimestamp) / 60000)} ago
                </p>
              )}
            </>
          ) : (
            <span>Akola, Maharashtra<br />32°C · Partly cloudy</span>
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