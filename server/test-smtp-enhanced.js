// Enhanced SMTP Testing Utility
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

// Load environment variables
dotenv.config();

// Print basic system information
console.log('==========================================');
console.log('    ENHANCED SMTP EMAIL TESTING UTILITY   ');
console.log('==========================================');
console.log('Date:', new Date().toISOString());
console.log('Node version:', process.version);

// Get environment variables or use defaults/override with command line args
const getConfig = () => {
  // Command line arguments override env variables
  const args = process.argv.slice(2);
  const argsObj = {};
  
  for (let i = 0; i < args.length; i += 2) {
    if (args[i].startsWith('--') && i + 1 < args.length) {
      const key = args[i].substring(2);
      argsObj[key] = args[i + 1];
    }
  }
  
  return {
    host: argsObj.host || process.env.SMTP_HOST || '',
    port: parseInt(argsObj.port || process.env.SMTP_PORT || '2525'),
    secure: (argsObj.secure || process.env.SMTP_SECURE || 'false') === 'true',
    user: argsObj.user || process.env.SMTP_USER || '',
    pass: argsObj.pass || process.env.SMTP_PASS || '',
    from: argsObj.from || process.env.FROM_EMAIL || '',
    to: argsObj.to || process.env.TEST_EMAIL || process.env.SMTP_USER || '',
    domain: argsObj.domain || process.env.DOMAIN || 'http://localhost:3000'
  };
};

// Test SMTP configuration
const testSMTP = async () => {
  const config = getConfig();
  
  console.log('Testing with configuration:');
  console.log('- SMTP_HOST:', config.host);
  console.log('- SMTP_PORT:', config.port);
  console.log('- SMTP_SECURE:', config.secure);
  console.log('- SMTP_USER:', config.user);
  console.log('- FROM_EMAIL:', config.from);
  console.log('- TO_EMAIL:', config.to);
  console.log('==========================================');

  if (!config.host || !config.user || !config.pass || !config.to) {
    console.error('❌ Missing required configuration. Please check your .env file or provide command line arguments.');
    console.log('Example: node test-smtp-enhanced.js --host smtp.office365.com --port 2525 --user user@example.com --pass yourpassword --to recipient@example.com');
    process.exit(1);
  }

  // Create transporter with debug option
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
    tls: {
      rejectUnauthorized: false
    },
    debug: true, // Show debug output
    logger: true  // Log information into console
  });

  // Verify connection
  console.log('Testing SMTP connection...');
  try {
    const connectionResult = await transporter.verify();
    console.log('✅ SMTP connection successful:', connectionResult);
  } catch (error) {
    console.error('❌ SMTP connection failed:', error);
    console.log('Details:', JSON.stringify(error, null, 2));
    process.exit(1);
  }

  // Send test email
  console.log(`Sending test email to ${config.to}...`);
  try {
    const testToken = 'test-token-' + Math.random().toString(36).substring(2, 15);
    const verifyUrl = `${config.domain}/verify-email?token=${testToken}`;
    
    const mailOptions = {
      from: config.from,
      to: config.to,
      subject: 'Test Email - SMTP Configuration',
      text: `This is a test email to verify SMTP configuration. Test token: ${testToken}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>SMTP Test Email</h2>
          <p>This is a test email to verify that your SMTP configuration is working correctly.</p>
          <div style="margin: 20px 0;">
            <a href="${verifyUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verify Email</a>
          </div>
          <p>Test token: ${testToken}</p>
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
