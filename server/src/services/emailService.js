import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true', // false for 587, true for 465
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    // Additional options for Office365
    tls: {
      ciphers: 'SSLv3',
      rejectUnauthorized: false
    }
  });
  

const FROM_EMAIL = process.env.FROM_EMAIL ;
const DOMAIN = process.env.DOMAIN;

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