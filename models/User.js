const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    joinDate: {
        type: Date,
        default: Date.now
    },
    profilePicture: {
        type: String,
        default: '/images/default-profile.jpg'
    },

    balance: {
        type: Number,
        default: 0
    }
});

module.exports = mongoose.model('User', userSchema);