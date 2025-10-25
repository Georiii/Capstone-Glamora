const { getDefaultConfig } = require('expo/metro-config');
const exclusionList = require('metro-config/src/defaults/exclusionList');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Compute absolute repo root (parent of GlamoraApp)
const repoRoot = path.resolve(__dirname, '..');
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const R = (rel) => new RegExp(`^${escapeRegExp(repoRoot.replace(/\\/g, '/'))}/${rel}`);

// Exclude ONLY our repo's backend/server paths. Do not block node_modules.
config.resolver.blockList = exclusionList([
  R('src/server\\.js$'),
  R('server\\.js$'),
  R('backend/.*'),
  R('backup-files/.*'),
  R('routes/.*'),
  R('models/.*'),
  R('hell$'),
  R('tatus$')
]);

// Ensure only mobile app files are included
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Prefer React Native/browser fields when resolving packages
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

module.exports = config;
