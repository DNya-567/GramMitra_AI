#!/usr/bin/env python3
"""
Build APY tables for GramMitra regional crop data layer.
"""
import pandas as pd
import numpy as np
import os
from rapidfuzz import process, fuzz
import warnings
warnings.filterwarnings('ignore')

# Paths
RAW_DATA_DIR = os.path.join(os.path.dirname(__file__), 'data', 'raw')
ARTIFACTS_DIR = os.path.join(os.path.dirname(__file__), 'artifacts')

def main():
    print("Loading raw data...")
    # Load primary file
    primary_path = os.path.join(RAW_DATA_DIR, 'crop-wise-area-production-yield.csv')
    df_primary = pd.read_csv(primary_path)
    print(f"Primary rows: {len(df_primary)}")

    # Load secondary file
    secondary_path = os.path.join(RAW_DATA_DIR, 'cropwise-area-production-yield-upag.csv')
    df_secondary = pd.read_csv(secondary_path)
    print(f"Secondary rows: {len(df_secondary)}")

    # Step 1: Clean primary file
    print("Cleaning primary data...")
    df_primary_clean = clean_primary(df_primary)
    print(f"Primary after cleaning: {len(df_primary_clean)}")

    # Step 2: Process secondary file
    print("Processing secondary data...")
    df_secondary_processed = process_secondary(df_secondary, df_primary_clean)
    print(f"Secondary after processing: {len(df_secondary_processed)}")

    # Step 3: Combine data
    print("Combining data...")
    df_combined = combine_data(df_primary_clean, df_secondary_processed)
    print(f"Combined rows: {len(df_combined)}")

    # Step 4: Build tables
    print("Building district_crop_season table...")
    df_district = build_district_table(df_combined)
    print(f"District table rows: {len(df_district)}")

    print("Building state_crop_season table...")
    df_state = build_state_table(df_combined)
    print(f"State table rows: {len(df_state)}")

    print("Finding unmatched districts...")
    df_unmatched = find_unmatched_districts(df_primary, df_secondary)
    print(f"Unmatched districts rows: {len(df_unmatched)}")

    # Step 5: Save outputs
    os.makedirs(ARTIFACTS_DIR, exist_ok=True)
    df_district.to_csv(os.path.join(ARTIFACTS_DIR, 'district_crop_season.csv'), index=False)
    df_state.to_csv(os.path.join(ARTIFACTS_DIR, 'state_crop_season.csv'), index=False)
    df_unmatched.to_csv(os.path.join(ARTIFACTS_DIR, 'unmatched_districts.csv'), index=False)

    # Also save the crop name mapping
    crop_name_map = get_crop_name_map()
    crop_name_map.to_csv(os.path.join(ARTIFACTS_DIR, 'crop_name_map.csv'), index=False)

    print("Done. Artifacts saved to:", ARTIFACTS_DIR)
    print(f"Districts: {df_district['district_name'].nunique()}, Crops: {df_district['crop_name'].nunique()}")

def clean_primary(df):
    """Clean primary CSV as per specifications."""
    # Make a copy to avoid SettingWithCopyWarning
    df = df.copy()

    # Drop season == "Total"
    df = df[df['season'] != 'Total'].copy()

    # Drop rows with yield <= 0 or missing production
    df = df[df['yield'] > 0].copy()
    df = df[df['production'].notna()].copy()

    # Drop "Other ..." catch-all crops
    df = df[~df['crop_name'].str.startswith('Other')].copy()

    # Define crop name mapping
    mapping = {
        'Arecanut (Brown)': 'Arecanut',
        'Arecanut (White)': 'Arecanut',
        'Cashewnut (Processed)': 'Cashewnut',
        'Cashewnut (Raw)': 'Cashewnut',
        'Jute': 'Jute and Mesta',
        'Mesta': 'Jute and Mesta',
        'Redish': 'Radish',
        'Ribed Guard': 'Ridge Guard',
        'Snak Guard': 'Snake Guard',
        'Pome Granet': 'Pomegranate',
        # Add more as needed
    }

    # Apply mapping
    def map_crop(name):
        if name in mapping:
            return mapping[name]
        # For variants, we can do fuzzy matching later if needed
        return name

    df['crop_name'] = df['crop_name'].apply(map_crop)

    # Rename columns for consistency (already have the right names except we want to keep the unit columns? we'll drop unit columns)
    # We'll keep only the columns we need: year, state_name, district_name, crop_name, crop_type, season, area, production, yield
    # But note: we have area_unit, production_unit, yield_unit. We'll assume they are correct and drop them.
    cols_to_keep = ['year', 'state_name', 'district_name', 'crop_name', 'crop_type', 'season', 'area', 'production', 'yield']
    df = df[cols_to_keep].copy()

    # Rename yield to yield_t_ha for clarity (but we can keep as yield)
    df = df.rename(columns={
        'area': 'area_ha',
        'production': 'production_tonnes',
        'yield': 'yield_t_ha'
    })

    return df

def process_secondary(df_secondary, df_primary):
    """Process secondary CSV as per specifications."""
    # Make a copy
    df = df_secondary.copy()

    # We will recompute yield = production / area per row
    # First, ensure area and production are numeric and area > 0
    df['area'] = pd.to_numeric(df['area'], errors='coerce')
    df['production'] = pd.to_numeric(df['production'], errors='coerce')
    df = df[df['area'] > 0].copy()

    # Compute yield
    df['yield_t_ha'] = df['production'] / df['area']

    # Now we need to detect rows where area and production are in thousands
    # We'll compare with primary data for the same state, district, crop and year.
    # We'll map secondary crop names to primary names.

    # Map secondary crop names to primary names (same mapping as in primary)
    mapping = {
        'Arecanut (Brown)': 'Arecanut',
        'Arecanut (White)': 'Arecanut',
        'Cashewnut (Processed)': 'Cashewnut',
        'Cashewnut (Raw)': 'Cashewnut',
        'Jute': 'Jute and Mesta',
        'Mesta': 'Jute and Mesta',
        'Redish': 'Radish',
        'Ribed Guard': 'Ridge Guard',
        'Snak Guard': 'Snake Guard',
        'Pome Granet': 'Pomegranate',
        'Soybean': 'Soyabean',
        'Tur': 'Arhar/Tur',
        'Moong': 'Moong(Green Gram)',
        'Cotton': 'Cotton(Lint)'
    }

    def map_secondary_crop(name):
        if name in mapping:
            return mapping[name]
        return name

    df['crop_name_mapped'] = df['crop_name'].apply(map_secondary_crop)

    # We'll merge with primary to get the typical area and production for the same (year, state, district, crop)
    # Primary columns: year, state_name, district_name, crop_name, crop_type, season, area_ha, production_tonnes, yield_t_ha
    # We'll compute median area and production per (year, state, district, crop_name) from primary
    primary_agg = df_primary.groupby(['year', 'state_name', 'district_name', 'crop_name']).agg(
        median_area_ha=('area_ha', 'median'),
        median_production_tonnes=('production_tonnes', 'median')
    ).reset_index()

    # Merge with secondary
    df_merge = df.merge(
        primary_agg,
        left_on=['year', 'state_name', 'district_name', 'crop_name_mapped'],
        right_on=['year', 'state_name', 'district_name', 'crop_name'],
        how='left'
    )

    # Compute ratios
    df_merge['area_ratio'] = df_merge['area'] / df_merge['median_area_ha']
    df_merge['production_ratio'] = df_merge['production'] / df_merge['median_production_tonnes']

    # Determine if the row is likely in thousands
    # We'll consider that if both area_ratio and production_ratio are close to 0.001 (i.e., between 0.0005 and 0.002),
    # then the secondary data is in thousands and we need to multiply by 1000.
    # Otherwise, if the ratios are close to 1 (between 0.5 and 2), we assume the units are correct.
    # If not, we drop the row (or we could try to fix, but the task says fix or drop).

    # We'll create a mask for rows that are likely in thousands
    mask_thousands = (df_merge['area_ratio'] > 0.0005) & (df_merge['area_ratio'] < 0.002) & \
                     (df_merge['production_ratio'] > 0.0005) & (df_merge['production_ratio'] < 0.002)

    # For rows that are in thousands, we fix area and production
    df_merge.loc[mask_thousands, 'area'] = df_merge.loc[mask_thousands, 'area'] * 1000
    df_merge.loc[mask_thousands, 'production'] = df_merge.loc[mask_thousands, 'production'] * 1000
    # Recompute yield after fixing
    df_merge.loc[mask_thousands, 'yield_t_ha'] = df_merge.loc[mask_thousands, 'production'] / df_merge.loc[mask_thousands, 'area']

    # For rows that are not in thousands, we check if the ratios are close to 1 (within a factor of 2)
    mask_close = (df_merge['area_ratio'] > 0.5) & (df_merge['area_ratio'] < 2) & \
                 (df_merge['production_ratio'] > 0.5) & (df_merge['production_ratio'] < 2)

    # We'll keep rows that are either in thousands (and fixed) or close to 1.
    # We'll drop the rest.
    df_merge['keep'] = mask_thousands | mask_close
    df_filtered = df_merge[df_merge['keep']].copy()
    print(f"df_filtered columns: {df_filtered.columns.tolist()}")

    # Now we have the corrected data. We need to add crop_type and season.
    # We'll get the most frequent crop_type and season for each crop from primary
    crop_info = df_primary.groupby('crop_name').agg(
        crop_type=('crop_type', lambda x: x.mode()[0] if not x.mode().empty else None),
        season=('season', lambda x: x.mode()[0] if not x.mode().empty else None)
    ).reset_index()

    # Merge with df_filtered
    df_result = df_filtered.merge(crop_info, left_on='crop_name_mapped', right_on='crop_name', how='left')

    # For season: use secondary season if available, otherwise primary mode
    df_result['season'] = df_result['season_x'].fillna(df_result['season_y'])
    # For crop_type: use primary mode (since secondary doesn't have it)
    df_result['crop_type'] = df_result['crop_type'].fillna('Unknown')

    # Fill any remaining missing season with 'Kharif'
    df_result['season'] = df_result['season'].fillna('Kharif')

    # Prepare the final dataframe with columns matching primary
    # We'll keep the columns: year, state_name, district_name, crop_name, crop_type, season, area_ha, production_tonnes, yield_t_ha
    # Note: we have crop_name_mapped as the standardized crop name.
    result = df_result[['year', 'state_name', 'district_name', 'crop_name_mapped', 'crop_type', 'season', 'area', 'production', 'yield_t_ha']].copy()
    result = result.rename(columns={
        'crop_name_mapped': 'crop_name',
        'area': 'area_ha',
        'production': 'production_tonnes',
        'yield_t_ha': 'yield_t_ha'
    })

    return result

def combine_data(df_primary, df_secondary):
    """Combine primary and secondary data."""
    # Ensure both have the same columns
    # Primary columns: year, state_name, district_name, crop_name, crop_type, season, area_ha, production_tonnes, yield_t_ha
    # Secondary after processing should have the same.

    # We'll concatenate and then, for overlapping years, we prefer primary data.
    # The task says: "Use it only to add years after 2022-23 for those crops."
    # So we'll take all primary data, and then from secondary, we'll only take rows where year > 2022.

    # Filter secondary to years > 2022 (based on ending year of range)
    df_secondary['year_end'] = df_secondary['year'].str.split('-').str[1].astype(int)
    df_secondary_future = df_secondary[df_secondary['year_end'] > 2022].copy()
    df_secondary_future = df_secondary_future.drop(columns=['year_end'])

    # Combine
    df_combined = pd.concat([df_primary, df_secondary_future], ignore_index=True)

    return df_combined

def build_district_table(df):
    """Build district_crop_season.csv table."""
    # We need to compute for each (state, district, season, crop):
    # - years_observed: number of years observed
    # - mean_area_5y: mean area over the last 5 years
    # - area_share_in_season: area share of this crop in the district for that season (average over years)
    # - mean_yield_5y: mean yield over the last 5 years
    # - yield_cv: coefficient of variation of yield (std/mean) over all years
    # - area_trend: slope over the last 10 years (linear regression on area vs year)

    # We'll group by state_name, district_name, season, crop_name
    grouped = df.groupby(['state_name', 'district_name', 'season', 'crop_name'])

    rows = []
    for name, group in grouped:
        state, district, season, crop = name
        # Sort by year
        group_sorted = group.sort_values('year')
        years = group_sorted['year'].tolist()
        years_observed = len(years)

        # If less than 1 year, we still compute but some stats may be NaN
        # Last 5 years
        last_5 = group_sorted.tail(5)
        mean_area_5y = last_5['area_ha'].mean() if len(last_5) > 0 else np.nan
        mean_yield_5y = last_5['yield_t_ha'].mean() if len(last_5) > 0 else np.nan

        # Area share in season: for each year, compute area share of this crop in the district for that season,
        # then average over years.
        # We'll compute this later after the loop for efficiency.

        # Yield CV: coefficient of variation of yield over all years
        yield_mean = group_sorted['yield_t_ha'].mean()
        yield_std = group_sorted['yield_t_ha'].std()
        yield_cv = yield_std / yield_mean if yield_mean != 0 and not pd.isna(yield_mean) else np.nan

        # Area trend: slope over the last 10 years
        last_10 = group_sorted.tail(10)
        if len(last_10) >= 2:
            # Convert year range to numeric (ending year)
            year_strs = last_10['year'].astype(str)
            x = year_strs.str.split('-').str[1].astype(float).values
            y = last_10['area_ha'].values
            # Use numpy polyfit for degree 1
            slope = np.polyfit(x, y, 1)[0]
            area_trend = slope
        else:
            area_trend = np.nan

        rows.append({
            'state_name': state,
            'district_name': district,
            'season': season,
            'crop_name': crop,
            'years_observed': years_observed,
            'mean_area_5y': mean_area_5y,
            'mean_yield_5y': mean_yield_5y,
            'yield_cv': yield_cv,
            'area_trend': area_trend
        })

    df_district = pd.DataFrame(rows)

    # Now compute area_share_in_season
    # We'll compute total area per (year, state, district, season)
    total_area = df.groupby(['year', 'state_name', 'district_name', 'season'])['area_ha'].sum().reset_index()
    total_area = total_area.rename(columns={'area_ha': 'total_area_ha'})

    # Merge with original df
    df_with_total = df.merge(total_area, on=['year', 'state_name', 'district_name', 'season'])
    df_with_total['area_share'] = df_with_total['area_ha'] / df_with_total['total_area_ha']

    # Now average the share per (state, district, season, crop)
    avg_share = df_with_total.groupby(['state_name', 'district_name', 'season', 'crop_name'])['area_share'].mean().reset_index()
    avg_share = avg_share.rename(columns={'area_share': 'area_share_in_season'})

    # Merge with df_district
    df_district = df_district.merge(avg_share, on=['state_name', 'district_name', 'season', 'crop_name'], how='left')

    # Reorder columns
    cols = ['state_name', 'district_name', 'season', 'crop_name', 'years_observed', 'mean_area_5y',
            'area_share_in_season', 'mean_yield_5y', 'yield_cv', 'area_trend']
    df_district = df_district[cols]

    return df_district

def build_state_table(df):
    """Build state_crop_season.csv table (similar to district but at state level)."""
    # Group by state_name, season, crop_name
    grouped = df.groupby(['state_name', 'season', 'crop_name'])

    rows = []
    for name, group in grouped:
        state, season, crop = name
        group_sorted = group.sort_values('year')
        years = group_sorted['year'].tolist()
        years_observed = len(years)

        last_5 = group_sorted.tail(5)
        mean_area_5y = last_5['area_ha'].mean() if len(last_5) > 0 else np.nan
        mean_yield_5y = last_5['yield_t_ha'].mean() if len(last_5) > 0 else np.nan

        yield_mean = group_sorted['yield_t_ha'].mean()
        yield_std = group_sorted['yield_t_ha'].std()
        yield_cv = yield_std / yield_mean if yield_mean != 0 and not pd.isna(yield_mean) else np.nan

        last_10 = group_sorted.tail(10)
        if len(last_10) >= 2:
            # Convert year range to numeric (ending year)
            year_strs = last_10['year'].astype(str)
            x = year_strs.str.split('-').str[1].astype(float).values
            y = last_10['area_ha'].values
            slope = np.polyfit(x, y, 1)[0]
            area_trend = slope
        else:
            area_trend = np.nan

        rows.append({
            'state_name': state,
            'season': season,
            'crop_name': crop,
            'years_observed': years_observed,
            'mean_area_5y': mean_area_5y,
            'mean_yield_5y': mean_yield_5y,
            'yield_cv': yield_cv,
            'area_trend': area_trend
        })

    df_state = pd.DataFrame(rows)

    # Compute area_share_in_season at state level: share of this crop's area in the state for that season
    total_area_state = df.groupby(['year', 'state_name', 'season'])['area_ha'].sum().reset_index()
    total_area_state = total_area_state.rename(columns={'area_ha': 'total_area_ha'})

    df_with_total = df.merge(total_area_state, on=['year', 'state_name', 'season'])
    df_with_total['area_share'] = df_with_total['area_ha'] / df_with_total['total_area_ha']

    avg_share = df_with_total.groupby(['state_name', 'season', 'crop_name'])['area_share'].mean().reset_index()
    avg_share = avg_share.rename(columns={'area_share': 'area_share_in_season'})

    df_state = df_state.merge(avg_share, on=['state_name', 'season', 'crop_name'], how='left')

    cols = ['state_name', 'season', 'crop_name', 'years_observed', 'mean_area_5y',
            'area_share_in_season', 'mean_yield_5y', 'yield_cv', 'area_trend']
    df_state = df_state[cols]

    return df_state

def find_unmatched_districts(df_primary, df_secondary):
    """Find district names that don't match between the two files or between the profile/Open-Meteo district text and APY."""
    # We don't have profile/Open-Meteo district text in this dataset.
    # We'll focus on unmatched districts between the two files after mapping.
    # We'll get the set of district names from each file (original names) and find those that don't match exactly or fuzzily.

    # Get unique district names from each
    districts_primary = set(df_primary['district_name'].dropna().unique())
    districts_secondary = set(df_secondary['district_name'].dropna().unique())

    # For each district in secondary, find the best match in primary using fuzzy matching
    unmatched = []
    for dist_sec in districts_secondary:
        # Find best match in primary
        match, score, _ = process.extractOne(dist_sec, districts_primary, scorer=fuzz.WRatio)
        if score < 90:  # no auto-accept below 90% similarity
            unmatched.append({
                'district_secondary': dist_sec,
                'district_primary_match': match if score >= 0 else None,
                'similarity_score': score
            })

    # Also check for districts in primary that have no good match in secondary
    for dist_pri in districts_primary:
        match, score, _ = process.extractOne(dist_pri, districts_secondary, scorer=fuzz.WRatio)
        if score < 90:
            unmatched.append({
                'district_primary': dist_pri,
                'district_secondary_match': match if score >= 0 else None,
                'similarity_score': score
            })

    # Remove duplicates? We'll just create a DataFrame.
    if unmatched:
        df_unmatched = pd.DataFrame(unmatched)
    else:
        df_unmatched = pd.DataFrame(columns=['district_primary', 'district_secondary_match', 'similarity_score'])

    return df_unmatched

def get_crop_name_map():
    """Return the crop name mapping as a DataFrame."""
    # We'll create a mapping from the cleaning step.
    # We'll hardcode the mapping we used in clean_primary and process_secondary.
    mapping_dict = {
        'Arecanut (Brown)': 'Arecanut',
        'Arecanut (White)': 'Arecanut',
        'Cashewnut (Processed)': 'Cashewnut',
        'Cashewnut (Raw)': 'Cashewnut',
        'Jute': 'Jute and Mesta',
        'Mesta': 'Jute and Mesta',
        'Redish': 'Radish',
        'Ribed Guard': 'Ridge Guard',
        'Snak Guard': 'Snake Guard',
        'Pome Granet': 'Pomegranate',
        'Soybean': 'Soyabean',
        'Tur': 'Arhar/Tur',
        'Moong': 'Moong(Green Gram)',
        'Cotton': 'Cotton(Lint)'
    }

    # Convert to DataFrame
    df_map = pd.DataFrame(list(mapping_dict.items()), columns=['original_name', 'mapped_name'])
    return df_map

if __name__ == '__main__':
    main()