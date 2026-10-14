import os
import pandas as pd
from typing import List, Dict, Optional

# Get the artifacts directory from environment variable with fallback
ml_artifacts_env = os.getenv("ML_ARTIFACTS_DIR")
if ml_artifacts_env:
    ARTIFACTS_DIR = ml_artifacts_env
else:
    ARTIFACTS_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "ml", "artifacts")
print(f"[local_crops] ML_ARTIFACTS_DIR env: {ml_artifacts_env}")
print(f"[local_crops] ARTIFACTS_DIR: {ARTIFACTS_DIR}")

def get_local_crops(state: str, district: str, season: str) -> List[Dict]:
    """
    Get local crop recommendations for a given state, district, and season.

    Args:
        state: State name
        district: District name
        season: Season (e.g., Kharif, Rabi, Autumn, Summer, Winter)

    Returns:
        List of dictionaries containing crop information sorted by area share descending.
        Each dictionary contains: crop_name, area_share_in_season, mean_area_5y, mean_yield_5y
    """
    # Try district-level data first
    district_file = os.path.join(ARTIFACTS_DIR, "district_crop_season.csv")
    if not os.path.exists(district_file):
        # Fallback to state-level if district file missing
        state_file = os.path.join(ARTIFACTS_DIR, "state_crop_season.csv")
        if not os.path.exists(state_file):
            raise FileNotFoundError("Crop data artifacts not found")
        df = pd.read_csv(state_file)
        # Filter by state and season
        filtered = df[(df['state_name'] == state) & (df['season'] == season)]
        if filtered.empty:
            return []  # No data available
        # Sort by area share descending
        filtered = filtered.sort_values('area_share_in_season', ascending=False)
        # Select relevant columns
        result = filtered[['crop_name', 'area_share_in_season', 'mean_area_5y', 'mean_yield_5y']].to_dict('records')
        return result

    # Load district-level data
    df = pd.read_csv(district_file)
    # Filter by state, district, and season
    filtered = df[(df['state_name'] == state) & (df['district_name'] == district) & (df['season'] == season)]
    if filtered.empty:
        # Fallback to state-level data
        state_file = os.path.join(ARTIFACTS_DIR, "state_crop_season.csv")
        if not os.path.exists(state_file):
            raise FileNotFoundError("Crop data artifacts not found")
        state_df = pd.read_csv(state_file)
        state_filtered = state_df[(state_df['state_name'] == state) & (state_df['season'] == season)]
        if state_filtered.empty:
            return []  # No data available
        # Sort by area share descending
        state_filtered = state_filtered.sort_values('area_share_in_season', ascending=False)
        result = state_filtered[['crop_name', 'area_share_in_season', 'mean_area_5y', 'mean_yield_5y']].to_dict('records')
        return result

    # Sort by area share descending
    filtered = filtered.sort_values('area_share_in_season', ascending=False)
    # Select relevant columns
    result = filtered[['crop_name', 'area_share_in_season', 'mean_area_5y', 'mean_yield_5y']].to_dict('records')
    return result