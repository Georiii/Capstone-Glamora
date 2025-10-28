module.exports = {
  expo: {
    name: "GlamoraApp",
    slug: "glamora-app-main",
    plugins: [
      'expo-router'
    ],
    android: {
      usesCleartextTraffic: true,  // Allow HTTP traffic for development
      package: "com.glamora.app",
    },
    extra: {
      eas: {
        projectId: "c50f9159-c5f3-4e50-a191-518ab1dc07ce"
      }
    }
    // ... rest of your expo config
  }
};

