module.exports = {
  expo: {
    name: "GlamoraApp",
    slug: "glamora-app-main",
    android: {
      usesCleartextTraffic: true,  // Allow HTTP traffic for development
      package: "com.glamora.app",
    },
    extra: {
      eas: {
        projectId: "c50f9159-c5f3-4e50-a191-518ab1dc07ce"
      }
    },
    scheme: "glamora",
    linking: {
      prefixes: ['glamora://', 'https://glamora-g5my.onrender.com'],
      config: {
        screens: {
          ResetPassword: 'reset-password',
        },
      },
    },
    plugins: [
      [
        "expo-camera",
        {
          "cameraPermission": "Allow $(PRODUCT_NAME) to access your camera."
        }
      ]
    ]
    // ... rest of your expo config
  }
};

