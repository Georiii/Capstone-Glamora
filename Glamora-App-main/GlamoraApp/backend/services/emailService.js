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

module.exports = {
  sendPasswordResetEmail
};
