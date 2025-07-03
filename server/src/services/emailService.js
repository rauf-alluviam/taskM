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

    async sendInvitationEmail(email, organizationName, inviterName, token, invitationData = {}) {
      try {
        const inviteUrl = `${DOMAIN}/invite/${token}`;
        
        // Extract invitation data
        const {
          message = '',
          invitationContext = '',
          teamAssignments = [],
          projectAssignments = []
        } = typeof invitationData === 'string' ? { message: invitationData } : invitationData;

        let assignmentSection = '';
        
        // Add team assignments section
        if (teamAssignments.length > 0) {
          assignmentSection += `
            <div style="background-color: #f0f9ff; padding: 15px; border-radius: 6px; margin: 15px 0;">
              <h3 style="color: #0369a1; margin-bottom: 10px; font-size: 16px;">Team Assignments</h3>
              <ul style="color: #0c4a6e; margin: 0; padding-left: 20px;">
                ${teamAssignments.map(team => `
                  <li style="margin-bottom: 5px;">
                    <strong>${team.name}</strong> (${team.role})
                    ${team.description ? `<br><em style="color: #64748b; font-size: 13px;">${team.description}</em>` : ''}
                  </li>
                `).join('')}
              </ul>
            </div>
          `;
        }

        // Add project assignments section
        if (projectAssignments.length > 0) {
          assignmentSection += `
            <div style="background-color: #f0fdf4; padding: 15px; border-radius: 6px; margin: 15px 0;">
              <h3 style="color: #15803d; margin-bottom: 10px; font-size: 16px;">Project Assignments</h3>
              <ul style="color: #166534; margin: 0; padding-left: 20px;">
                ${projectAssignments.map(project => `
                  <li style="margin-bottom: 5px;">
                    <strong>${project.name}</strong> (${project.role})
                    ${project.description ? `<br><em style="color: #64748b; font-size: 13px;">${project.description}</em>` : ''}
                  </li>
                `).join('')}
              </ul>
            </div>
          `;
        }

        const mailOptions = {
          from: FROM_EMAIL,
          to: email,
          subject: `You're invited to join ${organizationName} on TaskFlow`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #2563eb; margin-bottom: 10px;">TaskFlow Invitation</h1>
                <p style="color: #64748b; font-size: 16px;">You've been invited to collaborate</p>
              </div>
              
              <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h2 style="color: #1e293b; margin-bottom: 15px;">Join ${organizationName}</h2>
                <p style="color: #475569; margin-bottom: 15px;">
                  <strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong> on TaskFlow.
                </p>
                ${invitationContext ? `
                  <div style="background-color: #e0f2fe; padding: 15px; border-radius: 6px; margin: 15px 0;">
                    <h4 style="margin: 0 0 10px 0; color: #0277bd;">Why you're being invited:</h4>
                    <p style="margin: 0; color: #0277bd;">${invitationContext}</p>
                  </div>
                ` : ''}
                ${message ? `
                  <div style="background-color: #fff3cd; padding: 15px; border-radius: 6px; margin: 15px 0;">
                    <h4 style="margin: 0 0 10px 0; color: #856404;">Personal Message:</h4>
                    <p style="margin: 0; color: #856404; font-style: italic;">"${message}"</p>
                  </div>
                ` : ''}
                ${assignmentSection}
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${inviteUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">
                  Accept Invitation
                </a>
              </div>
              
              <div style="background-color: #fef7cd; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <h3 style="color: #92400e; margin-bottom: 10px; font-size: 14px;">What you can do:</h3>
                <ul style="color: #a16207; margin: 0; padding-left: 20px; font-size: 14px;">
                  <li>Collaborate on projects and tasks</li>
                  <li>Join teams and contribute to discussions</li>
                  <li>Access shared documents and resources</li>
                  <li>Track progress and stay organized</li>
                </ul>
              </div>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                <p style="color: #64748b; font-size: 14px; margin-bottom: 10px;">
                  If the button doesn't work, copy and paste this link in your browser:
                </p>
                <p style="word-break: break-all; color: #2563eb; font-size: 14px;">
                  ${inviteUrl}
                </p>
                <p style="color: #94a3b8; font-size: 12px; margin-top: 20px;">
                  This invitation will expire in 7 days. If you have any questions, contact ${inviterName} or your system administrator.
                </p>
              </div>
            </div>
          `
        };
        
        const result = await transporter.sendMail(mailOptions);
        console.log('✅ Invitation email sent successfully:', result.messageId);
        return result;
      } catch (error) {
        console.error('❌ Invitation email sending failed:', error);
        throw error;
      }
    },
    
    // Test connection method
    testConnection
  };