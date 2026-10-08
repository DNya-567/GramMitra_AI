import sys
import os
sys.path.append("C:/Users/dnyanesh/OneDrive/Desktop/GramMitra/backend")

# Set the environment variable
os.environ["WEATHER_API_KEY"] = "sk-live-uhO4NyNJx38cI6LBkfFMINpwXqERaJ2o3zv5JSF7"

from app.services import weather_service

# Test case variations for Delhi
test_regions = ["Delhi", "delhi", "DELHI", "  Delhi  ", "\tDelhi\n", "DeLhI"]

print("Testing case-insensitive and trimmed region matching:")
print("=" * 50)

for region in test_regions:
    print(f"\nTesting region: '{repr(region)}'")
    result = weather_service.get_advisory(region)
    print(f"Result: {result}")
