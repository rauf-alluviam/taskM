import mongoose from 'mongoose';
import dotenv from 'dotenv';
import crypto from 'crypto';
dotenv.config();

async function resetVerificationStatus() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('🔌 Connected to MongoDB');

    // Define a loose User schema to allow flexible updates
    const UserSchema = new mongoose.Schema({}, { 
      strict: false,
      collection: 'users' // Make sure this matches your actual collection name
    });
    
    const User = mongoose.model('UserTemp', UserSchema);

    // Find the user by email
    const email = 'jeeyainamdar@gmail.com';
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('🔍 Current user state:');
    console.log(`- Email: ${user.email}`);
    console.log(`- Verified Email: ${user.verified_email}`);
    console.log(`- Verification Token: ${user.emailVerificationToken ? 'exists' : 'none'}`);
    console.log(`- Token Expires: ${user.emailVerificationTokenExpires ? new Date(user.emailVerificationTokenExpires).toISOString() : 'none'}`);
    
    // Generate a new verification token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Update the user
    const result = await User.updateOne(
      { email },
      { 
        $set: {
          verified_email: false,
          emailVerificationToken: token,
          emailVerificationTokenExpires: new Date(Date.now() + 3600000) // 1 hour from now
        }
      }
    );
    
    console.log('✅ Update result:', result);
    
    // Check the updated user
    const updatedUser = await User.findOne({ email });
    console.log('🔄 Updated user state:');
    console.log(`- Email: ${updatedUser.email}`);
    console.log(`- Verified Email: ${updatedUser.verified_email}`);
    console.log(`- Verification Token: ${updatedUser.emailVerificationToken ? 'exists' : 'none'}`);
    console.log(`- Token Expires: ${updatedUser.emailVerificationTokenExpires ? new Date(updatedUser.emailVerificationTokenExpires).toISOString() : 'none'}`);
    
    console.log('✅ Process complete. New verification token:');
    console.log(updatedUser.emailVerificationToken);
    
    mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

resetVerificationStatus();
