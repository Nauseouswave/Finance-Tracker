const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
    name: String,
    type: String,
    amount: Number,
    transactionType: {
        type: String,
        enum: ['credit', 'debit'],
        required: true
    },
    userId: mongoose.Schema.Types.ObjectId,
    date: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Expense', expenseSchema);