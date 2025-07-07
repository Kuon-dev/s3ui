import { S3Client } from '@aws-sdk/client-s3';

const endpoint = process.env.R2_ENDPOINT;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME;

if (!endpoint || !accessKeyId || !secretAccessKey || !bucketName) {
  throw new Error('Missing required R2 environment variables');
}

export const r2Client = new S3Client({
  region: 'auto',
  endpoint,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

export const R2_BUCKET_NAME = bucketName;