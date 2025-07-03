// Test SMTP email configuration
import dotenv from 'dotenv';
import emailService from './src/services/emailService.js';

// Load environment variables
dotenv.config();

// First test the SMTP connection
const testSMTPConnection = async () => {
  console.log('Testing SMTP connection...');
  await emailService.testConnection();
};

// Test sending an actual email
const testSendingEmail = async () => {
  const testEmail = process.env.TEST_EMAIL || process.env.SMTP_USER; // Use provided test email or default to SMTP user
  
  if (!testEmail) {
    console.error('❌ No test email specified. Set TEST_EMAIL in your .env file or provide it as an argument.');
    process.exit(1);
  }
  
  console.log(`Attempting to send a test email to ${testEmail}...`);
  
  try {
    // Create a fake token for testing
    const testToken = 'test-token-' + Math.random().toString(36).substring(2, 15);
    
    // Send the email
    const result = await emailService.sendVerificationEmail(testEmail, testToken);
    console.log('✅ Test email sent successfully!');
    console.log('Message ID:', result.messageId);
  } catch (error) {
    console.error('❌ Failed to send test email:', error);
  }
};

// Execute tests
const runTests = async () => {
  console.log('==========================================');
  console.log('       SMTP EMAIL TESTING UTILITY        ');
  console.log('==========================================');
  console.log('Environment Variables:');
  console.log('- SMTP_HOST:', process.env.SMTP_HOST);
  console.log('- SMTP_PORT:', process.env.SMTP_PORT);
  console.log('- SMTP_SECURE:', process.env.SMTP_SECURE);
  console.log('- FROM_EMAIL:', process.env.FROM_EMAIL);
  console.log('- DOMAIN:', process.env.DOMAIN);
  console.log('==========================================');
  
  // Test connection
  await testSMTPConnection();
  
  // Test sending email
  await testSendingEmail();
};

runTests()
  .then(() => {
    console.log('==========================================');
    console.log('           TESTING COMPLETED             ');
    console.log('==========================================');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error during testing:', error);
    process.exit(1);
  });
