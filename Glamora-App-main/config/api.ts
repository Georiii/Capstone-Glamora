/**
 * API Configuration
 * This file centralizes all API endpoints and automatically adapts to different environments
 */

// Environment detection
const isDevelopment = __DEV__;
const isProduction = !isDevelopment;

// Server configuration for different environments
const SERVER_CONFIG = {
  development: {
    local: 'http://localhost:3000',  // Fixed: Using correct port 3000
    production: 'https://your-domain.com' // Your future production domain
  },
  production: {
    local: 'http://localhost:3000',  // Fixed: Using correct port 3000
    production: 'https://your-domain.com' // Your production domain
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
  
  // Profile & Measurements
  baseUrl: API_BASE_URL,
  updateProfile: `${API_BASE_URL}/api/auth/profile/measurements`,
  getProfile: (email: string) => `${API_BASE_URL}/api/auth/profile/${email}`,
  
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
  
  // Chat
  chatConversations: `${API_BASE_URL}/api/chat/conversations/list`,
  chatMessages: (userId: string) => `${API_BASE_URL}/api/chat/${userId}`,
  chatSend: `${API_BASE_URL}/api/chat/send`,
  chatMarkRead: (userId: string) => `${API_BASE_URL}/api/chat/mark-read/${userId}`,
  
  // Reports
  report: `${API_BASE_URL}/api/report`,
  
  // Outfits
  outfits: `${API_BASE_URL}/api/outfits`,
  outfitById: (id: string) => `${API_BASE_URL}/api/outfits/${id}`,
  outfitFavorites: `${API_BASE_URL}/api/outfits/favorites/list`,
  outfitToggleFavorite: (id: string) => `${API_BASE_URL}/api/outfits/${id}/favorite`,

  // AI Recommendations
  recommendations: {
    outfits: `${API_BASE_URL}/api/recommendations/outfits`,
    weather: (weather: string) => `${API_BASE_URL}/api/recommendations/weather/${weather}`,
    complementary: (itemId: string) => `${API_BASE_URL}/api/recommendations/complementary/${itemId}`,
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