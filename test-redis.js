// Test Redis Connection
// Run: node test-redis.js

require('dotenv').config();
const Redis = require('ioredis');

async function testRedisConnection() {
  console.log('🔍 Testing Redis connection...\n');
  
  const redisUrl = process.env.REDIS_URL;
  
  if (!redisUrl) {
    console.error('❌ REDIS_URL not found in .env file');
    console.log('📝 Please add to .env:');
    console.log('   ENABLE_REDIS=true');
    console.log('   REDIS_URL=redis://default:password@host:port');
    process.exit(1);
  }
  
  console.log('📡 Connecting to:', redisUrl.replace(/:[^:]*@/, ':***@')); // Hide password
  
  try {
    const redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false
    });
    
    // Test ping
    console.log('📤 Sending PING...');
    const pong = await redis.ping();
    console.log('✅ Response:', pong);
    
    // Test set/get
    console.log('\n📤 Testing SET operation...');
    await redis.set('test:key', 'Hello from AI Fashion Extractor!');
    console.log('✅ SET successful');
    
    console.log('📤 Testing GET operation...');
    const value = await redis.get('test:key');
    console.log('✅ GET result:', value);
    
    // Test delete
    console.log('📤 Testing DEL operation...');
    await redis.del('test:key');
    console.log('✅ DEL successful');
    
    // Get info
    console.log('\n📊 Redis Info:');
    const info = await redis.info('server');
    const version = info.match(/redis_version:([^\r\n]+)/)?.[1];
    console.log('   Version:', version);
    
    const memory = await redis.info('memory');
    const usedMemory = memory.match(/used_memory_human:([^\r\n]+)/)?.[1];
    console.log('   Memory Used:', usedMemory);
    
    await redis.quit();
    
    console.log('\n🎉 All tests passed! Redis connection is working perfectly!');
    console.log('✅ You can now use Redis caching in your application.');
    
  } catch (error) {
    console.error('\n❌ Connection failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Check your REDIS_URL is correct');
    console.log('   2. Verify password is correct');
    console.log('   3. Check firewall allows connection');
    console.log('   4. Ensure Redis instance is running');
    console.log('   5. Try accessing Redis from their dashboard');
    process.exit(1);
  }
}

testRedisConnection();
