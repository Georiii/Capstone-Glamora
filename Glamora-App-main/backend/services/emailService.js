const SibApiV3Sdk = require('sib-api-v3-sdk');
const defaultClient = SibApiV3Sdk.ApiClient.instance;

// Configure API key
const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY || '';

// Initialize API instance
const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

// Base URL for confirmation links (use environment variable or default to Render URL)
const BASE_URL = process.env.BASE_URL || process.env.RENDER_URL || 'https://glamora-g5my.onrender.com';

/**
 * Send email change confirmation email
 * @param {Object} user - Current user object
 * @param {string} newEmail - New email address to change to
 * @param {string} token - JWT token for email confirmation
 * @returns {Promise}
 */
const sendEmailChangeConfirmation = async (user, newEmail, token) => {
  try {
    if (!process.env.BREVO_API_KEY) {
      console.error('❌ BREVO_API_KEY not configured');
      throw new Error('Email service not configured');
    }

    const confirmationUrl = `${BASE_URL}/api/auth/confirm-email-change?token=${token}`;
    const senderEmail = process.env.BREVO_SENDER_EMAIL || 'noreply@glamora.com';
    const senderName = process.env.BREVO_SENDER_NAME || 'Glamora Security';

    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    
    sendSmtpEmail.sender = { name: senderName, email: senderEmail };
    sendSmtpEmail.to = [{ email: user.email, name: user.name || 'User' }];
    sendSmtpEmail.subject = 'Confirm Your Email Change Request';
    sendSmtpEmail.htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #F4C2C2; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
            .button { 
              display: inline-block; 
              padding: 12px 24px; 
              background-color: #8B4513; 
              color: #fff; 
              text-decoration: none; 
              border-radius: 6px; 
              margin: 20px 0;
            }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .warning { color: #d32f2f; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="color: #4B2E2B; margin: 0;">Glamora Security</h1>
            </div>
            <div class="content">
              <h2>Email Change Confirmation</h2>
              <p>Hello ${user.name || 'User'},</p>
              <p>You have requested to change your email address from <strong>${user.email}</strong> to <strong>${newEmail}</strong>.</p>
              <p>To confirm this change, please click the button below:</p>
              <div style="text-align: center;">
                <a href="${confirmationUrl}" class="button">Confirm Email Change</a>
              </div>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #666; font-size: 12px;">${confirmationUrl}</p>
              <p class="warning">⚠️ This link will expire in 15 minutes.</p>
              <p>If you did not request this change, please ignore this email or contact support.</p>
            </div>
            <div class="footer">
              <p>This is an automated message from Glamora. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('✅ Email change confirmation sent:', result.messageId);
    return result;
  } catch (error) {
    console.error('❌ Error sending email change confirmation:', error);
    throw error;
  }
};

/**
 * Send email change success notification
 * @param {Object} user - User object with updated email
 * @param {string} oldEmail - Previous email address
 * @returns {Promise}
 */
const sendEmailChangeSuccess = async (user, oldEmail) => {
  try {
    if (!process.env.BREVO_API_KEY) {
      console.error('❌ BREVO_API_KEY not configured');
      throw new Error('Email service not configured');
    }

    const senderEmail = process.env.BREVO_SENDER_EMAIL || 'noreply@glamora.com';
    const senderName = process.env.BREVO_SENDER_NAME || 'Glamora Security';

    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    
    sendSmtpEmail.sender = { name: senderName, email: senderEmail };
    sendSmtpEmail.to = [{ email: user.email, name: user.name || 'User' }];
    sendSmtpEmail.subject = 'Email Successfully Updated';
    sendSmtpEmail.htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
            .success { color: #4CAF50; font-weight: bold; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="color: #fff; margin: 0;">✅ Email Updated</h1>
            </div>
            <div class="content">
              <h2>Email Change Confirmed</h2>
              <p>Hello ${user.name || 'User'},</p>
              <p class="success">Your email address has been successfully updated!</p>
              <p><strong>Previous email:</strong> ${oldEmail}</p>
              <p><strong>New email:</strong> ${user.email}</p>
              <p>You can now use your new email address to log in to your Glamora account.</p>
              <p>If you did not make this change, please contact support immediately.</p>
            </div>
            <div class="footer">
              <p>This is an automated message from Glamora. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('✅ Email change success notification sent:', result.messageId);
    return result;
  } catch (error) {
    console.error('❌ Error sending email change success notification:', error);
    throw error;
  }
};

module.exports = {
  sendEmailChangeConfirmation,
  sendEmailChangeSuccess
};

