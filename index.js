const express = require('express');
const mongoose = require('mongoose');
const methodOverride = require('method-override');
const bcrypt = require('bcryptjs');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const app = express();
const port = process.env.PORT || 3000;


/** Local Imports */
const Expense = require('./models/Expense');
const User = require('./models/User');

app.use(session({
    secret: 'some secret',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: 'mongodb://localhost/finance_tracker' })
}));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(passport.initialize());
app.use(passport.session());

app.use(express.static(path.join(__dirname, 'public')));
app.use(methodOverride('_method'));

mongoose.connect('mongodb://localhost/finance_tracker');

app.get('/', function (req, res) {
    User.findById(req.session.userId)
        .then(user => {
            console.log(user);
            res.render('index', { user: user, currentPage: 'home' });
        })
        .catch(err => {
            console.log(err);
            res.redirect('/');
        });
});


app.listen(port, function () {
    console.log('App is running on http://localhost:' + port);
});

app.use(express.urlencoded({ extended: true }));

// Registration route
app.post('/register', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const user = new User({
            username: req.body.username,
            password: hashedPassword,
            name: req.body.name,
            email: req.body.email,
            joinDate: Date.now(),
        });
        await user.save();
        req.session.userId = user._id;
        res.redirect('/expenses');
    } catch {
        res.redirect('/register');
    }
});

app.post('/login', async (req, res) => {
    const user = await User.findOne({ username: req.body.username });
    if (user == null) {
        return res.render('login', { error: 'Cannot find user', currentPage: 'login', user: null });
    }

    try {
        if (await bcrypt.compare(req.body.password, user.password)) {
            req.session.userId = user._id;
            res.redirect('/expenses');
        } else {
            res.render('login', { error: 'Incorrect password', currentPage: 'login', user: null });
        }
    } catch {
        res.status(500).send();
    }
});

app.get('/register', (req, res) => {
    res.render('register', { user: req.user, currentPage: 'register' });
});

app.get('/login', (req, res) => {
    const message = req.session.message;
    req.session.message = null; // Clear the message
    res.render('login', { message: message, currentPage: 'login', user: null });
});

app.get('/expenses', async (req, res) => {
    if (!req.session.userId) {
        req.session.message = 'You need to log in to view the Expenses page';
        return res.redirect('/login');
    }

    try {
        const expenses = await Expense.find({ userId: req.session.userId });
        const user = await User.findById(req.session.userId);
        res.render('expenses', { user: user, expenses: expenses, currentPage: 'expenses', balance: user.balance });
    } catch (err) {
        res.status(500).send(err);
    }
});

app.post('/expenses', async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }

    const type = req.body.transactionType === 'credit' ? req.body.source : req.body.type;
    const name = req.body.transactionType === 'credit' ? req.body.creditName : req.body.debitName;

    try {
        // Create a new expense with the request body, user ID, name, and type
        const expense = new Expense({ ...req.body, name, type, userId: req.session.userId });
        await expense.save();

        // Find the user and update their balance
        const user = await User.findById(req.session.userId);
        if (expense.transactionType === 'credit') {
            user.balance += expense.amount;
        } else if (expense.transactionType === 'debit') {
            user.balance -= expense.amount;
        }
        await user.save();

        res.redirect('/expenses');
    } catch (err) {
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
        const { name, type, amount, transactionType } = req.body;
        const expense = await Expense.findById(req.params.id);
        const user = await User.findById(req.session.userId);

        let balanceChange = 0;
        if (expense.transactionType !== transactionType) {
            if (transactionType === 'debit') {
                balanceChange = -2 * expense.amount;
            } else {
                balanceChange = 2 * expense.amount;
            }
        } else if (expense.amount !== amount) {
            balanceChange = expense.transactionType === 'debit' ? expense.amount - amount : amount - expense.amount;
        }

        user.balance += balanceChange;
        await user.save();

        await Expense.findByIdAndUpdate(req.params.id, { name, type, amount, transactionType });

        res.redirect('/expenses');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});
app.get('/profile', function (req, res) {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    User.findById(req.session.userId)
        .then(user => {
            res.render('profile', { user: user, currentPage: 'profile' });
        })
        .catch(err => {
            console.log(err);
            res.redirect('/');
        });
});

app.post('/profile/picture', upload.single('profilePicture'), async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        user.profilePicture = req.file.path;
        await user.save();
        res.redirect('/profile');
    } catch {
        res.redirect('/profile');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.redirect('/');
        }

        res.clearCookie('connect.sid');
        res.redirect('/login');
    });
});

app.delete('/expenses/:id', async (req, res) => {
    console.log('Deleting expense with ID:', req.params.id);
    try {
        const expense = await Expense.findById(req.params.id);
        if (!expense) return res.status(404).send();
        console.log('transactionType:', expense.transactionType);
        console.log('amount type:', typeof expense.amount);

        const user = await User.findById(req.session.userId).catch(console.error);
        if (!user) return res.status(404).send('User not found');
        if (expense.transactionType === 'credit') {
            user.balance -= expense.amount;
        } else if (expense.transactionType === 'debit') {
            user.balance += expense.amount;
        }
        await user.save();

        await Expense.findByIdAndDelete(req.params.id).catch(console.error);
        res.status(200).send();
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

app.get('/dashboard', async (req, res) => {
    if (!req.session.userId) {
        req.session.message = 'You need to log in to view the Dashboard';
        return res.redirect('/login');
    }

    try {
        const debits = await Expense.countDocuments({ userId: req.session.userId, transactionType: 'debit' });
        const credits = await Expense.countDocuments({ userId: req.session.userId, transactionType: 'credit' });

        const user = await User.findById(req.session.userId);
        const recentExpenses = await Expense.find({ userId: req.session.userId })
            .sort({ date: -1 }) // sort by date in descending order
            .limit(5); // limit the result to 5
        res.render('dashboard', { user: user, expenses: recentExpenses, currentPage: 'dashboard', debits: debits, credits: credits });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.use('/uploads', express.static('uploads'));
app.use('/images', express.static('images'));