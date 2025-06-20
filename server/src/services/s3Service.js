import AWS from 'aws-sdk';
import dotenv from 'dotenv';

dotenv.config();

// Configure AWS
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1',
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'taskm-attachments';

console.log('🔧 AWS S3 Configuration:', {
  region: process.env.AWS_REGION,
  bucket: BUCKET_NAME,
  hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
  hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY
});

// Test S3 connection
const testS3Connection = async () => {
  try {
    await s3.headBucket({ Bucket: BUCKET_NAME }).promise();
    console.log('✅ S3 bucket connection successful');
  } catch (error) {
    console.error('❌ S3 bucket connection failed:', {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode
    });
  }
};

// Test connection on startup
testS3Connection();

export const uploadToS3 = async (file, key) => {
  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
    ACL: 'private', // Make files private by default
  };

  try {
    console.log('🔄 Starting S3 upload:', { bucket: BUCKET_NAME, key, size: file.buffer.length });
    const result = await s3.upload(params).promise();
    console.log('✅ S3 upload successful:', { url: result.Location, key: result.Key });
    return {
      url: result.Location,
      key: result.Key,
      bucket: result.Bucket,
    };
  } catch (error) {
    console.error('❌ S3 upload error:', {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      bucket: BUCKET_NAME,
      key: key,
      region: process.env.AWS_REGION
    });
    throw new Error(`Failed to upload file to S3: ${error.message}`);
  }
};

export const deleteFromS3 = async (key) => {
  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
  };

  try {
    await s3.deleteObject(params).promise();
    return true;
  } catch (error) {
    console.error('S3 delete error:', error);
    throw new Error('Failed to delete file from S3');
  }
};

export const getSignedUrl = async (key, expiresIn = 3600) => {
  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
    Expires: expiresIn, // URL expires in 1 hour by default
  };

  try {
    const url = await s3.getSignedUrlPromise('getObject', params);
    return url;
  } catch (error) {
    console.error('S3 signed URL error:', error);
    throw new Error('Failed to generate signed URL');
  }
};

export const listFiles = async (prefix = '') => {
  const params = {
    Bucket: BUCKET_NAME,
    Prefix: prefix,
  };

  try {
    const result = await s3.listObjectsV2(params).promise();
    return result.Contents || [];
  } catch (error) {
    console.error('S3 list error:', error);
    throw new Error('Failed to list files from S3');
  }
};
