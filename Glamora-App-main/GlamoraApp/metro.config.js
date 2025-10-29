// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Ensure web builds work correctly with expo-router
config.resolver = {
  ...config.resolver,
  sourceExts: [...(config.resolver?.sourceExts || []), 'mjs', 'cjs'],
  platforms: ['ios', 'android', 'native', 'web'],
};

// Ensure proper asset extensions
if (!config.resolver.assetExts) {
  config.resolver.assetExts = [];
}

module.exports = config;
