const Minio = require('minio');

require('dotenv').config();

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT,
  port: parseInt(process.env.MINIO_PORT),
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY,
});

const bucket = process.env.MINIO_BUCKET;

const policy = {
  Version: '2012-10-17',
  Statement: [
    {
      Action: ['s3:GetObject'],
      Effect: 'Allow',
      Principal: { AWS: ['*'] },
      Resource: [`arn:aws:s3:::${bucket}/*`],
      Sid: '',
    },
  ],
};

minioClient.setBucketPolicy(bucket, JSON.stringify(policy), (err) => {
  if (err) {
    console.error('❌ Lỗi set bucket policy:', err);
    process.exit(1);
  }
  console.log(`✅ Bucket ${bucket} đã được set public!`);
  process.exit(0);
});
