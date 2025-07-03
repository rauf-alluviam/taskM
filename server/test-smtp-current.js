// SMTP Testing Utility using current MAIL_ environment variables
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

// Load environment variables
dotenv.config();

console.log('==========================================');
console.log('        SMTP EMAIL TESTING UTILITY       ');
console.log('==========================================');
console.log('Date:', new Date().toISOString());
console.log('Node version:', process.version);

// Print current mail configuration
console.log('Current Mail Configuration:');
console.log('- MAIL_SERVER:', process.env.MAIL_SERVER);
console.log('- MAIL_PORT:', process.env.MAIL_PORT);
console.log('- MAIL_USERNAME:', process.env.MAIL_USERNAME);
console.log('- MAIL_PASSWORD:', process.env.MAIL_PASSWORD ? '********' : 'Not set');
console.log('- MAIL_FROM:', process.env.MAIL_FROM);
console.log('- MAIL_STARTTLS:', process.env.MAIL_STARTTLS);
console.log('- MAIL_SSL_TLS:', process.env.MAIL_SSL_TLS);
console.log('- MAIL_FROM_NAME:', process.env.MAIL_FROM_NAME);
console.log('==========================================');

// Create transporter with the MAIL_ configuration
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_SERVER,
  port: parseInt(process.env.MAIL_PORT),
  secure: process.env.MAIL_SSL_TLS === 'True',
  auth: {
    user: process.env.MAIL_USERNAME,
    pass: process.env.MAIL_PASSWORD,
  },
  tls: {
    ciphers: 'SSLv3',
    rejectUnauthorized: false
  },
  debug: true, // Show debug output
  logger: true  // Log information into console
});

// Test SMTP configuration
const testSMTP = async () => {
  if (!process.env.MAIL_SERVER || !process.env.MAIL_USERNAME || !process.env.MAIL_PASSWORD) {
    console.error('❌ Missing required mail configuration. Please check your .env file.');
    process.exit(1);
  }

  // Verify connection
  console.log('Testing SMTP connection...');
  try {
    await transporter.verify();
    console.log('✅ SMTP connection successful!');
  } catch (error) {
    console.error('❌ SMTP connection failed:', error);
    console.log('Details:', JSON.stringify(error, null, 2));
    process.exit(1);
  }

  // Get recipient email (use MAIL_FROM as default for testing)
  const recipientEmail = process.argv[2] || process.env.MAIL_FROM;
  
  // Send test email
  console.log(`Sending test email to ${recipientEmail}...`);
  try {
    const testId = Math.random().toString(36).substring(2, 10);
    
    const mailOptions = {
      from: `"${process.env.MAIL_FROM_NAME}" <${process.env.MAIL_FROM}>`,
      to: recipientEmail,
      subject: `Test Email - SMTP Verification ${testId}`,
      text: `This is a test email to verify SMTP configuration. Test ID: ${testId}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>SMTP Test Email</h2>
          <p>This is a test email to verify that your SMTP configuration is working correctly.</p>
          <p>Test ID: ${testId}</p>
          <p>Sent at: ${new Date().toLocaleString()}</p>
          <p><em>This is only a test message. No action is required.</em></p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Test email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
  } catch (error) {
    console.error('❌ Failed to send test email:', error);
    console.log('Details:', JSON.stringify(error, null, 2));
  }
};

// Run the test
testSMTP()
  .then(() => {
    console.log('==========================================');
    console.log('           TESTING COMPLETED             ');
    console.log('==========================================');
    process.exit(0);
  })
  .catch(error => {
    console.error('Unhandled error during testing:', error);
    process.exit(1);
  });
