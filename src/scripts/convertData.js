const fs = require('fs');
const path = require('path');

const raw = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/data.json'), 'utf-8'));

const provinces = [];
const wards = [];

Object.values(raw).forEach(province => {
  if (province.Id && province.Name) {
    provinces.push({
      code: province.Id,
      name: province.Name
    });

    Object.values(province.Districts || []).forEach(district => {
      Object.values(district.Wards || []).forEach(ward => {
        if (ward.Id && ward.Name) {
          wards.push({
            code: ward.Id,
            name: ward.Name,
            province_code: province.Id
          });
        }
      });
    });
  } else {
    console.warn('⚠️ Province thiếu Id hoặc Name:', province);
  }
});

fs.writeFileSync(path.join(__dirname, '../data/provinces.json'), JSON.stringify(provinces, null, 2));
fs.writeFileSync(path.join(__dirname, '../data/wards.json'), JSON.stringify(wards, null, 2));

console.log('✅ Đã tách xong chỉ provinces + wards (bỏ districts).');
