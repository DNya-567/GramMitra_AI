import { apiRequest } from './client'

export const getMarketPrice = (commodity, state, district, token) => {
  const params = new URLSearchParams({ commodity, ...(state && { state }), ...(district && { district }) })
  return apiRequest(`/market-price?${params}`, { token })
}
