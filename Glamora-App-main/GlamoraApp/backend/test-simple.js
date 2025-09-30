const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('./config/database');

console.log('🔑 JWT_SECRET:', JWT_SECRET);

// Test token generation
const testUserId = 'test123';
const token = jwt.sign({ userId: testUserId }, JWT_SECRET, { expiresIn: '7d' });
console.log('✅ Test token generated:', token.substring(0, 20) + '...');

// Test token verification
try {
  const decoded = jwt.verify(token, JWT_SECRET);
  console.log('✅ Token verified successfully!');
  console.log('👤 User ID:', decoded.userId);
} catch (err) {
  console.error('❌ Token verification failed:', err.message);
}
