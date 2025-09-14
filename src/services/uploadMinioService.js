// services/uploadMinio.service.js
const minioClient = require('../utils/minio');
const bucket = process.env.MINIO_BUCKET;
const path = require('path');
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

async function uploadToMinio(localFilePath, fileNameInMinio, fileNameProduct, type = 'default') {
  let folder = '';

  if (type === 'img-product') {
    folder = `admin/${fileNameProduct}/`;
  }

  const fullPath = `${folder}${fileNameInMinio}`;
  await minioClient.fPutObject(bucket, fullPath, localFilePath);
  console.log(`🆙 Uploaded ${fullPath} to MinIO`);

  return getPublicUrl(fullPath);
}

// Lấy URL công khai từ MinIO
function getPublicUrl(fileName) {
  const bucket = process.env.MINIO_BUCKET;
  return `${process.env.MINIO_PUBLIC_URL}/${bucket}/${fileName}`;
}

// Xóa object khỏi MinIO
async function deleteFromMinio(fileName, type = 'default') {
  if (type === 'img-product') {
    const parsed = path.parse(fileName);
    const thumbName = path.join(parsed.dir, `${parsed.name}_thumb${parsed.ext}`);
    // Xoá cả ảnh thumb và original
    await minioClient.removeObject(bucket, thumbName);
    await minioClient.removeObject(bucket, fileName);
    console.log(`🗑️ Deleted ${fileName} from MinIO`);
    console.log(`🗑️ Deleted ${thumbName} from MinIO`);
  } else {
    await minioClient.removeObject(bucket, fileName);
     console.log(`🗑️ Deleted ${fileName} from MinIO`);
  }
}

module.exports = {
  initMinioBucket,
  uploadToMinio,
  deleteFromMinio,
  getPublicUrl
};