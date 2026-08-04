import { apiRequest } from './client'

export const getWeatherAdvisory = (region, token) =>
  apiRequest(`/weather-advisory?region=${encodeURIComponent(region)}`, { token })
