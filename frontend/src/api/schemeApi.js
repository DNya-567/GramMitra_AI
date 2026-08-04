import { apiRequest } from './client'

export const getSchemes = (query = '', token) =>
  apiRequest(`/schemes?query=${encodeURIComponent(query)}`, { token })
