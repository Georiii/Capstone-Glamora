module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Expo Router transforms
      'expo-router/babel',
      // Keep Reanimated plugin last
      [
        'module-resolver',
        {
          root: ['./'],
          extensions: ['.ios.js', '.android.js', '.js', '.jsx', '.json', '.ts', '.tsx'],
        },
      ],
      'react-native-reanimated/plugin'
    ],
  };
};
