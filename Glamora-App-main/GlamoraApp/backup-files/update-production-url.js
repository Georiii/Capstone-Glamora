const fs = require('fs');
const path = require('path');
const { fileURLToPath } = require('url');

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to update the production URL in config.ts
function updateProductionURL(newURL) {
  const configPath = path.join(__dirname, 'app', 'config.ts');
  
  try {
    let content = fs.readFileSync(configPath, 'utf8');
    
    // Update the production URL
    content = content.replace(
      /return 'https:\/\/[^']+'; \/\/ You'll update this after deployment/,
      `return '${newURL}'; // Production URL`
    );
    
    fs.writeFileSync(configPath, content);
    console.log(`✅ Updated production URL to: ${newURL}`);
    console.log('💡 Your app will now use the cloud backend for APK builds!');
  } catch (error) {
    console.error('❌ Error updating config:', error.message);
  }
}

// Get URL from command line argument
const newURL = process.argv[2];

if (!newURL) {
  console.log('Usage: node update-production-url.js <your-railway-url>');
  console.log('Example: node update-production-url.js https://glamora-backend.railway.app');
  process.exit(1);
}

updateProductionURL(newURL); 