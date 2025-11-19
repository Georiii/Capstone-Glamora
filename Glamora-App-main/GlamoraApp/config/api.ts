/**
 * API Configuration
 * This file centralizes all API endpoints and automatically adapts to different environments
 */

// Environment detection
const isDevelopment = __DEV__;
const isProduction = !isDevelopment;

// Server configuration for different environments
// For tunnel testing, set EXPO_PUBLIC_API_URL in your environment
const TUNNEL_URL = process.env.EXPO_PUBLIC_API_URL;

const SERVER_CONFIG = {
  development: {
    local: TUNNEL_URL || 'https://glamora-g5my.onrender.com',
    production: 'https://glamora-g5my.onrender.com'
  },
  production: {
    local: 'https://glamora-g5my.onrender.com',
    production: 'https://glamora-g5my.onrender.com'
  }
};

// Get the appropriate server URL based on environment
export const getApiBaseUrl = (environment: 'local' | 'production' = 'local'): string => {
  const env = isDevelopment ? 'development' : 'production';
  return SERVER_CONFIG[env][environment];
};

// Default API base URL (uses local for development, production for production builds)
export const API_BASE_URL = getApiBaseUrl(isDevelopment ? 'local' : 'production');

// Individual API endpoints for easy access
export const API_ENDPOINTS = {
  // Authentication
  login: `${API_BASE_URL}/api/auth/login`,
  register: `${API_BASE_URL}/api/auth/register`,
  getUser: (email: string) => `${API_BASE_URL}/api/auth/user/${email}`,
  forgotPassword: `${API_BASE_URL}/api/auth/forgot-password`,
  verifyResetToken: `${API_BASE_URL}/api/auth/verify-reset-token`,
  resetPassword: `${API_BASE_URL}/api/auth/reset-password`,
  requestEmailChange: `${API_BASE_URL}/api/auth/request-email-change`,
  confirmEmailChange: (token: string) => `${API_BASE_URL}/api/auth/confirm-email-change?token=${token}`,
  changePassword: `${API_BASE_URL}/api/auth/change-password`,
  
  // Profile & Measurements
  baseUrl: API_BASE_URL,
  updateProfile: `${API_BASE_URL}/api/auth/profile/measurements`,
  getProfile: (email: string) => `${API_BASE_URL}/api/auth/profile/${email}`,
  uploadProfilePicture: `${API_BASE_URL}/api/auth/profile/picture`,
  updateUser: (id: string) => `${API_BASE_URL}/api/auth/users/${id}`,
  
  // Wardrobe
  wardrobe: `${API_BASE_URL}/api/wardrobe/`,
  addWardrobeItem: `${API_BASE_URL}/api/wardrobe/add`,
  deleteWardrobeItem: (id: string) => `${API_BASE_URL}/api/wardrobe/${id}`,
  uploadImage: `${API_BASE_URL}/api/wardrobe/upload-image`,
  
  // Marketplace
  marketplace: `${API_BASE_URL}/api/wardrobe/marketplace`,
  marketplaceSearch: (query: string) => `${API_BASE_URL}/api/wardrobe/marketplace?search=${encodeURIComponent(query)}`,
  addMarketplaceItem: `${API_BASE_URL}/api/wardrobe/marketplace`,
  getMarketplaceItems: `${API_BASE_URL}/api/wardrobe/marketplace`,
  getUserMarketplaceItems: `${API_BASE_URL}/api/wardrobe/marketplace/user`,
  deleteMarketplaceItem: (id: string) => `${API_BASE_URL}/api/wardrobe/marketplace/${id}`,
  updateMarketplaceItem: (id: string) => `${API_BASE_URL}/api/wardrobe/marketplace/${id}`,
  
  // Chat
  chatConversations: `${API_BASE_URL}/api/chat/conversations/list`,
  chatMessages: (userId: string) => `${API_BASE_URL}/api/chat/${userId}`,
  chatSend: `${API_BASE_URL}/api/chat/send`,
  chatMarkRead: (userId: string) => `${API_BASE_URL}/api/chat/mark-read/${userId}`,
  chatDeleteConversation: (userId: string) => `${API_BASE_URL}/api/chat/conversations/${userId}`,
  chatContext: (userId: string) => `${API_BASE_URL}/api/chat/context/${userId}`,
  chatContextUpdate: `${API_BASE_URL}/api/chat/context`,
  
  // Reports
  report: `${API_BASE_URL}/api/report`,
  
  // Outfits
  outfits: `${API_BASE_URL}/api/outfits`,
  outfitById: (id: string) => `${API_BASE_URL}/api/outfits/${id}`,
  outfitFavorites: `${API_BASE_URL}/api/outfits/favorites/list`,
  outfitToggleFavorite: (id: string) => `${API_BASE_URL}/api/outfits/${id}/favorite`,

  // Clothing Usage
  clothingUsage: {
    track: `${API_BASE_URL}/api/clothing-usage/track`,
    frequentData: (timeRange: string) => `${API_BASE_URL}/api/clothing-usage/frequent-data?timeRange=${timeRange}`,
  },

  // AI Recommendations
  recommendations: {
    outfits: `${API_BASE_URL}/api/recommendations/outfits`,
    weather: (weather: string) => `${API_BASE_URL}/api/recommendations/weather/${weather}`,
    complementary: (itemId: string) => `${API_BASE_URL}/api/recommendations/complementary/${itemId}`,
  },

  // Weather
  weather: {
    current: (location: string) => `${API_BASE_URL}/api/weather/current?location=${encodeURIComponent(location)}`,
    forecast: (location: string, days: number = 1) => `${API_BASE_URL}/api/weather/forecast?location=${encodeURIComponent(location)}&days=${days}`,
  },

  // Subscription/Premium
  subscriptionStatus: `${API_BASE_URL}/api/subscription/status`,
  subscribe: `${API_BASE_URL}/api/subscription/subscribe`,

  // Policies
  policies: `${API_BASE_URL}/api/policy`,

  // Notifications
  notifications: {
    register: `${API_BASE_URL}/api/notifications/register`,
    preferences: `${API_BASE_URL}/api/notifications/preferences`,
    unregister: `${API_BASE_URL}/api/notifications/unregister`,
    send: `${API_BASE_URL}/api/notifications/send`,
  },
};

// Helper function to get full URL for any endpoint
export const getApiUrl = (endpoint: string, ...params: any[]): string => {
  const endpointPath = endpoint.split('.');
  let baseEndpoint: any = API_ENDPOINTS;
  
  // Navigate through nested endpoint structure
  for (const path of endpointPath) {
    baseEndpoint = baseEndpoint[path];
    if (!baseEndpoint) {
      throw new Error(`Endpoint not found: ${endpoint}`);
    }
  }
  
  if (typeof baseEndpoint === 'function') {
    return baseEndpoint(...params);
  }
  
  return baseEndpoint;
};

// Export current environment info for debugging
export const ENV_INFO = {
  isDevelopment,
  isProduction,
  currentApiUrl: API_BASE_URL,
  serverConfig: SERVER_CONFIG
}; 