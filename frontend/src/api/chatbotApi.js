import { apiRequest } from './client'

export const askChatbot = (payload, token) =>
  apiRequest('/chatbot-query', { method: 'POST', body: payload, token })
