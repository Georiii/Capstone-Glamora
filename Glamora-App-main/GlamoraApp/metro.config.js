const { getDefaultConfig } = require('expo/metro-config');
const exclusionList = require('metro-config/src/defaults/exclusionList');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Compute absolute repo root (parent of GlamoraApp)
const repoRoot = path.resolve(__dirname, '..');
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const R = (rel) => new RegExp(`^${escapeRegExp(repoRoot.replace(/\\/g, '/'))}/${rel}`);

// Exclude ONLY specific backend/server paths to prevent bundling issues
config.resolver.blockList = exclusionList([
  R('Glamora-App-main/src/server\\.js$'),
  R('Glamora-App-main/GlamoraApp/backend/.*'),
  R('Glamora-App-main/backend/.*'),
  R('Glamora-App-main/admin-side/.*')
]);

// Ensure only mobile app files are included
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Prefer React Native/browser fields when resolving packages
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

module.exports = config;
