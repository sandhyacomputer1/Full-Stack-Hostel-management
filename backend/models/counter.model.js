const mongoose = require("mongoose");

const counterSchema = new mongoose.Schema({
    _id: {
        type: String,
        required: true
    }, // e.g., "employeeCode_2025"
    seq: {
        type: Number,
        default: 0
    }
}, {timestamps: true});

module.exports = mongoose.model("Counter", counterSchema);
