// Test Email Configuration
import dotenv from 'dotenv';
import emailService from './src/services/emailService.js';

// Load environment variables
dotenv.config();

// Show email configuration (sanitized)
console.log('Email Configuration:');
console.log('- Host:', process.env.MAIL_SERVER || process.env.SMTP_HOST);
console.log('- Port:', process.env.MAIL_PORT || process.env.SMTP_PORT);
console.log('- Secure:', process.env.SMTP_SECURE === 'true' || process.env.MAIL_SSL_TLS === 'True');
console.log('- Username:', process.env.MAIL_USERNAME || process.env.SMTP_USER);
console.log('- Password:', (process.env.MAIL_PASSWORD || process.env.SMTP_PASS) ? '******' : 'Not set');
console.log('- From Email:', process.env.MAIL_FROM || process.env.FROM_EMAIL);
console.log('- Domain:', process.env.DOMAIN);

// Test email connection
async function testConnection() {
  try {
    console.log('\nTesting email connection...');
    await emailService.testConnection();
    console.log('✅ Email connection test SUCCESSFUL');
    return true;
  } catch (error) {
    console.error('❌ Email connection test FAILED:', error);
    return false;
  }
}

// Send test email
async function sendTestEmail() {
  try {
    const testEmail = process.env.MAIL_USERNAME || process.env.SMTP_USER;
    if (!testEmail) {
      console.error('❌ No test email address available');
      return;
    }
    
    console.log(`\nSending test email to ${testEmail}...`);
    await emailService.sendEmail({
      to: testEmail,
      subject: 'TaskM Email Test',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>TaskM Email Test</h2>
          <p>This is a test email from TaskM.</p>
          <p>If you're seeing this, your email configuration is working!</p>
          <p>Time: ${new Date().toISOString()}</p>
        </div>
      `
    });
    console.log('✅ Test email sent successfully');
  } catch (error) {
    console.error('❌ Failed to send test email:', error);
  }
}

// Run tests
async function runTests() {
  const connectionSuccessful = await testConnection();
  if (connectionSuccessful) {
    await sendTestEmail();
  }
}

runTests();
