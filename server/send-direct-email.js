// Script to send a direct email to a specific recipient using the configured SMTP server
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

console.log('==========================================');
console.log('         DIRECT EMAIL SENDER              ');
console.log('==========================================');

// Get recipient email from command line or use default
const recipient = process.argv[2] || 'jeeyainamdar@gmail.com';

console.log('Current Mail Configuration:');
console.log('- MAIL_SERVER:', process.env.MAIL_SERVER);
console.log('- MAIL_PORT:', process.env.MAIL_PORT);
console.log('- MAIL_USERNAME:', process.env.MAIL_USERNAME);
console.log('- MAIL_FROM:', process.env.MAIL_FROM);
console.log('- RECIPIENT:', recipient);
console.log('==========================================');

// Create transporter with the MAIL_ configuration from .env
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
  }
});

// Function to log to file and console
async function log(message, isError = false) {
  const logMessage = `[${new Date().toISOString()}] ${message}\n`;
  console[isError ? 'error' : 'log'](message);
  try {
    await fs.appendFile(path.join(__dirname, 'email-logs.txt'), logMessage);
  } catch (err) {
    console.error('Could not write to log file:', err);
  }
}

// Function to send an email
async function sendEmail() {
  if (!process.env.MAIL_SERVER || !process.env.MAIL_USERNAME || !process.env.MAIL_PASSWORD) {
    await log('❌ Missing required mail configuration. Please check your .env file.', true);
    
    // Try to use hardcoded values as fallback
    await log('Trying with hardcoded values...', true);
  }

  try {
    console.log(`Sending email to ${recipient}...`);
    
    const testId = Math.random().toString(36).substring(2, 10);
    
    const mailOptions = {
      from: `"${process.env.MAIL_FROM_NAME}" <${process.env.MAIL_FROM}>`,
      to: recipient,
      subject: `EXIM TaskM Test Email - ${testId}`,
      text: `This is a test email from the EXIM TaskM application. Test ID: ${testId}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>EXIM TaskM Email Test</h2>
          <p>This is a test email from the EXIM TaskM application.</p>
          <p>Test ID: ${testId}</p>
          <p>Sent at: ${new Date().toLocaleString()}</p>
          <p><em>This is a test message. No action is required.</em></p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
    return true;
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    return false;
  }
}

// Send the email
sendEmail()
  .then(success => {
    console.log('==========================================');
    console.log('              EMAIL SENT                 ');
    console.log(`Result: ${success ? 'SUCCESS ✅' : 'FAILED ❌'}`);
    console.log('==========================================');
    process.exit(success ? 0 : 1);
  });
