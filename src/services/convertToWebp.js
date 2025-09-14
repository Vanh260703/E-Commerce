const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function convertToWebp(inputPath, outputPath, type) {
  try {
    const parsed = path.parse(inputPath);
    const dir = parsed.dir;
    const name = parsed.name;

    console.log('PARSED: ', parsed);
    console.log('DIR: ', dir);
    console.log('NAME: ', name);

    if (type === 'avatar') {
      // Resize về dạng 300x300 cho avatar
      const avatarPath = path.join(dir, `${name}.webp`);
      console.log('AVATAR PATH: ', avatarPath);
      await sharp(inputPath)
        .resize(300, 300, { fit: 'cover' })
        .webp({ quality: 80 })
        .toFile(avatarPath);

      fs.unlinkSync(inputPath); // xóa ảnh gốc
      console.log('✅ Avatar đã convert:', avatarPath);
      return avatarPath;
    }


    if (type === 'img-product') {
      // Đường dẫn ảnh gốc
      const originalPath = path.join(dir, `${name}.webp`);
      // Đường dẫn thumbnail
      const thumbPath = path.join(dir, `${name}_thumb.webp`);

      // Lưu ảnh gốc
      await sharp(inputPath)
        .webp({ quality: 85 }) // chất lượng cao hơn một chút
        .toFile(originalPath);

      // Lưu thumbnail (resize)
      await sharp(inputPath)
        .resize(400, 400, { fit: 'cover' })
        .webp({ quality: 80 })
        .toFile(thumbPath);

      fs.unlinkSync(inputPath); // xóa ảnh gốc
      console.log('✅ Img-product đã convert:', { originalPath, thumbPath });

      return {
        original: originalPath,
        thumbnail: thumbPath,
      };
    }
    throw new Error('❌ Loại ảnh không hợp lệ!');
  } catch (error) {
    console.error('❌ Lỗi khi convert sang webp:', error);
    return null;
  }
}

module.exports = { convertToWebp };
