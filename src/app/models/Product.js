const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema(
    {
        name: {type: String, required: true},
        description: String,
        price: {type: Number, required: true},
        stockQuantity: {type: Number, required: true},
        imageURL: [{
            url: String,
            alt: String,
        }],
        category: {type: mongoose.Schema.Types.ObjectId, ref: 'Category'},
        unit: {type: String, enum: ['kg', 'gram', 'quả', 'hộp', 'túi']},
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('Product', ProductSchema);