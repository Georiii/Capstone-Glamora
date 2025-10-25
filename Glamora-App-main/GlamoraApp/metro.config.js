const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Get the project root (GlamoraApp directory)
const projectRoot = __dirname;

// Exclude backend files and server files from bundling
config.resolver.blockList = [
  // Block backend directory
  /.*\/backend\/.*/,
  // Block server files (both in current dir and parent dir)
  /.*\/server\.js$/,
  /.*\/src\/server\.js$/,
  // Block the specific src/server.js in parent directory
  /.*\/Glamora-App-main\/src\/server\.js$/,
  // Block other backend-related files
  /.*\/routes\/.*/,
  /.*\/models\/.*/,
  /.*\/backup-files\/.*/,
  /.*\/hell$/,
  /.*\/tatus$/,
  // Block Node.js specific files that shouldn't be bundled
  /.*\/package\.json$/,
  /.*\/package-lock\.json$/,
  /.*\/node_modules\/.*/,
];

// Ensure only mobile app files are included
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Add additional resolver configuration
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// Watch only the current project directory, not parent directories
config.watchFolders = [projectRoot];

// Block any files outside the project root
config.resolver.blockList.push(
  new RegExp(`^${path.dirname(projectRoot)}/.*`)
);

module.exports = config;
