const mongoose = require('mongoose');

const wardSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  province_code: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model('Ward', wardSchema);
