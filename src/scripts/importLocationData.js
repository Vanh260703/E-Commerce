const fs = require('fs');
const path = require('path');
require('dotenv').config(); // để đọc biến MONGODB_URI

const { connect } = require('../config/db');
const Province = require('../app/models/Province');
const Ward = require('../app/models/Ward');

async function importData() {
  try {
    await connect(); // dùng lại kết nối sẵn có

    const provinces = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/provinces.json'), 'utf-8'));
    const wards = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/wards.json'), 'utf-8'));

    await Province.deleteMany({});
    await Ward.deleteMany({});

    await Province.insertMany(provinces);
    await Ward.insertMany(wards);

    console.log('✅ Import dữ liệu tỉnh và phường thành công!');
    process.exit();
  } catch (err) {
    console.error('❌ Lỗi import:', err);
    process.exit(1);
  }
}

importData();
