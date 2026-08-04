import { apiRequest } from './client'

export const recommendCrop = (payload, token) =>
  apiRequest('/crop-recommend', { method: 'POST', body: payload, token })
