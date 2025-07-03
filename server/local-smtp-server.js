// This script creates a local SMTP server for testing email functionality
import { SMTPServer } from 'smtp-server';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
const PORT = process.env.LOCAL_SMTP_PORT || 2525;
const HOST = process.env.LOCAL_SMTP_HOST || '127.0.0.1';

// Create the SMTP server
const server = new SMTPServer({
  secure: false,
  name: 'local-test-smtp-server',
  authOptional: true, // Allow without authentication for testing
  size: 1024 * 1024, // Allow messages up to 1 MB
  onConnect(session, callback) {
    console.log('🔌 New connection from:', session.remoteAddress);
    // Accept the connection
    callback();
  },
  onMailFrom(address, session, callback) {
    console.log('📧 Mail from:', address.address);
    // Accept the sender
    callback();
  },
  onRcptTo(address, session, callback) {
    console.log('📬 Recipient:', address.address);
    // Accept all recipients
    callback();
  },
  onData(stream, session, callback) {
    console.log('📨 Message data started');
    let messageData = '';
    
    stream.on('data', (chunk) => {
      messageData += chunk;
    });
    
    stream.on('end', () => {
      console.log('📩 Message received:');
      console.log('-------------------------------------------');
      console.log(messageData);
      console.log('-------------------------------------------');
      // Indicate that the message was successfully received
      callback();
    });
  }
});

// Start the server
server.listen(PORT, HOST, () => {
  console.log(`✅ SMTP Test Server running at ${HOST}:${PORT}`);
  console.log('This server will display all received emails in the console');
  console.log('To use it, configure your application with these settings:');
  console.log(`SMTP_HOST=${HOST}`);
  console.log(`SMTP_PORT=${PORT}`);
  console.log('SMTP_SECURE=false');
  
});

// Handle errors
server.on('error', (error) => {
  console.error('❌ SMTP Server Error:', error);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Shutting down SMTP test server...');
  server.close(() => {
    console.log('✅ SMTP test server stopped');
    process.exit(0);
  });
});
