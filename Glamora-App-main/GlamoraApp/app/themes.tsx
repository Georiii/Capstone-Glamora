import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from './contexts/ThemeContext';
import { ThemeName, themes } from '../config/themes';

export default function Themes() {
  const router = useRouter();
  const { theme, themeName, setTheme } = useTheme();

  const handleThemeSelect = async (selectedTheme: ThemeName) => {
    await setTheme(selectedTheme);
  };

  const themeOptions: ThemeName[] = ['default', 'dark', 'blue', 'green', 'purple', 'orange', 'red'];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bodyBackground }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.headerBackground }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.headerText} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.headerText }]}>Themes</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Theme Selection Grid */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.themeGrid}>
          {themeOptions.map((themeOption) => {
            const themeData = themes[themeOption];
            const isSelected = themeName === themeOption;

            return (
              <TouchableOpacity
                key={themeOption}
                style={styles.themeItem}
                onPress={() => handleThemeSelect(themeOption)}
              >
                <View
                  style={[
                    styles.themeSwatch,
                    { backgroundColor: themeData.colors.buttonBackground },
                    isSelected && styles.themeSwatchSelected,
                  ]}
                >
                  {isSelected && (
                    <View style={styles.checkmarkContainer}>
                      <Ionicons name="checkmark-circle" size={28} color="#2196F3" />
                    </View>
                  )}
                </View>
                <Text style={[styles.themeLabel, { color: theme.colors.primaryText }]}>
                  {themeData.displayName}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
  },
  backButton: {
    padding: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    padding: 20,
    paddingTop: 30,
  },
  themeItem: {
    alignItems: 'center',
    marginBottom: 30,
    width: '30%',
  },
  themeSwatch: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginBottom: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  themeSwatchSelected: {
    borderWidth: 3,
    borderColor: '#4CAF50',
  },
  checkmarkContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  themeLabel: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});

