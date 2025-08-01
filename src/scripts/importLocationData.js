const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { connect } = require('../config/db');
const Province = require('../app/models/Province');
const Ward = require('../app/models/Ward');

async function importData() {
  try {
    await connect(); // kết nối DB trước

    const provinceCount = await Province.countDocuments();
    if (provinceCount > 0) {
      console.log('✅ Dữ liệu tỉnh đã tồn tại, bỏ qua import.');
      process.exit(0);
    }

    const provinces = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/provinces.json'), 'utf-8'));
    const wards = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/wards.json'), 'utf-8'));

    await Province.deleteMany({});
    await Ward.deleteMany({});

    await Province.insertMany(provinces);
    await Ward.insertMany(wards);

    console.log('✅ Import dữ liệu tỉnh và phường thành công!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Lỗi import:', err);
    process.exit(1);
  }
}

importData();
