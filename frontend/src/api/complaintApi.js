import { apiRequest } from './client'

export const fileComplaint = (payload, token) =>
  apiRequest('/complaint', { method: 'POST', body: payload, token })
