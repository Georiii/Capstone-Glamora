const { getDefaultConfig } = require('expo/metro-config');
const exclusionList = require('metro-config/src/defaults/exclusionList');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Compute absolute repo root (parent of GlamoraApp)
const repoRoot = path.resolve(__dirname, '..');
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const R = (rel) => new RegExp(`^${escapeRegExp(repoRoot.replace(/\\/g, '/'))}/${rel}`);

// Exclude ONLY repo-level backend and web folders from being bundled
// Paths are relative to repoRoot (parent of GlamoraApp)
config.resolver.blockList = exclusionList([
  R('src/server\\.js$'),
  R('server\\.js$'),
  R('backend/.*'),
  R('routes/.*'),
  R('models/.*'),
  R('admin-side/.*'),
  R('backup-files/.*')
]);

// Prevent resolving parent node_modules to avoid duplicate RN libraries
config.resolver.disableHierarchicalLookup = true;

// Enable package.json "exports" field for modern packages
config.resolver.unstable_enablePackageExports = true;

// Remove forced extraNodeModules to let Metro resolve peer deps like
// @react-native/virtualized-lists from react-native
delete config.resolver.extraNodeModules;

// Allow default nodeModulesPaths (don't lock to app only)
delete config.resolver.nodeModulesPaths;

// Ensure only mobile app files are included
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Prefer React Native/browser fields when resolving packages
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

module.exports = config;
