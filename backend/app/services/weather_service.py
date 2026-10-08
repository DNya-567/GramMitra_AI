import os
import httpx
import logging
import asyncio
import time
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

# Cache for storing weather data with timestamp
# Format: {normalized_region: {"data": result_dict, "timestamp": datetime}}
_weather_cache: Dict[str, Dict[str, Any]] = {}
CACHE_DURATION = timedelta(minutes=10)

logger = logging.getLogger(__name__)

# Shared HTTP client (set by main.app)
httpx_client: Optional[httpx.AsyncClient] = None


async def get_advisory(region: Optional[str] = None, lat: Optional[float] = None, lon: Optional[float] = None) -> dict:
    """
    Get weather-based agricultural advisory for a region using Open-Meteo API.
    If lat and lon are provided, they are used directly (after validation).
    Otherwise, the region is geocoded to get coordinates.
    """
    start_time = time.time()
    logger.info(f"Weather advisory request started for region={region}, lat={lat}, lon={lon}")

    # Validate inputs: either region or lat/lon must be provided
    if not region or not region.strip():
        if lat is None or lon is None:
            logger.warning("Either region or lat/lon must be provided")
            return {"error": "Either region or latitude/longitude must be provided"}
        # If lat/lon are provided, we can proceed without region
        original_region = None
        normalized_region = None
    else:
        # Normalize region: strip whitespace for consistency
        original_region = region.strip()
        normalized_region = original_region.lower()

    # Validate lat/lon bounds if provided (India bounds: lat 6-38, lon 68-98)
    if lat is not None and lon is not None:
        if not (6 <= lat <= 38) or not (68 <= lon <= 98):
            logger.warning(f"Invalid coordinates for India: lat={lat}, lon={lon}")
            return {"error": "Latitude must be between 6-38 and longitude between 68-98 (India bounds)"}

    # Check cache first - use coordinates if available, otherwise region
    if lat is not None and lon is not None:
        # Cache key based on coordinates rounded to 2 decimal places
        cache_key = f"lat:{round(lat, 2)},lon:{round(lon, 2)}"
    else:
        cache_key = normalized_region

    cache_entry = _weather_cache.get(cache_key)
    if cache_entry:
        cache_time = cache_entry["timestamp"]
        if datetime.now() - cache_time < CACHE_DURATION:
            logger.debug(f"Returning cached weather data for key: {cache_key}")
            return cache_entry["data"]
        else:
            # Remove expired cache entry
            del _weather_cache[cache_key]
            logger.debug(f"Removed expired cache entry for key: {cache_key}")

    try:
        # Determine coordinates and place name
        if lat is not None and lon is not None:
            # Use provided coordinates directly
            latitude = lat
            longitude = lon
            # Try to get place name from reverse geocoding or use region as fallback
            display_name = region if region and region.strip() else f"Lat:{lat}, Lon:{lon}"
            logger.debug(f"Using provided coordinates: lat={latitude}, lon={longitude}")
        else:
            # Step 1: Geocode the region to get latitude/longitude
            logger.debug(f"Fetching weather data for region: {original_region}")
            geocoding_url = "https://geocoding-api.open-meteo.com/v1/search"
            geocoding_params = {
                "name": original_region,
                "count": 1,
                "country_code": "IN"  # Focus on India as per original implementation
            }

            geocoding_start = time.time()
            # Use shared client
            global httpx_client
            if httpx_client is None:
                # Fallback: create a temporary client (should not happen in production)
                httpx_client = httpx.AsyncClient()
            geocoding_response = await httpx_client.get(geocoding_url, params=geocoding_params)
            geocoding_elapsed = time.time() - geocoding_start

            if geocoding_response.status_code != 200:
                logger.error(f"Geocoding API error: {geocoding_response.status_code}")
                return {"error": "Weather service temporarily unavailable. Please try again later."}

            geocoding_data = geocoding_response.json()
            logger.info(f"Geocoding API call took {geocoding_elapsed:.3f}s")

            # Check if we got any results
            if not geocoding_data.get("results"):
                logger.info(f"No geocoding results found for region: {original_region}")
                return {"error": f"Could not find weather data for region: {original_region}"}

            # Get the first result
            location = geocoding_data["results"][0]
            latitude = location["latitude"]
            longitude = location["longitude"]
            # Use the display name from geocoding as the region name for consistency
            display_name = location.get("name", original_region)
            if location.get("admin1"):  # Add state/region if available
                display_name = f"{display_name}, {location['admin1']}"
            if location.get("country"):
                display_name = f"{display_name}, {location['country']}"

        # Step 2: Get forecast data from Open-Meteo
        forecast_url = "https://api.open-meteo.com/v1/forecast"
        forecast_params = {
            "latitude": latitude,
            "longitude": longitude,
            "current": "temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,weather_code",
            "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,weather_code,et0_fao_evapotranspiration,uv_index_max,apparent_temperature_max,wind_gusts_10m_max,rain_sum,sunrise,sunset",
            "hourly": "wind_speed_10m,precipitation,soil_moisture_3_to_9cm,soil_temperature_0cm",
            "timezone": "auto",
            "forecast_days": 7
        }

        forecast_start = time.time()
        forecast_response = await httpx_client.get(forecast_url, params=forecast_params)
        forecast_elapsed = time.time() - forecast_start

        if forecast_response.status_code != 200:
            logger.error(f"Forecast API error: {forecast_response.status_code}")
            return {"error": "Weather service temporarily unavailable. Please try again later."}

        forecast_data = forecast_response.json()
        logger.info(f"Forecast API call took {forecast_elapsed:.3f}s")

        # Step 3: Process the data into the expected format
        result = process_open_meteo_data(forecast_data, display_name, latitude, longitude)

        # Cache the result
        _weather_cache[cache_key] = {
            "data": result,
            "timestamp": datetime.now()
        }
        logger.debug(f"Cached weather data for key: {cache_key}")

        # Add place_name to the result if we have a display_name
        if display_name:
            result["place_name"] = display_name

        total_elapsed = time.time() - start_time
        logger.info(f"Weather advisory request completed in {total_elapsed:.3f}s (geocoding: {geocoding_elapsed if 'geocoding_elapsed' in locals() else 0:.3f}s, forecast: {forecast_elapsed:.3f}s)")

        return result

    except httpx.TimeoutException:
        if lat is not None and lon is not None:
            logger.exception(f"Timeout error fetching weather data for coordinates lat={lat}, lon={lon}")
        else:
            logger.exception(f"Timeout error fetching weather data for region {original_region}")
        return {"error": "Weather service temporarily unavailable. Please try again later."}
    except httpx.RequestError as e:
        if lat is not None and lon is not None:
            logger.exception(f"Request error fetching weather data for coordinates lat={lat}, lon={lon}: {str(e)}")
        else:
            logger.exception(f"Request error fetching weather data for region {original_region}: {str(e)}")
        return {"error": "Weather service temporarily unavailable. Please try again later."}
    except Exception as e:
        if lat is not None and lon is not None:
            logger.exception(f"Unexpected error in weather service for coordinates lat={lat}, lon={lon}: {str(e)}")
        else:
            logger.exception(f"Unexpected error in weather service for region {original_region}: {str(e)}")
        return {"error": f"Weather service error: {str(e)}"}


def process_open_meteo_data(data: dict, region_name: str, latitude: float, longitude: float) -> dict:
    """Process Open-Meteo data into the expected advisory format."""
    try:
        # Extract current conditions
        current = data.get("current", {})
        daily = data.get("daily", {})
        hourly = data.get("hourly", {})

        # Current temperature (in Celsius)
        temp_current = current.get("temperature_2m")
        # Current relative humidity (in %)
        humidity_current = current.get("relative_humidity_2m")
        # Current wind speed (in km/h)
        wind_speed_current = current.get("wind_speed_10m")
        # Current precipitation (in mm)
        precipitation_current = current.get("precipitation")
        # Weather code for current condition
        weather_code_current = current.get("weather_code")

        # Process daily forecast data
        forecast_list = []
        daily_times = daily.get("time", [])
        daily_temp_max = daily.get("temperature_2m_max", [])
        daily_temp_min = daily.get("temperature_2m_min", [])
        daily_precipitation_sum = daily.get("precipitation_sum", [])
        daily_precipitation_prob = daily.get("precipitation_probability_max", [])
        daily_wind_speed_max = daily.get("wind_speed_10m_max", [])
        daily_weather_code = daily.get("weather_code", [])
        daily_et0 = daily.get("et0_fao_evapotranspiration", [])
        daily_uv_index = daily.get("uv_index_max", [])
        daily_apparent_temp_max = daily.get("apparent_temperature_max", [])
        daily_wind_gusts_max = daily.get("wind_gusts_10m_max", [])
        daily_rain_sum = daily.get("rain_sum", [])
        daily_sunrise = daily.get("sunrise", [])
        daily_sunset = daily.get("sunset", [])

        # Process hourly data for spray window calculation (handle missing data safely)
        best_spray_window = []
        try:
            hourly_times = hourly.get("time", [])
            hourly_wind_speed = hourly.get("wind_speed_10m", [])
            hourly_precipitation = hourly.get("precipitation", [])

            # Calculate best spray window for today and tomorrow
            if hourly_times and hourly_wind_speed and hourly_precipitation:
                now = datetime.now()
                today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
                tomorrow_start = today_start + timedelta(days=1)
                day_after_tomorrow_start = today_start + timedelta(days=2)

                # Check next 48 hours (today and tomorrow)
                for i, time_str in enumerate(hourly_times[:48]):  # Next 48 hours
                    if i < len(hourly_wind_speed) and i < len(hourly_precipitation):
                        try:
                            # Parse the time string (format: "2026-10-08T14:00")
                            dt = datetime.fromisoformat(time_str.replace('Z', '+00:00'))
                            # Check if it's today or tomorrow
                            if today_start <= dt < day_after_tomorrow_start:
                                wind_speed = hourly_wind_speed[i]
                                precipitation = hourly_precipitation[i]
                                # Check conditions: wind < 15 km/h and no precipitation
                                if wind_speed is not None and precipitation is not None:
                                    if wind_speed < 15 and precipitation == 0:
                                        # Format as "HH:MM"
                                        time_formatted = dt.strftime("%H:%M")
                                        best_spray_window.append(time_formatted)
                        except ValueError:
                            # Skip if time parsing fails
                            continue
        except Exception as e:
            # Log error but don't fail the entire process - just return empty spray window
            logger.exception(f"Error calculating spray window: {str(e)}")
            best_spray_window = []

        # Generate forecast entries for up to 7 days
        for i in range(min(len(daily_times), 7)):
            date_str = daily_times[i]
            temp_max = daily_temp_max[i] if i < len(daily_temp_max) else None
            temp_min = daily_temp_min[i] if i < len(daily_temp_min) else None
            precip_sum = daily_precipitation_sum[i] if i < len(daily_precipitation_sum) else None
            precip_prob = daily_precipitation_prob[i] if i < len(daily_precipitation_prob) else None
            wind_speed_max = daily_wind_speed_max[i] if i < len(daily_wind_speed_max) else None
            et0 = daily_et0[i] if i < len(daily_et0) else None
            uv_index = daily_uv_index[i] if i < len(daily_uv_index) else None
            apparent_temp_max = daily_apparent_temp_max[i] if i < len(daily_apparent_temp_max) else None
            wind_gusts_max = daily_wind_gusts_max[i] if i < len(daily_wind_gusts_max) else None
            rain_sum = daily_rain_sum[i] if i < len(daily_rain_sum) else None
            sunrise = daily_sunrise[i] if i < len(daily_sunrise) else None
            sunset = daily_sunset[i] if i < len(daily_sunset) else None
            weather_code = daily_weather_code[i] if i < len(daily_weather_code) else None

            # Generate description based on weather data
            description = generate_daily_description(
                temp_max=temp_max,
                temp_min=temp_min,
                precipitation_sum=precip_sum,
                precipitation_probability=precip_prob,
                wind_speed_max=wind_speed_max,
                weather_code=weather_code
            )

            forecast_list.append({
                "date": date_str,
                "max_temp": temp_max,
                "min_temp": temp_min,
                "description": description,
                # New fields as requested
                "rain_probability": precip_prob,
                "rain_mm": precip_sum,
                "wind_max": wind_speed_max,
                "et0": et0,
                "uv_index": uv_index
            })

        # Generate farming advisory tip based on current conditions
        advisory_tip = generate_farming_advice_from_open_meteo_data(
            temperature=temp_current,
            humidity=humidity_current,
            wind_speed=wind_speed_current,
            precipitation=precipitation_current,
            weather_code=weather_code_current,
            forecast_data=daily
        )

        return {
            "region": region_name,
            "current": {
                "temperature": round(temp_current, 1) if temp_current is not None else None,
                "humidity": round(humidity_current, 1) if humidity_current is not None else None,
                "condition": get_weather_condition_description(weather_code_current) if weather_code_current is not None else "Available from Open-Meteo data"
            },
            "forecast": forecast_list,
            "advisory_tip": advisory_tip,
            "best_spray_window": best_spray_window,
            "source": "open_meteo"
        }

    except Exception as e:
        logger.exception(f"Error processing Open-Meteo data: {str(e)}")
        # Return a basic structure even if processing fails
        return {
            "region": region_name,
            "current": {
                "temperature": None,
                "humidity": None,
                "condition": "Error processing weather data"
            },
            "forecast": [],
            "advisory_tip": "Unable to generate farming advice due to data processing error.",
            "source": "open_meteo"
        }


def generate_daily_description(
    temp_max: Optional[float],
    temp_min: Optional[float],
    precipitation_sum: Optional[float],
    precipitation_probability: Optional[float],
    wind_speed_max: Optional[float],
    weather_code: Optional[int]
) -> str:
    """Generate a short description for the daily forecast."""
    try:
        # Start with temperature info
        temp_parts = []
        if temp_max is not None:
            temp_parts.append(f"{temp_max}°C")
        if temp_min is not None:
            temp_parts.append(f"{temp_min}°C")

        temp_str = "/".join(temp_parts) if temp_parts else "N/A"

        # Build description based on weather conditions
        conditions = []

        # Check precipitation
        if precipitation_probability is not None and precipitation_probability > 50:
            conditions.append("Rain likely")
        elif precipitation_sum is not None and precipitation_sum > 5.0:
            conditions.append("Expect rainfall")

        # Check wind
        if wind_speed_max is not None and wind_speed_max > 20:  # km/h
            conditions.append("Windy")

        # Check temperature extremes
        if temp_max is not None and temp_max > 35:
            conditions.append("Hot")
        elif temp_min is not None and temp_min < 10:
            conditions.append("Cool")

        # Use weather code for additional insight if needed
        if weather_code is not None:
            # Only add weather code description if we don't have specific conditions
            if not conditions:
                weather_desc = get_weather_condition_description(weather_code)
                if weather_desc and weather_desc != "Unknown":
                    conditions.append(weather_desc)

        # Combine temperature and conditions
        if conditions:
            return f"{temp_str} - {', '.join(conditions)}"
        else:
            return temp_str

    except Exception:
        # Fallback to basic temperature info if description generation fails
        temp_parts = []
        if temp_max is not None:
            temp_parts.append(f"{temp_max}°C")
        if temp_min is not None:
            temp_parts.append(f"{temp_min}°C")
        return "/".join(temp_parts) if temp_parts else "N/A"


def generate_farming_advice_from_open_meteo_data(
    temperature: Optional[float],
    humidity: Optional[float],
    wind_speed: Optional[float],
    precipitation: Optional[float],
    weather_code: Optional[int],
    forecast_data: dict
) -> str:
    """Generate farming advice based on current conditions and forecast."""
    try:
        advice = []

        # Temperature advice
        if temperature is not None:
            if temperature > 35:
                advice.append("High temperature: Increase irrigation, avoid midday spraying")
            elif temperature < 10:
                advice.append("Low temperature: Protect crops from frost")

        # Humidity advice
        if humidity is not None:
            if humidity > 80:
                advice.append("High humidity: Monitor for fungal diseases")
            elif humidity < 30:
                advice.append("Low humidity: Ensure adequate irrigation")

        # Wind advice
        if wind_speed is not None and wind_speed > 15:  # km/h
            advice.append("High wind speed: Avoid spraying operations")

        # Precipitation advice
        if precipitation is not None and precipitation > 2.0:  # mm
            advice.append("Recent rainfall: Delay fertilizer/pesticide application")

        # Forecast-based advice
        daily_precipitation_prob = forecast_data.get("precipitation_probability_max", [])
        daily_precipitation_sum = forecast_data.get("precipitation_sum", [])
        daily_wind_speed_max = forecast_data.get("wind_speed_10m_max", [])
        daily_temp_max = forecast_data.get("temperature_2m_max", [])
        daily_apparent_temp_max = forecast_data.get("apparent_temperature_max", [])

        # Improved rules as requested
        if daily_precipitation_prob and len(daily_precipitation_prob) > 0:
            # Check if any of the next 7 days has high rain probability (>60%)
            max_rain_prob = max([p for p in daily_precipitation_prob[:7] if p is not None], default=0)
            if max_rain_prob > 60:
                advice.append("Rain probability > 60%: Delay spraying and fertilizer application")

        if daily_wind_speed_max and len(daily_wind_speed_max) > 0:
            # Check if any of the next 7 days has high wind (>15 km/h)
            max_wind = max([w for w in daily_wind_speed_max[:7] if w is not None], default=0)
            if max_wind > 15:  # km/h
                advice.append("Wind > 15 km/h: Avoid spraying operations")

        if daily_temp_max and len(daily_temp_max) > 0:
            # Check for extreme temperatures in forecast (>38°C)
            max_temp = max([t for t in daily_temp_max[:7] if t is not None], default=None)
            if max_temp is not None and max_temp > 38:
                advice.append("Max temperature > 38°C: Irrigate in the evening to reduce water loss")

        # Humidity > 85% with warm temps -> fungal disease watch
        if humidity is not None and humidity > 85:
            # Check if temperature is warm (above 20°C) for fungal disease risk
            if temperature is not None and temperature > 20:
                advice.append("Humidity > 85% with warm temperatures: Fungal disease watch - monitor crops closely")

        # Additional forecast-based advice (keeping original logic but updated for 7 days)
        if daily_precipitation_prob and len(daily_precipitation_prob) > 0:
            # Check if any of the next 7 days has high rain probability
            max_rain_prob = max([p for p in daily_precipitation_prob[:7] if p is not None], default=0)
            if max_rain_prob > 60:
                advice.append("High chance of rain expected: Delay outdoor operations")

        if daily_wind_speed_max and len(daily_wind_speed_max) > 0:
            # Check if any of the next 7 days has high wind
            max_wind = max([w for w in daily_wind_speed_max[:7] if w is not None], default=0)
            if max_wind > 25:  # km/h
                advice.append("Windy conditions expected: Avoid spraying operations")

        if daily_temp_max and len(daily_temp_max) > 0:
            # Check for extreme temperatures in forecast
            max_temp = max([t for t in daily_temp_max[:7] if t is not None], default=None)
            min_temp = min([t for t in daily_temp_max[:7] if t is not None], default=float('inf'))
            if max_temp is not None and max_temp > 35:
                advice.append("High temperatures expected: Increase irrigation")
            if min_temp != float('inf') and min_temp < 5:
                advice.append("Low temperatures expected: Protect crops from frost")

        # Return advice or default message
        if advice:
            return ". ".join(advice)
        else:
            return "Conditions normal for farming activities. Monitor soil conditions."

    except Exception as e:
        logger.exception(f"Error generating farming advice: {str(e)}")
        return "Unable to generate specific farming advice due to data processing error."


def get_weather_condition_description(weather_code: int) -> str:
    """Convert Open-Meteo weather code to human-readable description."""
    # Open-Meteo weather codes (WMO weather classification codes)
    weather_codes = {
        0: "Clear sky",
        1: "Mainly clear",
        2: "Partly cloudy",
        3: "Overcast",
        45: "Foggy",
        48: "Depositing rime fog",
        51: "Light drizzle",
        53: "Moderate drizzle",
        55: "Dense drizzle",
        56: "Light freezing drizzle",
        57: "Dense freezing drizzle",
        61: "Slight rain",
        63: "Moderate rain",
        65: "Heavy rain",
        66: "Light freezing rain",
        67: "Heavy freezing rain",
        71: "Slight snow fall",
        73: "Moderate snow fall",
        75: "Heavy snow fall",
        77: "Snow grains",
        80: "Slight rain showers",
        81: "Moderate rain showers",
        82: "Violent rain showers",
        85: "Slight snow showers",
        86: "Heavy snow showers",
        95: "Thunderstorm",
        96: "Thunderstorm with slight hail",
        99: "Thunderstorm with heavy hail"
    }

    return weather_codes.get(weather_code, "Unknown weather condition")