const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Treat .wasm files as assets so Metro bundles them correctly for web
config.resolver.assetExts.push('wasm');

module.exports = config;
