import AsyncStorage from '@react-native-async-storage/async-storage';
import { AVPlaybackSource } from 'expo-av';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AdOverlay from '../components/AdOverlay';
import { API_ENDPOINTS } from '../../config/api';
import { useUser } from './UserContext';

const AD_INTERVAL_MS = 2 * 60 * 1000;
const STORAGE_KEY = 'glamora:lastAdTimestamp';

const AD_VIDEOS: AVPlaybackSource[] = [
  require('../../assets/videos/AI_Video_for_Sustainable_Fashion_App.mp4'),
  require('../../assets/videos/Video_Creation_Request_and_Delivery.mp4'),
];

type TimerRef = ReturnType<typeof setTimeout> | null;

interface AdContextValue {
  showAdNow: () => void;
  dismissAd: () => void;
  isVisible: boolean;
}

const AdContext = createContext<AdContextValue | undefined>(undefined);

export const useAds = () => {
  const context = useContext(AdContext);
  if (!context) {
    throw new Error('useAds must be used within an AdProvider');
  }
  return context;
};

interface AdProviderProps {
  children: React.ReactNode;
}

export const AdProvider: React.FC<AdProviderProps> = ({ children }) => {
  const { user, updateUser } = useUser();
  const hasPremium =
    user?.subscription?.isSubscribed === true || user?.isSubscribed === true;
  const shouldShowAds = !!user && !hasPremium;
  const [isVisible, setIsVisible] = useState(false);
  const [activeVideoIndex, setActiveVideoIndex] = useState<number | null>(null);
  const [lastShownAt, setLastShownAt] = useState<number | null>(null);
  const timerRef = useRef<TimerRef>(null);
  const nextVideoIndexRef = useRef(0);
  const appState = useRef<AppStateStatus>(AppState.currentState ?? 'active');
  const isBackgroundLike = useCallback(
    (state: AppStateStatus) => state === 'background' || state === 'inactive',
    [],
  );

  const refreshSubscriptionStatus = useCallback(async () => {
    if (!user) {
      return;
    }
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        return;
      }
      const response = await fetch(API_ENDPOINTS.subscriptionStatus, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        updateUser({
          isSubscribed: data.isSubscribed,
          subscription: {
            ...(user.subscription || {}),
            isSubscribed: data.isSubscribed,
            subscriptionType: data.subscriptionType || user.subscription?.subscriptionType,
            subscribedAt: data.subscribedAt || user.subscription?.subscribedAt,
            expiresAt: data.expiresAt || user.subscription?.expiresAt,
          },
        });
      }
    } catch (error) {
      console.warn('Unable to refresh subscription status', error);
    }
  }, [updateUser, user]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const selectNextVideo = useCallback(() => {
    if (!AD_VIDEOS.length) {
      return null;
    }
    const currentIndex = nextVideoIndexRef.current;
    nextVideoIndexRef.current = (nextVideoIndexRef.current + 1) % AD_VIDEOS.length;
    return currentIndex;
  }, []);

  const showAd = useCallback(() => {
    if (!shouldShowAds || isVisible || !AD_VIDEOS.length) {
      return;
    }
    const nextIndex = selectNextVideo();
    if (nextIndex === null) {
      return;
    }
    clearTimer();
    setActiveVideoIndex(nextIndex);
    setIsVisible(true);
  }, [clearTimer, isVisible, selectNextVideo, shouldShowAds]);

  const updateStoredTimestamp = useCallback(async (timestamp: number) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, String(timestamp));
    } catch (error) {
      console.warn('Unable to persist ad timestamp', error);
    }
  }, []);

  const scheduleNextAd = useCallback(
    (customDelay?: number) => {
      clearTimer();
      if (!shouldShowAds || !AD_VIDEOS.length) {
        return;
      }
      const delay = typeof customDelay === 'number' ? Math.max(customDelay, 1000) : AD_INTERVAL_MS;
      timerRef.current = setTimeout(() => {
        showAd();
      }, delay);
    },
    [clearTimer, shouldShowAds, showAd],
  );

  const dismissAd = useCallback(() => {
    if (!isVisible) {
      return;
    }
    setIsVisible(false);
    setActiveVideoIndex(null);
    const timestamp = Date.now();
    setLastShownAt(timestamp);
    updateStoredTimestamp(timestamp);
    scheduleNextAd();
  }, [isVisible, scheduleNextAd, updateStoredTimestamp]);

  const showAdNow = useCallback(() => {
    showAd();
  }, [showAd]);

  useEffect(() => {
    const loadTimestamp = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = Number(stored);
          if (!Number.isNaN(parsed)) {
            setLastShownAt(parsed);
          }
        }
      } catch (error) {
        console.warn('Unable to load ad timestamp', error);
      }
    };

    loadTimestamp();
  }, []);

  useEffect(() => {
    refreshSubscriptionStatus();
  }, [refreshSubscriptionStatus]);

  useEffect(() => {
    if (!shouldShowAds) {
      clearTimer();
      setIsVisible(false);
      return undefined;
    }

    if (isVisible) {
      return undefined;
    }

    const now = Date.now();
    if (!lastShownAt) {
      scheduleNextAd(AD_INTERVAL_MS);
    } else {
      const elapsed = now - lastShownAt;
      if (elapsed >= AD_INTERVAL_MS) {
        showAd();
      } else {
        scheduleNextAd(AD_INTERVAL_MS - elapsed);
      }
    }

    return () => clearTimer();
  }, [shouldShowAds, lastShownAt, scheduleNextAd, clearTimer, showAd, isVisible]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (isBackgroundLike(appState.current) && nextAppState === 'active') {
        refreshSubscriptionStatus();
        if (shouldShowAds && !isVisible) {
          const now = Date.now();
          const elapsed = lastShownAt ? now - lastShownAt : AD_INTERVAL_MS;
          if (elapsed >= AD_INTERVAL_MS) {
            showAd();
          } else {
            scheduleNextAd(AD_INTERVAL_MS - elapsed);
          }
        }
      } else if (isBackgroundLike(nextAppState)) {
        clearTimer();
      }

      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, [shouldShowAds, lastShownAt, scheduleNextAd, clearTimer, showAd, isVisible, isBackgroundLike, refreshSubscriptionStatus]);

  const contextValue = useMemo(
    () => ({
      showAdNow,
      dismissAd,
      isVisible,
    }),
    [dismissAd, isVisible, showAdNow],
  );

  const activeSource = activeVideoIndex !== null ? AD_VIDEOS[activeVideoIndex] : null;

  return (
    <AdContext.Provider value={contextValue}>
      {children}
      <AdOverlay visible={isVisible} source={activeSource} onClose={dismissAd} onFinished={dismissAd} />
    </AdContext.Provider>
  );
};


