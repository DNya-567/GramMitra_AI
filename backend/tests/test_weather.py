import asyncio
from app.services import weather_service

async def test_weather_service():
    # Test with Delhi
    print("Testing Delhi...")
    result = await weather_service.get_advisory("Delhi")
    print(f"Delhi result: {result}")

    # Test with Pune
    print("\nTesting Pune...")
    result = await weather_service.get_advisory("Pune")
    print(f"Pune result: {result}")

    # Test with Akola
    print("\nTesting Akola...")
    result = await weather_service.get_advisory("Akola")
    print(f"Akola result: {result}")

    # Test with empty region
    print("\nTesting empty region...")
    result = await weather_service.get_advisory("")
    print(f"Empty region result: {result}")

    # Test with region not found
    print("\nTesting unknown region...")
    result = await weather_service.get_advisory("UnknownRegion12345")
    print(f"Unknown region result: {result}")

if __name__ == "__main__":
    asyncio.run(test_weather_service())