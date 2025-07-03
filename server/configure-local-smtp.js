// This script creates a .env.local file with local SMTP settings
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define paths
const envPath = path.join(__dirname, '.env');
const localEnvPath = path.join(__dirname, '.env.local');

// Read existing .env file
fs.readFile(envPath, 'utf8', (err, data) => {
  if (err) {
    console.error('❌ Error reading .env file:', err);
    process.exit(1);
  }

  // Replace or add local SMTP configuration
  const localEnvContent = data.replace(
    /# Email Configuration.+?(?=\n\n)/s,
    `# Email Configuration (Local Test Server)
SMTP_HOST=127.0.0.1
SMTP_PORT=2525
SMTP_SECURE=false
SMTP_USER=test@example.com
SMTP_PASS=test123
FROM_EMAIL=test@example.com
DOMAIN=http://localhost:3000

# Original Mail Settings (commented out)
# MAIL_USERNAME=${process.env.MAIL_USERNAME }
# MAIL_PASSWORD=${process.env.MAIL_PASSWORD }
# MAIL_FROM=${process.env.MAIL_FROM}
# MAIL_PORT=${process.env.MAIL_PORT}
# MAIL_SERVER=${process.env.MAIL_SERVER }
# MAIL_STARTTLS=${process.env.MAIL_STARTTLS}
# MAIL_SSL_TLS=${process.env.MAIL_SSL_TLS }
# MAIL_FROM_NAME=${process.env.MAIL_FROM_NAME }`
  );

  // Write to .env.local file
  fs.writeFile(localEnvPath, localEnvContent, 'utf8', (err) => {
    if (err) {
      console.error('❌ Error writing .env.local file:', err);
      process.exit(1);
    }
    
    console.log('✅ Successfully created .env.local file with local SMTP configuration');
    console.log('To use the local configuration:');
    console.log('1. Start the local SMTP server: node local-smtp-server.js');
    console.log('2. Run your application with: NODE_ENV=local npm start');
    console.log('This will redirect all emails to the local SMTP server for testing');
  });
});
