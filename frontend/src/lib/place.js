/**
 * Generate a human-readable place label from profile location fields.
 * @param {Object|null} profile - The user profile object with village, district, state, location fields.
 * @returns {string} A label like "Village, District, State" or "Your farm location".
 */
export const getPlaceLabel = (profile) => {
  if (!profile) {
    return 'Your farm location';
  }

  const { village, district, state, location } = profile;

  // Start with the explicit location string if it's not a coordinate string
  if (location && typeof location === 'string' && !location.startsWith('Lat:')) {
    // We still want to try to use village/district/state if available, but we can keep location as fallback.
    // For now, we'll prioritize village/district/state.
    // We'll still use the location if village/district/state are all empty.
  }

  const parts = [];
  if (village && typeof village === 'string' && village.trim() !== '') {
    parts.push(village.trim());
  }
  if (district && typeof district === 'string' && district.trim() !== '') {
    parts.push(district.trim());
  }
  if (state && typeof state === 'string' && state.trim() !== '') {
    parts.push(state.trim());
  }

  // Remove duplicates case-insensitively
  const seen = new Set();
  const uniqueParts = [];
  for (const part of parts) {
    const lower = part.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      uniqueParts.push(part);
    }
  }

  if (uniqueParts.length === 0) {
    return 'Your farm location';
  }

  return uniqueParts.join(', ');
};