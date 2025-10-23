module.exports = {
  expo: {
    android: {
      usesCleartextTraffic: true,  // Allow HTTP traffic for development
      package: "com.glamora.app",
    },
    extra: {
      eas: {
        projectId: "e939fc72-a48a-4a32-bd3b-017e22cdb406"
      }
    }
    // ... rest of your expo config
  }
};

