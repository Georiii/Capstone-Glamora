import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheItem {
  data: any;
  timestamp: number;
  expiry: number;
}

class APICache {
  private memoryCache = new Map<string, CacheItem>();
  private readonly DEFAULT_EXPIRY = 5 * 60 * 1000; // 5 minutes

  /**
   * Generate a cache key from URL and params
   */
  private generateKey(url: string, params?: any): string {
    const paramStr = params ? JSON.stringify(params) : '';
    return `api_cache_${url}_${paramStr}`;
  }

  /**
   * Check if cache item is expired
   */
  private isExpired(item: CacheItem): boolean {
    return Date.now() > item.timestamp + item.expiry;
  }

  /**
   * Get data from cache (memory first, then AsyncStorage)
   */
  async get(url: string, params?: any): Promise<any | null> {
    const key = this.generateKey(url, params);
    
    // Check memory cache first
    const memoryItem = this.memoryCache.get(key);
    if (memoryItem && !this.isExpired(memoryItem)) {
      console.log('🚀 Cache HIT (memory):', key);
      return memoryItem.data;
    }

    // Check AsyncStorage cache
    try {
      const storedItem = await AsyncStorage.getItem(key);
      if (storedItem) {
        const parsedItem: CacheItem = JSON.parse(storedItem);
        if (!this.isExpired(parsedItem)) {
          console.log('🚀 Cache HIT (storage):', key);
          // Also store in memory for faster access
          this.memoryCache.set(key, parsedItem);
          return parsedItem.data;
        } else {
          // Remove expired item
          await AsyncStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.error('Cache get error:', error);
    }

    console.log('❌ Cache MISS:', key);
    return null;
  }

  /**
   * Set data in cache (both memory and AsyncStorage)
   */
  async set(url: string, data: any, params?: any, customExpiry?: number): Promise<void> {
    const key = this.generateKey(url, params);
    const expiry = customExpiry || this.DEFAULT_EXPIRY;
    const cacheItem: CacheItem = {
      data,
      timestamp: Date.now(),
      expiry,
    };

    // Store in memory
    this.memoryCache.set(key, cacheItem);

    // Store in AsyncStorage
    try {
      await AsyncStorage.setItem(key, JSON.stringify(cacheItem));
      console.log('💾 Cache SET:', key);
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  /**
   * Clear specific cache entry
   */
  async clear(url: string, params?: any): Promise<void> {
    const key = this.generateKey(url, params);
    
    // Remove from memory
    this.memoryCache.delete(key);
    
    // Remove from AsyncStorage
    try {
      await AsyncStorage.removeItem(key);
      console.log('🗑️ Cache CLEAR:', key);
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  /**
   * Clear all cache entries
   */
  async clearAll(): Promise<void> {
    // Clear memory cache
    this.memoryCache.clear();
    
    // Clear AsyncStorage cache
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('api_cache_'));
      await AsyncStorage.multiRemove(cacheKeys);
      console.log('🗑️ Cache CLEAR ALL:', cacheKeys.length, 'items');
    } catch (error) {
      console.error('Cache clear all error:', error);
    }
  }

  /**
   * Get cached data or fetch from API
   */
  async getOrFetch(
    url: string, 
    fetchFunction: () => Promise<any>,
    params?: any,
    customExpiry?: number
  ): Promise<any> {
    // Try to get from cache first
    const cachedData = await this.get(url, params);
    if (cachedData !== null) {
      return cachedData;
    }

    // Fetch from API
    try {
      const data = await fetchFunction();
      // Cache the result
      await this.set(url, data, params, customExpiry);
      return data;
    } catch (error) {
      console.error('API fetch error:', error);
      throw error;
    }
  }

  /**
   * Batch multiple API calls
   */
  async batchFetch(requests: Array<{
    key: string;
    fetchFunction: () => Promise<any>;
    params?: any;
    expiry?: number;
  }>): Promise<{ [key: string]: any }> {
    const results: { [key: string]: any } = {};
    
    // Execute all requests in parallel
    const promises = requests.map(async (request) => {
      try {
        const data = await this.getOrFetch(
          request.key,
          request.fetchFunction,
          request.params,
          request.expiry
        );
        results[request.key] = data;
      } catch (error) {
        console.error(`Batch fetch error for ${request.key}:`, error);
        results[request.key] = null;
      }
    });

    await Promise.all(promises);
    return results;
  }
}

// Export singleton instance
export const apiCache = new APICache();
export default apiCache;
