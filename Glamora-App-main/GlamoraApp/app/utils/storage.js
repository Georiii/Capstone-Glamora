import AsyncStorage from '@react-native-async-storage/async-storage';

const HAS_SEEN_TUTORIAL_KEY = 'hasSeenTutorial';

export async function getHasSeenTutorial() {
  try {
    const value = await AsyncStorage.getItem(HAS_SEEN_TUTORIAL_KEY);
    if (value === null) {
      return false;
    }
    return value === 'true';
  } catch (error) {
    console.warn('Unable to read tutorial flag:', error);
    return false;
  }
}

export async function setHasSeenTutorial(value) {
  try {
    await AsyncStorage.setItem(HAS_SEEN_TUTORIAL_KEY, value ? 'true' : 'false');
  } catch (error) {
    console.warn('Unable to persist tutorial flag:', error);
  }
}

