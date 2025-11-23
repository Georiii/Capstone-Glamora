import { Ionicons } from '@expo/vector-icons';
import { AVPlaybackSource, AVPlaybackStatus, ResizeMode, Video } from 'expo-av';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface AdOverlayProps {
  visible: boolean;
  source: AVPlaybackSource | null;
  onClose: () => void;
  onFinished: () => void;
}

const SKIP_DELAY_MS = 3000;

const AdOverlay: React.FC<AdOverlayProps> = ({ visible, source, onClose, onFinished }) => {
  const videoRef = useRef<Video | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isBuffering, setIsBuffering] = useState(true);
  const [skipAvailable, setSkipAvailable] = useState(false);
  const { width } = useWindowDimensions();
  const { theme } = useTheme();

  useEffect(() => {
    let skipTimer: ReturnType<typeof setTimeout> | null = null;
    if (visible) {
      setSkipAvailable(false);
      skipTimer = setTimeout(() => setSkipAvailable(true), SKIP_DELAY_MS);
    } else {
      setSkipAvailable(false);
    }
    return () => {
      if (skipTimer) {
        clearTimeout(skipTimer);
      }
    };
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    setIsMuted(true);
    setIsBuffering(true);
  }, [visible]);

  useEffect(() => {
    if (!visible || !videoRef.current) {
      return;
    }

    const startPlayback = async () => {
      try {
        await videoRef.current?.setIsMutedAsync(true);
        await videoRef.current?.replayAsync({
          positionMillis: 0,
          shouldPlay: true,
        });
      } catch (error) {
        console.warn('Unable to start ad playback', error);
      }
    };

    startPlayback();
  }, [visible, source]);

  useEffect(() => {
    if (!visible && videoRef.current) {
      videoRef.current.stopAsync().catch(() => undefined);
    }
  }, [visible]);

  const handlePlaybackStatus = useCallback(
    (status: AVPlaybackStatus) => {
      if (!status.isLoaded) {
        if ('error' in status) {
          console.warn('Ad playback error', status.error);
        }
        return;
      }

      setIsBuffering(status.isBuffering ?? false);

      if (status.didJustFinish) {
        onFinished();
      }
    },
    [onFinished],
  );

  if (!visible || !source) {
    return null;
  }

  const cardWidth = Math.min(width * 0.9, 420);

  const handleToggleMute = async () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (videoRef.current) {
      try {
        await videoRef.current.setIsMutedAsync(nextMuted);
      } catch {
        // no-op
      }
    }
  };

  return (
    <View style={styles.overlay} pointerEvents="auto">
      <View style={styles.backdrop} />
      <View style={styles.center}>
        <View
          style={[
            styles.card,
            {
              width: cardWidth,
              backgroundColor: theme.colors.containerBackground,
            },
          ]}
        >
          <View style={styles.headerRow}>
            <Text style={[styles.headerText, { color: theme.colors.primaryText }]}>
              Glamora Spotlight
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close advertisement"
              style={styles.closeButton}
              onPress={onClose}
            >
              <Ionicons name="close" size={22} color={theme.colors.primaryText} />
            </Pressable>
          </View>

          <View style={styles.videoContainer}>
            <Video
              ref={ref => {
                videoRef.current = ref;
              }}
              source={source}
              style={styles.video}
              resizeMode={ResizeMode.COVER}
              shouldPlay
              isLooping={false}
              isMuted={isMuted}
              useNativeControls={false}
              onPlaybackStatusUpdate={handlePlaybackStatus}
              onLoadStart={() => setIsBuffering(true)}
              onLoad={() => setIsBuffering(false)}
            />
            {isBuffering && (
              <View style={styles.loader}>
                <ActivityIndicator color={theme.colors.accent} />
              </View>
            )}
            <View style={styles.videoControls}>
              <Pressable
                style={styles.controlButton}
                onPress={handleToggleMute}
                accessibilityRole="button"
                accessibilityLabel={isMuted ? 'Unmute advertisement' : 'Mute advertisement'}
              >
                <Ionicons name={isMuted ? 'volume-mute' : 'volume-high'} size={18} color="#fff" />
              </Pressable>
              <Pressable
                style={[styles.controlButton, !skipAvailable && styles.controlButtonDisabled]}
                onPress={skipAvailable ? onClose : undefined}
                disabled={!skipAvailable}
                accessibilityRole="button"
                accessibilityLabel="Skip advertisement"
              >
                <Text style={styles.skipText}>{skipAvailable ? 'Skip' : 'Wait'}</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: theme.colors.secondaryText }]}>
              Upgrade to Glamora Premium for an ad-free experience.
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  card: {
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerText: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  videoContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  videoControls: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  controlButton: {
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    minWidth: 70,
    alignItems: 'center',
  },
  controlButtonDisabled: {
    opacity: 0.5,
  },
  skipText: {
    color: '#fff',
    fontWeight: '600',
  },
  footer: {
    marginTop: 16,
  },
  footerText: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default AdOverlay;


