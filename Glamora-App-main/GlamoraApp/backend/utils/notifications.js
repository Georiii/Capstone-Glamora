/**
 * Expo Push Notification Utility
 * Sends push notifications to users via Expo Push Notification Service
 */

const https = require('https');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Send push notification to a single device token
 * @param {string} token - Expo push token
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Additional data payload
 * @returns {Promise<object>} Response from Expo API
 */
async function sendPushNotification(token, title, body, data = {}) {
  const message = {
    to: token,
    sound: 'default',
    title,
    body,
    data,
    priority: 'high',
    channelId: 'default',
  };

  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(message);
    
    const options = {
      hostname: 'exp.host',
      port: 443,
      path: '/--/api/v2/push/send',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
    };

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          if (parsed.data && parsed.data.status === 'ok') {
            resolve(parsed);
          } else {
            reject(new Error(`Expo push failed: ${JSON.stringify(parsed)}`));
          }
        } catch (error) {
          reject(new Error(`Failed to parse Expo response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Expo push request failed: ${error.message}`));
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Send push notification to multiple device tokens
 * @param {string[]} tokens - Array of Expo push tokens
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Additional data payload
 * @returns {Promise<object>} Response from Expo API
 */
async function sendPushNotifications(tokens, title, body, data = {}) {
  if (!tokens || tokens.length === 0) {
    return { success: 0, failed: 0 };
  }

  const messages = tokens.map(token => ({
    to: token,
    sound: 'default',
    title,
    body,
    data,
    priority: 'high',
    channelId: 'default',
  }));

  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(messages);
    
    const options = {
      hostname: 'exp.host',
      port: 443,
      path: '/--/api/v2/push/send',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
    };

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          if (Array.isArray(parsed.data)) {
            const success = parsed.data.filter(r => r.status === 'ok').length;
            const failed = parsed.data.filter(r => r.status !== 'ok').length;
            resolve({ success, failed, responses: parsed.data });
          } else {
            reject(new Error(`Invalid Expo response format: ${JSON.stringify(parsed)}`));
          }
        } catch (error) {
          reject(new Error(`Failed to parse Expo response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Expo push request failed: ${error.message}`));
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Send notification to a user based on their preferences
 * @param {object} user - User document from MongoDB
 * @param {string} type - Notification type: 'messages', 'announcements', 'subscription', 'punishments'
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Additional data payload
 * @returns {Promise<object>} Result of sending notifications
 */
async function sendNotificationToUser(user, type, title, body, data = {}) {
  // Check if notifications are enabled
  if (!user.notificationPreferences || !user.notificationPreferences.enabled) {
    return { success: 0, failed: 0, reason: 'Notifications disabled globally' };
  }

  // Check if this notification type is enabled
  if (!user.notificationPreferences[type]) {
    return { success: 0, failed: 0, reason: `Notification type ${type} disabled` };
  }

  // Get device tokens
  if (!user.deviceTokens || user.deviceTokens.length === 0) {
    return { success: 0, failed: 0, reason: 'No device tokens registered' };
  }

  const tokens = user.deviceTokens.map(dt => dt.token).filter(Boolean);
  
  if (tokens.length === 0) {
    return { success: 0, failed: 0, reason: 'No valid device tokens' };
  }

  try {
    const result = await sendPushNotifications(tokens, title, body, data);
    return result;
  } catch (error) {
    console.error(`Error sending notification to user ${user._id}:`, error);
    return { success: 0, failed: tokens.length, error: error.message };
  }
}

module.exports = {
  sendPushNotification,
  sendPushNotifications,
  sendNotificationToUser,
};

