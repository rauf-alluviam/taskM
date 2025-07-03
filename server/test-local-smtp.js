// Test sending an email through the local SMTP server
import nodemailer from 'nodemailer';

console.log('==========================================');
console.log('      LOCAL SMTP TESTING UTILITY         ');
console.log('==========================================');

// Create transporter with local SMTP configuration
const transporter = nodemailer.createTransport({
  host: '127.0.0.1',
  port: 2525,
  secure: false,
  // No auth required for local testing server
  tls: {
    rejectUnauthorized: false
  }
});

// Test sending an email
async function sendTestEmail() {
  try {
    console.log('Sending test email to local SMTP server...');
    
    const info = await transporter.sendMail({
      from: '"Test User" <test@example.com>',
      to: 'jeeyainamdar@gmail.com',
      subject: 'Test Email from EXIM TaskM Application',
      text: 'This is a test email from the EXIM TaskM application.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>EXIM TaskM Email Test</h2>
          <p>This email was sent through the local SMTP test server at ${new Date().toLocaleString()}</p>
          <p>This is a test email to verify SMTP functionality. If you're seeing this in your email inbox, the SMTP relay is working correctly!</p>
        </div>
      `
    });

    console.log('✅ Email sent successfully!');
    console.log('Message ID:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Failed to send test email:', error);
    return false;
  }
}

// Run the test
sendTestEmail()
  .then(success => {
    console.log('==========================================');
    console.log('           TESTING COMPLETED             ');
    console.log(`Result: ${success ? 'SUCCESS ✅' : 'FAILED ❌'}`);
    console.log('==========================================');
    process.exit(success ? 0 : 1);
  });
