const Province = require('../models/Province');
const Ward = require('../models/Ward');

class LocationController {
    // [GET] /api/provinces
    provinces(req, res) {
        Province.find({}).lean()
            .then((provinces) => {
                res.json(provinces);
            })
            .catch((err) => {
                console.log(err);
            })
    };

    // [GET] /api/wards/:provinces
    wards(req, res) {
        const provinceCode = req.params.provinceCode;
        Ward.find({ province_code: provinceCode }).lean()
            .then((wards) => {
                res.json(wards);
            })
            .catch((err) => {
                console.log(err);
            })
    };
}

module.exports = new LocationController();