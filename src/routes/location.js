const express = require('express');
const router = express.Router();

const locationController = require('../app/controllers/LocationController');

router.get('/provinces', locationController.provinces);

router.get('/wards/:provinceCode', locationController.wards);

module.exports = router;