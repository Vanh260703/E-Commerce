const mongoose = require('mongoose');

const AddressSchema = new mongoose.Schema({
    recipientName: String,
    addressLine: String,
    city: String,
    ward: String,
    isDefault: {type: Boolean, default: false},
})

const UserSchema = new mongoose.Schema(
    {
        name: {type: String, required: true},
        username: {type: String, required: true},
        email: {type: String, required: true},
        password: {type: String, required: true},
        phone: {type: String, required: true},
        dateOfBirth: {type:Date, required: true},
        gender: {type: String, enum: ['male', 'female', 'other'], required: true},
        avata: {url: String, publicId: String},
        role: {type: String, enum: ['admin', 'seller', 'user'], default: 'user'},
        addresses: [AddressSchema],
        isVerified: {type: Boolean, default: false},
        passwordResetToken: String,
        passwordResetExpires: Date,
    },
    {
        timestamps: true
    }
)

module.exports = mongoose.model('User', UserSchema);