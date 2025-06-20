# AWS S3 Setup Guide for TaskM Attachments

This guide explains how to set up AWS S3 for file attachments in TaskM.

## Prerequisites

1. An AWS account
2. Basic understanding of AWS S3 and IAM

## Step 1: Create an S3 Bucket

1. Log in to the AWS Management Console
2. Navigate to S3
3. Click "Create bucket"
4. Choose a unique bucket name (e.g., `taskm-attachments-yourdomain`)
5. Select your preferred region
6. Keep default settings for:
   - Object Ownership: ACLs disabled
   - Block Public Access: Keep all options checked
   - Bucket Versioning: Disabled (or enable if you want file versioning)
   - Default encryption: Server-side encryption with Amazon S3 managed keys (SSE-S3)
7. Click "Create bucket"

## Step 2: Create an IAM User

1. Navigate to IAM in the AWS Console
2. Go to "Users" and click "Create user"
3. Enter a username (e.g., `taskm-s3-user`)
4. Select "Attach policies directly"
5. Create a custom policy with the following permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::YOUR_BUCKET_NAME",
                "arn:aws:s3:::YOUR_BUCKET_NAME/*"
            ]
        }
    ]
}
```

6. Replace `YOUR_BUCKET_NAME` with your actual bucket name
7. Save the policy with a name like `TaskM-S3-Policy`
8. Attach this policy to the user
9. Complete user creation

## Step 3: Generate Access Keys

1. Go to the created user's page
2. Click on the "Security credentials" tab
3. Click "Create access key"
4. Choose "Application running outside AWS"
5. Add a description tag (optional)
6. Click "Create access key"
7. **Important**: Copy the Access Key ID and Secret Access Key immediately
8. Store them securely

## Step 4: Configure Environment Variables

Update your `.env` file in the server directory:

```env
# AWS S3 Configuration (for file attachments)
AWS_ACCESS_KEY_ID=your_actual_access_key_id
AWS_SECRET_ACCESS_KEY=your_actual_secret_access_key
AWS_REGION=your_bucket_region
AWS_S3_BUCKET=your_bucket_name
```

## Step 5: Test the Configuration

1. Start your server: `npm start`
2. Create or edit a task/document
3. Try uploading an attachment
4. Check your S3 bucket to see if the file was uploaded

## Security Best Practices

1. **Never commit AWS credentials to version control**
2. Use least-privilege permissions (only grant necessary S3 permissions)
3. Consider using AWS IAM roles instead of access keys for production
4. Enable S3 bucket logging for audit trails
5. Set up bucket policies for additional security
6. Consider enabling S3 encryption at rest
7. Set up lifecycle policies to manage old files

## Cost Optimization

1. Set up S3 lifecycle policies to move old files to cheaper storage classes
2. Monitor your S3 usage and costs
3. Consider setting up S3 request metrics
4. Use S3 Intelligent Tiering for automatic cost optimization

## Troubleshooting

### Common Issues:

1. **Access Denied**: Check IAM permissions and bucket policies
2. **Bucket Not Found**: Verify bucket name and region
3. **Invalid Credentials**: Check access key ID and secret access key
4. **Upload Failures**: Check file size limits and allowed file types

### Error Messages:

- `NoSuchBucket`: Bucket name is incorrect or doesn't exist
- `InvalidAccessKeyId`: Access key ID is invalid
- `SignatureDoesNotMatch`: Secret access key is incorrect
- `AccessDenied`: IAM permissions are insufficient

## Advanced Configuration

### Custom Domain (Optional)

1. Set up a CloudFront distribution for your S3 bucket
2. Configure a custom domain
3. Update the S3 service to use your custom domain

### File Processing (Optional)

1. Set up Lambda functions for file processing
2. Use S3 event notifications to trigger processing
3. Implement virus scanning with AWS services

## Monitoring

1. Enable CloudTrail for API logging
2. Set up CloudWatch alarms for unusual activity
3. Monitor S3 access patterns
4. Set up billing alerts

Remember to replace all placeholder values with your actual AWS configuration!
