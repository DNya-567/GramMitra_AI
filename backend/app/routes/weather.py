from fastapi import APIRouter, Depends, HTTPException, status
from app.auth.dependencies import require_auth
from app.services import weather_service
import logging
from typing import Optional

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/weather-advisory")
async def weather_advisory(
    region: Optional[str] = None,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    user: dict = Depends(require_auth)
):
    try:
        result = await weather_service.get_advisory(region=region, lat=lat, lon=lon)

        # Handle None result (region not found)
        if result is None:
            logger.info(f"Region not found: {region}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Could not find weather data for region: {region}"
            )

        # Handle dict result from service
        if isinstance(result, dict):
            # Check if it's an error result from the service
            if "error" in result:
                error_message = result["error"]

                # Map service errors to appropriate HTTP status codes
                if "Region cannot be empty" in error_message:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=error_message
                    )
                elif "Could not find weather data for region" in error_message:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=error_message
                    )
                else:
                    # Other service errors (validation, etc.)
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=error_message
                    )
            else:
                # Successful weather data result
                return result

        # Handle unexpected result types
        logger.error(f"Unexpected result type from weather service: {type(result)}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Weather service temporarily unavailable"
        )

    except HTTPException:
        # Re-raise HTTPExceptions to preserve their status codes
        raise
    except Exception as e:
        logger.exception(f"Error in weather advisory endpoint for region {region}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Weather service temporarily unavailable"
        )


@router.get("/location/search")
async def location_search(q: str, user: dict = Depends(require_auth)):
    """
    Search for locations using Open-Meteo geocoding API.
    Returns up to 8 results for India (country_code=IN).
    """
    if not q or not q.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Search query cannot be empty"
        )

    try:
        geocoding_url = "https://geocoding-api.open-meteo.com/v1/search"
        geocoding_params = {
            "name": q.strip(),
            "count": 8,
            "country_code": "IN"  # Focus on India
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(geocoding_url, params=geocoding_params)

            if response.status_code != 200:
                logger.error(f"Geocoding API error: {response.status_code}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Location service temporarily unavailable"
                )

            data = response.json()

            # Format results
            results = []
            if data.get("results"):
                for location in data["results"]:
                    results.append({
                        "name": location.get("name", ""),
                        "admin1": location.get("admin1", ""),  # state
                        "latitude": location["latitude"],
                        "longitude": location["longitude"]
                    })

            return {"results": results}

    except httpx.TimeoutException:
        logger.exception("Timeout error in location search")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Location service temporarily unavailable"
        )
    except httpx.RequestError as e:
        logger.exception(f"Request error in location search: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Location service temporarily unavailable"
        )
    except Exception as e:
        logger.exception(f"Unexpected error in location search: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Location service temporarily unavailable"
        )
