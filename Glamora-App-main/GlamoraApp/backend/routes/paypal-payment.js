const express = require('express');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/database');
const User = require('../models/User');
const { getSubscriptionDetails } = require('../utils/paypal');

const router = express.Router();

function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'No token provided.' });
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Invalid token.' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    const message = err.name === 'TokenExpiredError'
      ? 'Token expired.'
      : 'Invalid or expired token.';
    return res.status(401).json({ message });
  }
}

// PayPal Hosted Button Payment Page
router.get('/subscribe', (req, res) => {
  const { token } = req.query;
  
  if (!token) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Glamora - Payment Error</title>
        <style>
          body {
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #F4C2C2 0%, #FFE8C8 100%);
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
          }
          .error-container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            text-align: center;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
        </style>
      </head>
      <body>
        <div class="error-container">
          <h2>Payment Error</h2>
          <p>Authentication token is required. Please try again from the app.</p>
        </div>
      </body>
      </html>
    `);
  }

  // Store token in session/cookie for return URL verification
  // For simplicity, we'll pass it in the return URL
  const returnUrl = `${req.protocol}://${req.get('host')}/api/paypal/return?token=${encodeURIComponent(token)}`;
  const cancelUrl = `${req.protocol}://${req.get('host')}/api/paypal/cancel?token=${encodeURIComponent(token)}`;

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Glamora PLUS - Subscribe</title>
      <script
        src="https://www.paypal.com/sdk/js?client-id=BAA-Wz2QCLv9U0CIMn3W0fQn8M_geylGEyQR6DPGuxGB_kQgcZ8ByNo_T0fLPhbLlUCNyRzZg5fopMDEJ0&components=hosted-buttons&disable-funding=venmo&currency=PHP">
      </script>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: linear-gradient(135deg, #F4C2C2 0%, #FFE8C8 100%);
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px;
        }
        .container {
          background: white;
          border-radius: 15px;
          padding: 40px;
          max-width: 500px;
          width: 100%;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          text-align: center;
        }
        h1 {
          color: #333;
          margin-bottom: 10px;
          font-size: 28px;
        }
        .subtitle {
          color: #666;
          margin-bottom: 30px;
          font-size: 16px;
        }
        .features {
          text-align: left;
          margin: 30px 0;
          padding: 20px;
          background: #f9f9f9;
          border-radius: 10px;
        }
        .features ul {
          list-style: none;
          padding: 0;
        }
        .features li {
          padding: 8px 0;
          color: #555;
        }
        .features li:before {
          content: "✓ ";
          color: #4CAF50;
          font-weight: bold;
          margin-right: 8px;
        }
        #paypal-container-RYHV8BPKDJFCS {
          margin-top: 20px;
        }
        .loading {
          text-align: center;
          padding: 20px;
          color: #666;
        }
        .error {
          background: #ffebee;
          color: #c62828;
          padding: 15px;
          border-radius: 5px;
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Glamora PLUS</h1>
        <p class="subtitle">Unlock unlimited features</p>
        
        <div class="features">
          <ul>
            <li>Unlimited wardrobe storage</li>
            <li>Unlimited outfit suggestions</li>
            <li>Priority support</li>
            <li>Premium features</li>
          </ul>
        </div>

        <div id="paypal-container-RYHV8BPKDJFCS"></div>
        <div id="loading" class="loading" style="display: none;">Processing payment...</div>
        <div id="error" class="error" style="display: none;"></div>

        <script>
          (function() {
            if (typeof paypal === 'undefined') {
              document.getElementById('error').style.display = 'block';
              document.getElementById('error').textContent = 'Failed to load PayPal. Please refresh the page.';
              return;
            }

            try {
              paypal.HostedButtons({
                hostedButtonId: "RYHV8BPKDJFCS",
                onInit: function(data, actions) {
                  console.log('PayPal button initialized');
                },
                onClick: function(data, actions) {
                  document.getElementById('loading').style.display = 'block';
                },
                onError: function(err) {
                  document.getElementById('loading').style.display = 'none';
                  document.getElementById('error').style.display = 'block';
                  document.getElementById('error').textContent = 'Payment error: ' + (err.message || 'Unknown error');
                  console.error('PayPal error:', err);
                }
              }).render("#paypal-container-RYHV8BPKDJFCS");
            } catch (err) {
              document.getElementById('error').style.display = 'block';
              document.getElementById('error').textContent = 'Failed to initialize PayPal button: ' + err.message;
              console.error('PayPal initialization error:', err);
            }
          })();
        </script>
      </div>
    </body>
    </html>
  `);
});

// Return URL handler - PayPal redirects here after successful payment
router.get('/return', async (req, res) => {
  const { token, PayerID, paymentId } = req.query;
  
  if (!token) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Glamora - Payment Error</title>
        <style>
          body {
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #F4C2C2 0%, #FFE8C8 100%);
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
          }
          .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            text-align: center;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Payment Error</h2>
          <p>Authentication token is missing. Please try again from the app.</p>
        </div>
      </body>
      </html>
    `);
  }

  try {
    // Verify token and get user
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Glamora - Payment Error</title>
          <style>
            body {
              margin: 0;
              padding: 20px;
              background: linear-gradient(135deg, #F4C2C2 0%, #FFE8C8 100%);
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
            }
            .container {
              background: white;
              padding: 30px;
              border-radius: 10px;
              text-align: center;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Payment Error</h2>
            <p>User not found. Please try again from the app.</p>
          </div>
        </body>
        </html>
      `);
    }

    // For hosted buttons, PayPal uses IPN (Instant Payment Notification)
    // The webhook will handle subscription activation
    // But we can also check if payment was successful here
    // Since hosted buttons don't provide subscription ID in return URL,
    // we'll rely on webhook to activate subscription
    
    // Show success page and redirect to app
    const appDeepLink = `glamora://premium?payment=success&token=${encodeURIComponent(token)}`;
    const webLink = `https://glamora-g5my.onrender.com/premium?payment=success`;

    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Glamora - Payment Successful</title>
        <style>
          body {
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #F4C2C2 0%, #FFE8C8 100%);
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
          }
          .container {
            background: white;
            padding: 40px;
            border-radius: 15px;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            max-width: 500px;
          }
          .success-icon {
            font-size: 64px;
            color: #4CAF50;
            margin-bottom: 20px;
          }
          h1 {
            color: #333;
            margin-bottom: 10px;
          }
          p {
            color: #666;
            margin-bottom: 20px;
          }
          .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #FFE8C8;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 20px auto;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success-icon">✓</div>
          <h1>Payment Successful!</h1>
          <p>Thank you for subscribing to Glamora PLUS!</p>
          <p>Your subscription is being activated. You will be redirected shortly...</p>
          <div class="spinner"></div>
        </div>
        <script>
          const appLink = '${appDeepLink}';
          const webLink = '${webLink}';
          
          // Try to open app first
          window.location.href = appLink;
          
          // Fallback to web after delay
          setTimeout(() => {
            window.location.href = webLink;
          }, 2000);
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Error processing payment return:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Glamora - Payment Error</title>
        <style>
          body {
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #F4C2C2 0%, #FFE8C8 100%);
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
          }
          .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            text-align: center;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Payment Processing Error</h2>
          <p>An error occurred while processing your payment. Please contact support if the issue persists.</p>
        </div>
      </body>
      </html>
    `);
  }
});

// Cancel URL handler
router.get('/cancel', (req, res) => {
  const { token } = req.query;
  
  const appDeepLink = `glamora://premium?payment=cancelled&token=${encodeURIComponent(token || '')}`;
  const webLink = `https://glamora-g5my.onrender.com/premium?payment=cancelled`;

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Glamora - Payment Cancelled</title>
      <style>
        body {
          margin: 0;
          padding: 20px;
          background: linear-gradient(135deg, #F4C2C2 0%, #FFE8C8 100%);
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
        }
        .container {
          background: white;
          padding: 40px;
          border-radius: 15px;
          text-align: center;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          max-width: 500px;
        }
        h1 {
          color: #333;
          margin-bottom: 10px;
        }
        p {
          color: #666;
          margin-bottom: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Payment Cancelled</h1>
        <p>You cancelled the payment. You will be redirected back to the app...</p>
      </div>
      <script>
        const appLink = '${appDeepLink}';
        const webLink = '${webLink}';
        
        // Try to open app first
        window.location.href = appLink;
        
        // Fallback to web after delay
        setTimeout(() => {
          window.location.href = webLink;
        }, 2000);
      </script>
    </body>
    </html>
  `);
});

module.exports = router;

