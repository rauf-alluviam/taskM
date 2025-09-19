

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

// Create transporter based on configuration
let transporter;

if (process.env.USE_MOCK_EMAIL === 'true') {
  // Create logs directory if it doesn't exist
  const logsDir = path.join(process.cwd(), 'email_logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  // Mock transporter that logs emails to files
  transporter = {
    async sendMail(mailOptions) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `email-${timestamp}-${mailOptions.to}.html`;
      const filePath = path.join(logsDir, filename);
      
      const logData = {
        timestamp: new Date().toISOString(),
        from: mailOptions.from || process.env.MAIL_FROM,
        to: mailOptions.to,
        subject: mailOptions.subject,
        html: mailOptions.html
      };
      
      fs.writeFileSync(filePath, mailOptions.html);
      console.log(`📧 Logged mock email to: ${filePath}`);
      return { messageId: `mock-${timestamp}` };
    }
  };
} else {
  transporter = nodemailer.createTransport({
    host: process.env.MAIL_SERVER,
    port: process.env.MAIL_PORT,
    secure: process.env.MAIL_PORT === '465',
    auth: {
      user: process.env.MAIL_USERNAME,
      pass: process.env.MAIL_PASSWORD,
    },
  });
}

export const accountEmailService = {
  /**
   * Send reminder email for account entries with upcoming due dates
   */
  async sendReminderEmail(userEmail, userName, entries) {
    try {
      // Group entries by urgency
      const urgentEntries = entries.filter(e => e.daysUntilDue <= 2);
      const importantEntries = entries.filter(e => e.daysUntilDue > 2 && e.daysUntilDue <= 5);
      const totalEntries = entries.length;

      // Generate entry table for each category
      const generateEntryTable = (entriesList, title, color) => {
        if (entriesList.length === 0) return '';
        
        return `
          <div style="margin: 20px 0;">
            <h3 style="color: ${color}; margin-bottom: 15px; border-bottom: 2px solid ${color}; padding-bottom: 5px;">
              ${title} (${entriesList.length} items)
            </h3>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr>
                  <th style="padding: 10px; border: 1px solid #ddd; background-color: #f8f9fa;">Company</th>
                  <th style="padding: 10px; border: 1px solid #ddd; background-color: #f8f9fa;">Type</th>
                  <th style="padding: 10px; border: 1px solid #ddd; background-color: #f8f9fa;">Billing Date</th>
                  <th style="padding: 10px; border: 1px solid #ddd; background-color: #f8f9fa;">Due Date</th>
                  <th style="padding: 10px; border: 1px solid #ddd; background-color: #f8f9fa;">Days Until Due</th>
                </tr>
              </thead>
              <tbody>
                ${entriesList.map(entry => `
                  <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;">${entry.defaultFields.companyName}</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${entry.masterTypeName}</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${entry.defaultFields.billingDate ? new Date(entry.defaultFields.billingDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      }) : 'Not Set'}</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${entry.defaultFields.dueDate ? new Date(entry.defaultFields.dueDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      }) : 'Not Set'}</td>
                    <td style="padding: 10px; border: 1px solid #ddd; color: ${color}; font-weight: bold;">
                      ${entry.daysUntilDue} day(s)
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      };

      // Construct email content
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">Due Date Reminder System</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">
              Hello ${userName}, you have ${totalEntries} upcoming due dates requiring attention
            </p>
          </div>
          
          <div style="padding: 30px; background-color: #f9f9f9;">
            <div style="background-color: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              
              ${generateEntryTable(urgentEntries, '🚨 URGENT - 2 Days or Less', '#dc3545')}
              ${generateEntryTable(importantEntries, '⚠️ IMPORTANT - 3-5 Days', '#fd7e14')}
              
              ${totalEntries === 0 ? `
                <div style="text-align: center; padding: 40px;">
                  <p style="font-size: 18px; color: #28a745;">✅ All caught up! No due dates in the next 5 days.</p>
                </div>
              ` : `
                <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin-top: 20px;">
                  <h4 style="margin: 0 0 10px 0; color: #856404;">📋 Action Required:</h4>
                  <ul style="margin: 0; color: #856404;">
                    <li>Review all upcoming due dates</li>
                    <li>Ensure billing dates are set appropriately</li>
                    <li>Contact relevant parties for urgent items</li>
                    <li>Update master entries as needed</li>
                  </ul>
                </div>
              `}
            </div>
          </div>
          
          <div style="text-align: center; padding: 20px; color: #6c757d; font-size: 14px;">
            <p>This is an automated reminder from your Account Management System.</p>
            <p>To manage your notification settings, please visit your account settings.</p>
          </div>
        </div>
      `;

      // Send email using the project's email service
      await transporter.sendMail({
        from: process.env.MAIL_FROM,
        to: userEmail,
        subject: urgentEntries.length > 0 
          ? `🚨 URGENT: ${urgentEntries.length} Due Date Reminders - Action Required`
          : `⚠️ IMPORTANT: ${totalEntries} Due Date Reminders`,
        html: htmlContent
      });

      console.log(`✅ Reminder email sent successfully to ${userEmail}`);
    } catch (error) {
      console.error(`❌ Error sending reminder email to ${userEmail}:`, error);
      throw error;
    }
  },

  /**
   * Send notification when an account entry is created
   */
  async sendAccountCreatedEmail(userEmail, userName, accountDetails) {
    try {
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>New Account Entry Created</h2>
          <p>Hello ${userName},</p>
          <p>A new account entry has been created with the following details:</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Company:</strong> ${accountDetails.companyName}</p>
            <p><strong>Type:</strong> ${accountDetails.masterTypeName}</p>
            <p><strong>Billing Date:</strong> ${accountDetails.billingDate ? new Date(accountDetails.billingDate).toLocaleDateString() : 'Not Set'}</p>
            <p><strong>Due Date:</strong> ${accountDetails.dueDate ? new Date(accountDetails.dueDate).toLocaleDateString() : 'Not Set'}</p>
          </div>
          
          <p>Please review the details and ensure all information is correct.</p>
        </div>
      `;

      await transporter.sendMail({
        from: process.env.MAIL_FROM,
        to: userEmail,
        subject: `New Account Entry Created: ${accountDetails.companyName}`,
        html: htmlContent
      });

      console.log(`✅ Account creation email sent successfully to ${userEmail}`);
    } catch (error) {
      console.error(`❌ Error sending account creation email to ${userEmail}:`, error);
      throw error;
    }
  }
};

export default accountEmailService;
