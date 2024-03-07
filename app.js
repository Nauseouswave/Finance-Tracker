const express = require('express');
const mongoose = require('mongoose');
const methodOverride = require('method-override');
const app = express();
const path = require('path');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

/* Serves static files using express.static to serve from the public */
app.use(express.static(path.join(__dirname, 'public')));

app.use(methodOverride('_method'));

mongoose.connect('mongodb://localhost/finance_tracker');

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});

const expenseSchema = new mongoose.Schema({
    name: String,
    type: String,
    amount: Number
});

const Expense = mongoose.model('Expense', expenseSchema);

app.use(express.urlencoded({ extended: true }));

app.get('/expenses', async (req, res) => {
    try {
        const expenses = await Expense.find();
        res.render('expenses', { expenses: expenses });
    } catch (err) {
        res.status(500).send(err);
    }
});

app.post('/expenses', async (req, res) => {
    try {
        const expense = new Expense(req.body);
        await expense.save();
        res.redirect('/expenses');
    } catch (err) {
        res.status(500).send(err);
    }
});

app.delete('/expenses/:id', async (req, res) => {
    try {
        await Expense.findByIdAndDelete(req.params.id);
        res.redirect('/expenses');
    } catch (err) {
        console.error(err);
        res.status(500).send(err);
    }
});

app.get('/expenses/:id/edit', async (req, res) => {
    try {
        const expense = await Expense.findById(req.params.id);
        res.render('edit', { expense });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.put('/expenses/:id', async (req, res) => {
    try {
        const { name, type, amount } = req.body;
        await Expense.findByIdAndUpdate(req.params.id, { name, type, amount });
        res.redirect('/expenses');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});