#!/usr/bin/env node
/**
 * Environment validation script for deployment
 * Run this to check if all required environment variables are set
 */

const requiredEnvVars = [
  'JWT_SECRET',
  'MONGODB_URI',
  'EMAIL_USER',
  'EMAIL_PASS'
];

const optionalEnvVars = [
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_REGION',
  'AWS_S3_BUCKET'
];

console.log('🔍 Checking environment variables...\n');

let missingRequired = [];
let presentOptional = [];

// Check required variables
requiredEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    missingRequired.push(varName);
    console.log(`❌ ${varName}: Missing (REQUIRED)`);
  } else {
    // Mask sensitive values
    const maskedValue = ['JWT_SECRET', 'EMAIL_PASS', 'AWS_SECRET_ACCESS_KEY'].includes(varName) 
      ? value.substring(0, 4) + '...' 
      : value;
    console.log(`✅ ${varName}: ${maskedValue}`);
  }
});

console.log('\n📋 Optional variables:');

// Check optional variables
optionalEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    presentOptional.push(varName);
    const maskedValue = ['AWS_SECRET_ACCESS_KEY'].includes(varName) 
      ? value.substring(0, 4) + '...' 
      : value;
    console.log(`✅ ${varName}: ${maskedValue}`);
  } else {
    console.log(`⚪ ${varName}: Not set (optional)`);
  }
});

console.log('\n📊 Summary:');
console.log(`Required variables: ${requiredEnvVars.length - missingRequired.length}/${requiredEnvVars.length} present`);
console.log(`Optional variables: ${presentOptional.length}/${optionalEnvVars.length} present`);

if (missingRequired.length > 0) {
  console.log('\n❌ Missing required environment variables:');
  missingRequired.forEach(varName => {
    console.log(`  - ${varName}`);
  });
  console.log('\n💡 Set these variables before starting the server!');
  process.exit(1);
} else {
  console.log('\n✅ All required environment variables are set!');
  
  // Additional checks
  console.log('\n🔧 Additional validation:');
  
  // Check JWT_SECRET strength
  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret && jwtSecret.length < 32) {
    console.log('⚠️  JWT_SECRET should be at least 32 characters long for security');
  } else {
    console.log('✅ JWT_SECRET length is adequate');
  }
  
  // Check DOMAIN format
  const domain = process.env.DOMAIN;
  if (domain && !domain.startsWith('http')) {
    console.log('⚠️  DOMAIN should start with http:// or https://');
  } else {
    console.log('✅ DOMAIN format looks correct');
  }
  
  process.exit(0);
}
