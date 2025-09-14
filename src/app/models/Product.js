const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema(
    {
        name: {type: String, required: true},
        sortDescription: String,
        description: String,
        origin: String,
        expiry: String,
        storage: {
            instructions: String,
            temperature: String,
        },
        nutritionFacts: {
        calories: Number, // kcal
        vitamins: [String],
        },
        price: {type: Number, required: true},
        discount:{type: Number, default: 0, min: 0, max: 100},
        priceHaveDiscount: {type: Number, default: 0},
        isDiscount: {type: Boolean, default: false},
        unlimitDiscount: {type: Boolean, default: false},
        discountStart: Date,
        discountExpiry: Date,
        stockQuantity: {type: Number, required: true},
        sold: {type: Number, default: 0},
        imageURL: [{
            original: String,
            thumbnail: String,
            url: String,
            alt: String,
        }],
        category: {type: mongoose.Schema.Types.ObjectId, ref: 'Category'},
        unit: {type: String, required: true},
        createdBy: {type: String},
        updatedBy: {type: String},
        updatedAt: Date,
        deletedBy: {type: String},
        slug: {type: String, required: true},
        categorySlug: String,
        isFeatured: {type: Boolean, required: false},
        rating: {
            count: {type: Number, default: 0},
            total: {type: Number, default: 0},
            average: { type: Number, default: 0, min: 0, max: 5},
        }
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('Product', ProductSchema);