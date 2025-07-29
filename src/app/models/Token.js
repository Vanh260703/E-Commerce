const mongoose = require('mongoose');

const TokenSchema = new mongoose.Schema({
    userID: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    token: {type: String, required: true},
    expiresAt: {type: Date, require: true},
},{ timestamps: true })

module.exports = mongoose.model('Token', TokenSchema);
