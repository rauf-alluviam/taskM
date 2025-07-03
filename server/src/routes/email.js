// Email Routes for API
import express from 'express';
import { authenticate, admin } from '../middleware/auth.js';
import emailService from '../services/emailService.js';

const router = express.Router();

// Test email connection
router.get('/test-connection', authenticate, admin, async (req, res) => {
  try {
    console.log('📧 Testing email connection...');
    await emailService.testConnection();
    
    // If we reach here, the connection is successful
    console.log('✅ Email connection test successful');
    res.json({ success: true, message: 'Email connection successful' });
  } catch (error) {
    console.error('❌ Email connection test failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to connect to email server',
      error: error.message
    });
  }
});

// Send a test email
router.post('/send-test', authenticate, admin, async (req, res) => {
  try {
    const { recipient, subject = 'Test Email', content = 'This is a test email.' } = req.body;
    
    if (!recipient) {
      return res.status(400).json({ 
        success: false, 
        message: 'Recipient email is required' 
      });
    }
    
    console.log(`📧 Sending test email to ${recipient}...`);
    
    // Create a test token similar to the verification token
    const testId = Math.random().toString(36).substring(2, 15);
    
    // Use the existing sendVerificationEmail method but modify the content
    const result = await emailService.sendEmail({
      to: recipient,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Test Email from TaskM</h2>
          <p>${content}</p>
          <p>Test ID: ${testId}</p>
          <p><em>This is a test email sent at ${new Date().toLocaleString()}.</em></p>
        </div>
      `
    });
    
    console.log('✅ Test email sent successfully:', result.messageId);
    
    res.json({
      success: true,
      message: 'Test email sent successfully',
      details: {
        messageId: result.messageId,
        recipient,
        testId
      }
    });
  } catch (error) {
    console.error('❌ Test email sending failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test email',
      error: error.message
    });
  }
});

export default router;
