import sys
import os
sys.path.append("C:/Users/dnyanesh/OneDrive/Desktop/GramMitra/backend")

# Set the environment variable
os.environ["WEATHER_API_KEY"] = "dummy-not-used-for-open-meteo"

from app.services import weather_service

# Test cases
test_regions = ["Delhi", "Pune", "Akola"]

print("Testing Open-Meteo weather service directly:")
print("=" * 50)

for region in test_regions:
    print(f"\nTesting region: '{region}'")
    # Note: This is an async function, so we need to run it properly
    import asyncio
    result = asyncio.run(weather_service.get_advisory(region))
    print(f"Result: {result}")
