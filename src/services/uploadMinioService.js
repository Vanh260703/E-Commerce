// services/uploadMinio.service.js
const minioClient = require('../utils/minio');
const bucket = process.env.MINIO_BUCKET;
// Khởi tạo bucket nếu chưa có
async function initMinioBucket() {
  const exists = await minioClient.bucketExists(bucket);
  if (!exists) {
    await minioClient.makeBucket(bucket, 'us-east-1');
    console.log(`✅ Created bucket: ${bucket}`);
  } else {
    console.log(`✅ Bucket ${bucket} already exists`);
  }
}

async function uploadToMinio(localFilePath, fileNameInMinio) {
  await minioClient.fPutObject(bucket, fileNameInMinio, localFilePath);
  console.log(`🆙 Uploaded ${fileNameInMinio} to MinIO`);

  return getPublicUrl(fileNameInMinio);
}

// Lấy URL công khai từ MinIO
function getPublicUrl(fileName) {
  return `http://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}/${bucket}/${fileName}`;
}

// Xóa object khỏi MinIO
async function deleteFromMinio(fileName) {
  await minioClient.removeObject(bucket, fileName);
  console.log(`🗑️ Deleted ${fileName} from MinIO`);
}

module.exports = {
  initMinioBucket,
  uploadToMinio,
  deleteFromMinio,
  getPublicUrl
};