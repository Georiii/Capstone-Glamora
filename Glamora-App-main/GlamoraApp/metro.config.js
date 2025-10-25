const { getDefaultConfig } = require('expo/metro-config');
const exclusionList = require('metro-config/src/defaults/exclusionList');

const config = getDefaultConfig(__dirname);

// Exclude backend/server files from the mobile bundle (do NOT block node_modules)
config.resolver.blockList = exclusionList([
  // Parent repo backend entry
  /.*\/Glamora-App-main\/src\/server\.js$/,
  // Backend folders that may exist in repo
  /.*\/backend\/.*/,
  /.*\/backup-files\/.*/,
  /.*\/routes\/.*/,
  /.*\/models\/.*/,
  // Backend server files that might exist at project root
  /.*\/server\.js$/,
  /.*\/src\/server\.js$/,
  // Misc leftover test files
  /.*\/hell$/,
  /.*\/tatus$/
]);

// Ensure only mobile app files are included
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Prefer React Native/browser fields when resolving packages
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

module.exports = config;
