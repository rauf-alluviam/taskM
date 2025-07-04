#!/usr/bin/env node
/**
 * Token debugging script
 * Usage: node debug-token.js [invitation-token]
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

// Define User schema for debugging
const userSchema = new mongoose.Schema({}, { 
  strict: false,
  collection: 'users'
});

async function debugToken(token) {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🔌 Connected to MongoDB\n');

    const User = mongoose.model('UserDebug', userSchema);

    console.log('🔍 Token Analysis:');
    console.log(`Token: ${token}`);
    console.log(`Length: ${token.length} characters`);
    console.log(`Type: ${token.length === 64 ? 'Invitation token (crypto)' : token.includes('.') ? 'JWT token' : 'Unknown'}\n`);

    if (token.includes('.')) {
      // This is a JWT token
      console.log('🎫 JWT Token Analysis:');
      try {
        const decoded = jwt.decode(token, { complete: true });
        console.log('Header:', decoded.header);
        console.log('Payload:', decoded.payload);
        
        // Try to verify
        try {
          const verified = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
          console.log('✅ JWT verification successful');
          console.log('Verified payload:', verified);
        } catch (verifyError) {
          console.log('❌ JWT verification failed:', verifyError.message);
        }
      } catch (decodeError) {
        console.log('❌ JWT decode failed:', decodeError.message);
      }
    } else {
      // This is likely an invitation token
      console.log('📧 Invitation Token Analysis:');
      
      // Check for exact match
      const user = await User.findOne({ 'pendingInvitation.token': token });
      
      if (user) {
        console.log('✅ User found with this token:');
        console.log(`Email: ${user.email}`);
        console.log(`Status: ${user.status}`);
        console.log(`Invitation expires: ${new Date(user.pendingInvitation.expires)}`);
        console.log(`Current time: ${new Date()}`);
        console.log(`Is expired: ${new Date(user.pendingInvitation.expires) < new Date()}`);
        console.log(`Organization: ${user.pendingInvitation.organization}`);
        console.log(`Role: ${user.pendingInvitation.role}`);
        console.log(`Invited by: ${user.pendingInvitation.invitedBy}`);
        console.log(`Invited at: ${new Date(user.pendingInvitation.invitedAt)}`);
      } else {
        console.log('❌ No user found with this invitation token');
        
        // Check if any similar tokens exist
        console.log('\n🔍 Searching for similar tokens...');
        const allUsers = await User.find({ 'pendingInvitation.token': { $exists: true } });
        console.log(`Found ${allUsers.length} users with pending invitations`);
        
        allUsers.forEach((u, index) => {
          console.log(`${index + 1}. ${u.email} - Token: ${u.pendingInvitation.token.substring(0, 8)}... (expires: ${new Date(u.pendingInvitation.expires)})`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Get token from command line argument
const token = process.argv[2];

if (!token) {
  console.log('Usage: node debug-token.js [token]');
  console.log('Example: node debug-token.js abc123...');
  process.exit(1);
}

debugToken(token);
