const brevo = require('@getbrevo/brevo');

// Initialize Brevo API client
const apiInstance = new brevo.TransactionalEmailsApi();
const apiKey = apiInstance.authentications['apiKey'];
apiKey.apiKey = process.env.BREVO_API_KEY || 'your-brevo-api-key-here';

/**
 * Send password reset email via Brevo
 * @param {string} toEmail - Recipient email address
 * @param {string} resetToken - Password reset token
 * @param {string} userName - User's name (optional)
 */
async function sendPasswordResetEmail(toEmail, resetToken, userName = 'User') {
  try {
    // Create reset link (web page that redirects to app)
    // Always use Render URL for consistency
    const baseUrl = process.env.BASE_URL || 'https://glamora-g5my.onrender.com';
    const resetLink = `${baseUrl}/reset-password-redirect?token=${resetToken}`;
    
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    
    sendSmtpEmail.subject = 'Glamora - Reset Your Password';
    sendSmtpEmail.to = [{ email: toEmail, name: userName }];
    sendSmtpEmail.sender = { 
      name: 'Glamora', 
      email: 'aanciafo@gmail.com' // Use verified sender email from Brevo
    };
    
    // HTML email template
    sendSmtpEmail.htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: #F4C2C2;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
          }
          .header h1 {
            color: white;
            margin: 0;
            font-size: 28px;
          }
          .content {
            background-color: #fff;
            padding: 40px 30px;
            border: 1px solid #e0e0e0;
          }
          .button {
            display: inline-block;
            padding: 15px 40px;
            background-color: #FFE8C8;
            color: #000;
            text-decoration: none;
            border-radius: 25px;
            font-weight: bold;
            margin: 20px 0;
            text-align: center;
          }
          .button:hover {
            background-color: #ffd9a8;
          }
          .footer {
            background-color: #f9f9f9;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #666;
            border-radius: 0 0 10px 10px;
          }
          .warning {
            background-color: #fff3cd;
            border: 1px solid #ffc107;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🌟 Glamora</h1>
        </div>
        <div class="content">
          <h2>Password Reset Request</h2>
          <p>Hi ${userName},</p>
          <p>We received a request to reset your password for your Glamora account. Click the button below to create a new password:</p>
          
          <div style="text-align: center;">
            <a href="${resetLink}" class="button">Reset Your Password</a>
          </div>
          
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #4B2E2B; background-color: #f5f5f5; padding: 10px; border-radius: 5px;">
            ${resetLink}
          </p>
          
          <div class="warning">
            <strong>⚠️ Security Notice:</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>This link will expire in 1 hour</li>
              <li>If you didn't request this reset, please ignore this email</li>
              <li>Your password won't change until you create a new one</li>
            </ul>
          </div>
          
          <p>Need help? Contact our support team at support@glamora.com</p>
          
          <p>Best regards,<br>
          <strong>The Glamora Team</strong></p>
        </div>
        <div class="footer">
          <p>© 2025 Glamora. All rights reserved.</p>
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </body>
      </html>
    `;
    
    // Plain text version for email clients that don't support HTML
    sendSmtpEmail.textContent = `
      Hi ${userName},
      
      We received a request to reset your password for your Glamora account.
      
      Click the link below to create a new password:
      ${resetLink}
      
      This link will expire in 1 hour.
      
      If you didn't request this reset, please ignore this email.
      Your password won't change until you create a new one.
      
      Best regards,
      The Glamora Team
      
      © 2025 Glamora. All rights reserved.
    `;
    
    // Send email
    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('✅ Password reset email sent successfully:', data);
    return { success: true, messageId: data.messageId };
    
  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
}

/**
 * Send email change verification PIN via Brevo
 * @param {string} toEmail - Recipient email address (old email)
 * @param {string} pin - 6-digit verification PIN
 * @param {string} userName - User's name (optional)
 * @param {string} newEmail - New email address being requested
 */
async function sendEmailChangePin(toEmail, pin, userName = 'User', newEmail) {
  try {
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    
    sendSmtpEmail.subject = 'Glamora - Email Change Verification Code';
    sendSmtpEmail.to = [{ email: toEmail, name: userName }];
    sendSmtpEmail.sender = { 
      name: 'Glamora', 
      email: 'aanciafo@gmail.com' // Use verified sender email from Brevo
    };
    
    // HTML email template
    sendSmtpEmail.htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: #F4C2C2;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
          }
          .header h1 {
            color: white;
            margin: 0;
            font-size: 28px;
          }
          .content {
            background-color: #fff;
            padding: 40px 30px;
            border: 1px solid #e0e0e0;
          }
          .pin-box {
            background-color: #F4C2C2;
            color: #000;
            font-size: 36px;
            font-weight: bold;
            text-align: center;
            padding: 20px;
            border-radius: 10px;
            letter-spacing: 8px;
            margin: 30px 0;
          }
          .footer {
            background-color: #f9f9f9;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #666;
            border-radius: 0 0 10px 10px;
          }
          .warning {
            background-color: #fff3cd;
            border: 1px solid #ffc107;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🌟 Glamora</h1>
        </div>
        <div class="content">
          <h2>Email Change Verification</h2>
          <p>Hi ${userName},</p>
          <p>We received a request to change your email address from <strong>${toEmail}</strong> to <strong>${newEmail}</strong>.</p>
          <p>Please enter the following verification code in the app to confirm this change:</p>
          
          <div class="pin-box">${pin}</div>
          
          <div class="warning">
            <strong>⚠️ Security Notice:</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>This code will expire in 10 minutes</li>
              <li>If you didn't request this change, please ignore this email</li>
              <li>Your email won't change until you enter the verification code</li>
            </ul>
          </div>
          
          <p>Need help? Contact our support team at support@glamora.com</p>
          
          <p>Best regards,<br>
          <strong>The Glamora Team</strong></p>
        </div>
        <div class="footer">
          <p>© 2025 Glamora. All rights reserved.</p>
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </body>
      </html>
    `;
    
    // Plain text version for email clients that don't support HTML
    sendSmtpEmail.textContent = `
      Hi ${userName},
      
      We received a request to change your email address from ${toEmail} to ${newEmail}.
      
      Please enter the following verification code in the app to confirm this change:
      
      Verification Code: ${pin}
      
      This code will expire in 10 minutes.
      
      If you didn't request this change, please ignore this email.
      Your email won't change until you enter the verification code.
      
      Best regards,
      The Glamora Team
      
      © 2025 Glamora. All rights reserved.
    `;
    
    // Send email
    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('✅ Email change PIN sent successfully:', data);
    return { success: true, messageId: data.messageId };
    
  } catch (error) {
    console.error('❌ Error sending email change PIN:', error);
    throw new Error('Failed to send email change verification code');
  }
}

/**
 * Send rating/feedback email to admin
 * @param {Object} payload
 * @param {number} payload.stars - 1..5
 * @param {string} [payload.feedback] - Optional feedback text
 * @param {string} [payload.userEmail] - Optional user email
 * @param {string} [payload.userId] - Optional user id
 * @param {string} [payload.platform] - 'ios' | 'android' | 'web'
 * @param {string} [payload.appVersion] - Optional app version
 * @param {string} [payload.deviceModel] - Optional device model
 * @param {string} [payload.sentTo] - Destination email (admin)
 */
async function sendRatingFeedbackEmail({
  stars,
  feedback = '',
  userEmail = '',
  userId = '',
  platform = '',
  appVersion = '',
  deviceModel = '',
  sentTo = 'glamoraapp.customer.service@gmail.com'
}) {
  const rating = Math.max(1, Math.min(5, Number(stars) || 1));
  const starSymbols = '★★★★★'.slice(0, rating).padEnd(5, '☆');
  const priorityPrefix = rating <= 2 ? '⚠️' : rating === 3 ? 'ℹ️' : '✅';
  const subject = `${priorityPrefix} Glamora - New ${rating}-Star Rating (${starSymbols})`;

  const sendSmtpEmail = new brevo.SendSmtpEmail();
  sendSmtpEmail.subject = subject;
  sendSmtpEmail.to = [{ email: sentTo, name: 'Glamora Admin' }];
  sendSmtpEmail.sender = {
    name: 'Glamora Feedback',
    email: 'aanciafo@gmail.com'
  };

  const submittedAt = new Date().toISOString();
  const safeFeedback = feedback && feedback.trim().length > 0 ? feedback.trim() : '(No comment provided)';

  sendSmtpEmail.htmlContent = `
    <!DOCTYPE html>
    <html>
      <body style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
        <h2 style="margin-top:0;">New Rating Submitted</h2>
        <p><strong>Stars:</strong> ${starSymbols} (${rating}/5)</p>
        <p><strong>Comment:</strong><br/>${safeFeedback.replace(/\n/g, '<br/>')}</p>
        <hr/>
        <p><strong>User Email:</strong> ${userEmail || '(unknown)'}<br/>
           <strong>User ID:</strong> ${userId || '(unknown)'}<br/>
           <strong>Platform:</strong> ${platform || '(unknown)'}<br/>
           <strong>App Version:</strong> ${appVersion || '(unknown)'}<br/>
           <strong>Device Model:</strong> ${deviceModel || '(unknown)'}<br/>
           <strong>Submitted At:</strong> ${submittedAt}</p>
      </body>
    </html>
  `;

  sendSmtpEmail.textContent = `
New Rating Submitted

Stars: ${rating}/5
Comment:
${safeFeedback}

User Email: ${userEmail || '(unknown)'}
User ID: ${userId || '(unknown)'}
Platform: ${platform || '(unknown)'}
App Version: ${appVersion || '(unknown)'}
Device Model: ${deviceModel || '(unknown)'}
Submitted At: ${submittedAt}
  `;

  const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
  return { success: true, messageId: data.messageId };
}

module.exports = {
  sendPasswordResetEmail,
  sendEmailChangePin,
  sendRatingFeedbackEmail
};
