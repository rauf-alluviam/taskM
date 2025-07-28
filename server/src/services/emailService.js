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
  
  // console.log('📧 Using MOCK email service. Emails will be logged to:', logsDir);
  
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
const DOMAIN = process.env.DOMAIN || 'http://task-flow-ai.s3-website.ap-south-1.amazonaws.com';

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
    
  async sendTaskAssignedEmail(email, { userName, taskName, projectName, dueDate, taskLink }) {
  try {
    const mailOptions = {
      from: FROM_EMAIL,
      to: email,
      subject: `🎯 New Task Assigned: ${taskName}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f8fafc; padding: 40px 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); overflow: hidden;">
            
            <!-- Header with gradient -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
              <div style="background: rgba(255,255,255,0.2); width: 60px; height: 60px; border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 24px;">🎯</span>
              </div>
              <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">New Task Assigned</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 16px;">You have a new task to complete</p>
            </div>

            <!-- Content -->
            <div style="padding: 30px;">
              <p style="font-size: 16px; color: #374151; margin: 0 0 20px;">Hi <strong style="color: #1f2937;">{{userName}}</strong>,</p>
              
              <p style="font-size: 16px; color: #6b7280; margin: 0 0 25px;">You have been assigned a new task in the project <strong style="color: #1f2937;">{{projectName}}</strong>:</p>
              
              <!-- Task Card -->
              <div style="background: linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 100%); border: 1px solid #e0f2fe; border-radius: 12px; padding: 24px; margin: 20px 0; position: relative; overflow: hidden;">
                <div style="position: absolute; top: 0; left: 0; width: 4px; height: 100%; background: linear-gradient(180deg, #2563eb, #3b82f6);"></div>
                
                <h2 style="color: #1e40af; margin: 0 0 16px; font-size: 20px; font-weight: 600;">{{taskName}}</h2>
                
                <div style="display: flex; align-items: center; margin-bottom: 20px;">
                  <div style="background: rgba(37, 99, 235, 0.1); padding: 8px 12px; border-radius: 8px; display: inline-flex; align-items: center;">
                    <span style="margin-right: 6px;">📅</span>
                    <span style="color: #1e40af; font-weight: 500; font-size: 14px;">Due: {{dueDate}}</span>
                  </div>
                </div>

                <a href="{{taskLink}}" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 14px; transition: transform 0.2s; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);">
                  View Task Details →
                </a>
              </div>

              <!-- Tips Section -->
              <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin: 20px 0; border-left: 4px solid #10b981;">
                <p style="margin: 0; font-size: 14px; color: #059669;">
                  💡 <strong>Tip:</strong> Click the button above to view full task details and start working on it.
                </p>
              </div>
            </div>

            <!-- Footer -->
            <div style="background: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                This is an automated notification from your project management system.
              </p>
            </div>
          </div>
        </div>
      `.replace(/{{userName}}/g, userName)
       .replace(/{{taskName}}/g, taskName)
       .replace(/{{projectName}}/g, projectName)
       .replace(/{{dueDate}}/g, dueDate)
       .replace(/{{taskLink}}/g, taskLink)
    };
    
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Task assigned email sent:', result.messageId);
    return result;
  } catch (error) {
    console.error('❌ Task assigned email failed:', error);
    throw error;
  }
},

async sendProjectCreatedEmail(email, { projectName, projectLink, creatorName }) {
  try {
    const mailOptions = {
      from: FROM_EMAIL,
      to: email,
      subject: `🚀 New Project Created: ${projectName}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f8fafc; padding: 40px 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); overflow: hidden;">
            
            <!-- Header with gradient -->
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
              <div style="background: rgba(255,255,255,0.2); width: 60px; height: 60px; border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 24px;">🚀</span>
              </div>
              <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">New Project Created</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 16px;">A new collaboration space is ready</p>
            </div>

            <!-- Content -->
            <div style="padding: 30px;">
              <div style="text-align: center; margin-bottom: 25px;">
                <div style="background: linear-gradient(135deg, #d1fae5 0%, #ecfdf5 100%); border-radius: 12px; padding: 24px; margin: 20px 0;">
                  <h2 style="color: #047857; margin: 0 0 12px; font-size: 22px; font-weight: 600;">{{projectName}}</h2>
                  <p style="color: #065f46; margin: 0; font-size: 16px;">Created by <strong>{{creatorName}}</strong></p>
                </div>
              </div>

              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 24px; text-align: center; margin: 20px 0;">
                <div style="margin-bottom: 20px;">
                  <span style="font-size: 48px; margin-bottom: 12px; display: block;">🎉</span>
                  <p style="color: #166534; margin: 0; font-size: 16px; font-weight: 500;">Ready to start collaborating?</p>
                </div>
                
                <a href="{{projectLink}}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 16px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
                  Explore Project →
                </a>
              </div>

              <!-- Features highlight -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 25px 0;">
                <div style="background: #fefefe; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; text-align: center;">
                  <span style="font-size: 20px; margin-bottom: 8px; display: block;">👥</span>
                  <p style="margin: 0; font-size: 12px; color: #6b7280; font-weight: 500;">Team Collaboration</p>
                </div>
                <div style="background: #fefefe; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; text-align: center;">
                  <span style="font-size: 20px; margin-bottom: 8px; display: block;">📊</span>
                  <p style="margin: 0; font-size: 12px; color: #6b7280; font-weight: 500;">Progress Tracking</p>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div style="background: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                This is an automated notification from your project management system.
              </p>
            </div>
          </div>
        </div>
      `.replace(/{{projectName}}/g, projectName)
       .replace(/{{projectLink}}/g, projectLink)
       .replace(/{{creatorName}}/g, creatorName)
    };
    
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Project created email sent:', result.messageId);
    return result;
  } catch (error) {
    console.error('❌ Project created email failed:', error);
    throw error;
  }
},

async sendProjectMemberAddedEmail(email, { userName, projectName, projectLink }) {
  try {
    const mailOptions = {
      from: FROM_EMAIL,
      to: email,
      subject: `👋 Welcome to Project: ${projectName}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f8fafc; padding: 40px 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); overflow: hidden;">
            
            <!-- Header with gradient -->
            <div style="background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%); padding: 30px; text-align: center;">
              <div style="background: rgba(255,255,255,0.2); width: 60px; height: 60px; border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 24px;">👋</span>
              </div>
              <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">Welcome to the Team!</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 16px;">You've been added to a project</p>
            </div>

            <!-- Content -->
            <div style="padding: 30px;">
              <p style="font-size: 16px; color: #374151; margin: 0 0 20px;">Hi <strong style="color: #1f2937;">{{userName}}</strong>,</p>
              
              <div style="text-align: center; margin: 25px 0;">
                <div style="background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%); border-radius: 12px; padding: 24px; border: 1px solid #e9d5ff;">
                  <span style="font-size: 40px; margin-bottom: 16px; display: block;">🎊</span>
                  <h2 style="color: #7c3aed; margin: 0 0 8px; font-size: 20px; font-weight: 600;">You're now part of</h2>
                  <h3 style="color: #6b21a8; margin: 0; font-size: 24px; font-weight: 700;">{{projectName}}</h3>
                </div>
              </div>

              <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
                <p style="color: #64748b; margin: 0 0 20px; font-size: 16px;">Ready to start collaborating with your team?</p>
                
                <a href="{{projectLink}}" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 16px; box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);">
                  Join Project →
                </a>
              </div>

              <!-- Next steps -->
              <div style="background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                <h4 style="color: #d97706; margin: 0 0 12px; font-size: 16px; font-weight: 600;">✨ What's next?</h4>
                <ul style="color: #92400e; margin: 0; padding-left: 20px; font-size: 14px;">
                  <li style="margin-bottom: 6px;">Explore the project overview and goals</li>
                  <li style="margin-bottom: 6px;">Check out assigned tasks and deadlines</li>
                  <li>Connect with your team members</li>
                </ul>
              </div>
            </div>

            <!-- Footer -->
            <div style="background: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                This is an automated notification from your project management system.
              </p>
            </div>
          </div>
        </div>
      `.replace(/{{userName}}/g, userName)
       .replace(/{{projectName}}/g, projectName)
       .replace(/{{projectLink}}/g, projectLink)
    };
    
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Project member added email sent:', result.messageId);
    return result;
  } catch (error) {
    console.error('❌ Project member added email failed:', error);
    throw error;
  }
},

  // Test connection method
  testConnection: async () => {
    try {
      await transporter.verify();
        console.log('✅ Email service connection successful');
      } catch (error) {
        console.error('❌ Email service connection failed:', error);
      }
    }
  };