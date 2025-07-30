// FormatDate Helper
const moment = require('moment');

function formatDate (date) {
    return moment(date).format('DD-MM-YYYY');
};

module.exports = formatDate;