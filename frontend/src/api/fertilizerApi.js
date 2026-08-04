import { apiRequest } from './client'

export const suggestFertilizer = (payload, token) =>
  apiRequest('/fertilizer-suggest', { method: 'POST', body: payload, token })
