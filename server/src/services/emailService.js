import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

// Determine if we should use a real email service or the mock service
// Use real emails in production and when explicitly set to false
const USE_MOCK_EMAIL = process.env.USE_MOCK_EMAIL === 'true';

// Log email configuration (for debugging)
console.log('📧 Email configuration:', {
  useMock: USE_MOCK_EMAIL,
  host: process.env.MAIL_SERVER,
  port: process.env.MAIL_PORT,
  secure: process.env.MAIL_PORT === '465',
  user: process.env.MAIL_USERNAME,
  from: process.env.MAIL_FROM || process.env.FROM_EMAIL
});

// Create transporter based on configuration
let transporter;

if (USE_MOCK_EMAIL) {
  // Create logs directory if it doesn't exist
  const logsDir = path.join(process.cwd(), 'email_logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  console.log('📧 Using MOCK email service. Emails will be logged to:', logsDir);
  
  // Mock transporter that logs emails to files instead of sending them
  transporter = {
    async sendMail(mailOptions) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `email-${timestamp}-${mailOptions.to}.html`;
      const filePath = path.join(logsDir, filename);
      
      const logData = {
        timestamp: new Date().toISOString(),
        from: mailOptions.from,
        to: mailOptions.to,
        subject: mailOptions.subject,
        html: mailOptions.html
      };
      
      // Save email content to file
      fs.writeFileSync(filePath, mailOptions.html);
      
      // Save email metadata to a JSON file
      fs.writeFileSync(
        filePath + '.json', 
        JSON.stringify(logData, null, 2)
      );
      
      console.log(`📧 Mock email sent to ${mailOptions.to} (Subject: ${mailOptions.subject})`);
      console.log(`📄 Email content saved to ${filePath}`);
      
      return {
        messageId: `mock-${timestamp}@taskm.local`,
        mock: true
      };
    },
    async verify() {
      return true;
    }
  };
} else {
  // Real transporter using configured SMTP settings
  transporter = nodemailer.createTransport({
    host: process.env.MAIL_SERVER || process.env.SMTP_HOST,
    port: parseInt(process.env.MAIL_PORT || process.env.SMTP_PORT || '587'),
    secure: process.env.MAIL_PORT === '465', // true for 465, false for other ports
    auth: {
      user: process.env.MAIL_USERNAME || process.env.SMTP_USER,
      pass: process.env.MAIL_PASSWORD || process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false
    }
  });
}

const FROM_EMAIL = process.env.MAIL_FROM || process.env.FROM_EMAIL || 'noreply@taskm.com';
const DOMAIN = process.env.DOMAIN || 'http://localhost:3000';

const testConnection = async () => {
    try {
      await transporter.verify();
      console.log('✅ SMTP connection successful');
    } catch (error) {
      console.error('❌ SMTP connection failed:', error);
    }
  };
  
  export default {
    async sendVerificationEmail(email, token) {
      try {
        const verifyUrl = `${DOMAIN}/verify-email?token=${token}`;
        const mailOptions = {
          from: FROM_EMAIL,
          to: email,
          subject: 'Verify your email address',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Email Verification</h2>
              <p>Thank you for registering. Please verify your email by clicking the link below:</p>
              <div style="margin: 20px 0;">
                <a href="${verifyUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verify Email</a>
              </div>
              <p>Or copy and paste this link in your browser:</p>
              <p style="word-break: break-all;">${verifyUrl}</p>
              <p><em>This link will expire in 1 hour.</em></p>
            </div>
          `
        };
        
        const result = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent successfully:', result.messageId);
        return result;
      } catch (error) {
        console.error('❌ Email sending failed:', error);
        throw error;
      }
    },
    
    // Test connection method
    testConnection
  };