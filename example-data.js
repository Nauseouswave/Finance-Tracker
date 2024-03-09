/* This file is meant to add sample data to a specific user */

const mongoose = require('mongoose');
const Expense = require('./models/Expense');

mongoose.connect('mongodb://localhost/finance_tracker');

const sampleExpenses = [
    {
        userId: '65ea203db85b3446a634f537',
        transactionType: 'debit',
        amount: 50,
        name: 'Groceries',
        type: 'Food',
        date: new Date()
    },
    {
        userId: '65ea203db85b3446a634f537',
        transactionType: 'credit',
        amount: 100,
        name: 'Salary',
        type: 'Income',
        date: new Date()
    },
    {
        userId: '65ea203db85b3446a634f537',
        transactionType: 'debit',
        amount: 75,
        name: 'Electricity bill',
        type: 'Utilities',
        date: new Date()
    },
    {
        userId: '65ea203db85b3446a634f537',
        transactionType: 'debit',
        amount: 30,
        name: 'Gas',
        type: 'Transport',
        date: new Date()
    }
];

Expense.insertMany(sampleExpenses)
    .then(() => console.log('Sample expenses inserted'))
    .catch(err => console.log(err));