import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Image, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    key: 'wardrobe',
    image: require('../../assets/wardrobe-tutorial.jpg'),
    title: 'Main Wardrobe Categories',
    description:
      'The center of the screen shows a graphical representation of your closet, with four main categories. Tapping any of these takes you to a section where you can view, organize, or add clothing items.',
  },
  {
    key: 'scan',
    image: require('../../assets/scan-tutorial.jpg'),
    title: 'The Scan Process',
    description:
      'This feature uses your camera to capture and import a physical clothing item. You can add it to your personalized wardrobe or post and sell your items in the marketplace.',
  },
  {
    key: 'marketplace',
    image: require('../../assets/marketplace-tutorial.jpg'),
    title: 'Shopping: The Marketplace',
    description: 'Tap the Market icon to browse and purchase new clothes.',
  },
  {
    key: 'combine',
    image: require('../../assets/combine-outfit-tutorial.jpg'),
    title: 'Smart Outfit Suggestions',
    description: 'Mix and match items from your wardrobe to create your perfect outfit.',
  },
];

export default function TutorialModal({ visible, onClose }) {
  const { theme } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const dotsAnim = useRef(new Animated.Value(0)).current;

  const slide = useMemo(() => SLIDES[currentIndex], [currentIndex]);

  useEffect(() => {
    if (visible) {
      // Reset modal state every time it opens
      setCurrentIndex(0);
      setDontShowAgain(false);
      fadeAnim.setValue(1);
      dotsAnim.setValue(0);
    }
  }, [visible, fadeAnim, dotsAnim]);

  useEffect(() => {
    Animated.timing(dotsAnim, {
      toValue: currentIndex,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [currentIndex, dotsAnim]);

  const transitionToIndex = (newIndex) => {
    if (newIndex < 0 || newIndex >= SLIDES.length || newIndex === currentIndex) {
      return;
    }

    setCurrentIndex(newIndex);
  };

  const handleClose = () => {
    if (onClose) {
      onClose(dontShowAgain);
    }
  };

  const renderDots = () => {
    return SLIDES.map((_, index) => {
      const scale = dotsAnim.interpolate({
        inputRange: [index - 1, index, index + 1],
        outputRange: [0.9, 1.3, 0.9],
        extrapolate: 'clamp',
      });

      const opacity = dotsAnim.interpolate({
        inputRange: [index - 1, index, index + 1],
        outputRange: [0.4, 1, 0.4],
        extrapolate: 'clamp',
      });

      const widthAnim = dotsAnim.interpolate({
        inputRange: [index - 1, index, index + 1],
        outputRange: [8, 18, 8],
        extrapolate: 'clamp',
      });

      return (
        <Animated.View
          key={SLIDES[index].key}
          style={[
            styles.dot,
            { backgroundColor: theme.colors.accent },
            { opacity, transform: [{ scale }], width: widthAnim },
          ]}
        />
      );
    });
  };

  const isFirstSlide = currentIndex === 0;
  const isLastSlide = currentIndex === SLIDES.length - 1;

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: theme.colors.containerBackground }]}>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Ionicons name="close" size={24} color={theme.colors.icon} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.primaryText }]}>TUTORIAL</Text>

          <Animated.View
            key={slide.key}
            style={[
              styles.slideContent,
              {
                opacity: fadeAnim,
                transform: [
                  {
                    translateY: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [16, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Image source={slide.image} style={styles.tutorialImage} resizeMode="contain" />
            <Text style={[styles.slideTitle, { color: theme.colors.primaryText }]}>{slide.title}</Text>
            <Text style={[styles.slideDescription, { color: theme.colors.secondaryText }]}>{slide.description}</Text>
          </Animated.View>

          <View style={styles.navigationRow}>
            <TouchableOpacity
              style={[
                styles.navButton,
                { borderColor: theme.colors.border },
                isFirstSlide && styles.navButtonDisabled,
              ]}
              onPress={() => transitionToIndex(currentIndex - 1)}
              disabled={isFirstSlide}
            >
              <Ionicons
                name="chevron-back"
                size={20}
                color={isFirstSlide ? theme.colors.secondaryText : theme.colors.primaryText}
              />
            </TouchableOpacity>

            <View style={styles.dotsRow}>{renderDots()}</View>

            <TouchableOpacity
              style={[
                styles.navButton,
                { borderColor: theme.colors.border },
                isLastSlide && styles.navButtonDisabled,
              ]}
              onPress={() => transitionToIndex(currentIndex + 1)}
              disabled={isLastSlide}
            >
              <Ionicons
                name="chevron-forward"
                size={20}
                color={isLastSlide ? theme.colors.secondaryText : theme.colors.primaryText}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.checkboxRow} onPress={() => setDontShowAgain((prev) => !prev)}>
            <View
              style={[
                styles.checkbox,
                { borderColor: theme.colors.border },
                dontShowAgain && { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
              ]}
            >
              {dontShowAgain && <Ionicons name="checkmark" size={16} color={theme.colors.buttonText} />}
            </View>
            <Text style={[styles.checkboxLabel, { color: theme.colors.primaryText }]}>Don&apos;t show again</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    padding: 6,
    zIndex: 2,
  },
  headerTitle: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
  },
  slideContent: {
    alignItems: 'center',
    minHeight: height * 0.45,
  },
  tutorialImage: {
    width: '90%',
    height: Math.min(280, height * 0.35),
    marginBottom: 16,
    borderRadius: 16,
  },
  slideTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  slideDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 6,
  },
  navigationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 22,
    alignSelf: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  checkboxLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
});

