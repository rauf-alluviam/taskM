// Simple standalone script to send a test email
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Recipient email from command line or default
const recipientEmail = process.argv[2] || 'jeeyainamdar@gmail.com';

console.log('Sending test email to:', recipientEmail);
console.log('Using mail configuration:');
console.log('- SMTP Server:', process.env.MAIL_SERVER);
console.log('- SMTP Port:', process.env.MAIL_PORT);
console.log('- From:', process.env.MAIL_FROM);

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_SERVER,
  port: parseInt(process.env.MAIL_PORT),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.MAIL_USERNAME,
    pass: process.env.MAIL_PASSWORD,
  },
  tls: {
    // Do not fail on invalid certificates
    rejectUnauthorized: false
  }
});

// Email content
const mailOptions = {
  from: `"${process.env.MAIL_FROM_NAME}" <${process.env.MAIL_FROM}>`,
  to: recipientEmail,
  subject: 'Test Email from EXIM TaskM Application',
  text: 'This is a test email from the EXIM TaskM application.',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
      <h2 style="color: #333;">EXIM TaskM Test Email</h2>
      <p>This is a test email sent from the EXIM TaskM application at ${new Date().toLocaleString()}</p>
      <p>If you're receiving this email, the SMTP configuration is working correctly!</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #777; font-size: 12px;">This is a system-generated email. Please do not reply.</p>
    </div>
  `
};

// Send the email
transporter.verify()
  .then(() => {
    console.log('✓ SMTP connection verified successfully');
    return transporter.sendMail(mailOptions);
  })
  .then(info => {
    console.log('✓ Email sent successfully!');
    console.log('Message ID:', info.messageId);
    if (info.response) console.log('Server response:', info.response);
    process.exit(0);
  })
  .catch(error => {
    console.error('✗ Error sending email:', error);
    process.exit(1);
  });
