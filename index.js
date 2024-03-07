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
const port = process.env.PORT || 3000;

const app = express();

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
    }
});

const User = mongoose.model('User', userSchema);

app.get('/', function(req, res) {
    User.findById(req.session.userId)
        .then(user => {
            console.log(user);
            res.render('index', { user: user, currentPage: 'home'});
        })
        .catch(err => {
            console.log(err);
            res.redirect('/');
        });
});


app.listen(port, function() {
    console.log('App is running on http://localhost:' + port);
  });

const expenseSchema = new mongoose.Schema({
    name: String,
    type: String,
    amount: Number,
    userId: mongoose.Schema.Types.ObjectId,
});

const Expense = mongoose.model('Expense', expenseSchema);

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
        return res.render('login', { error: 'Cannot find user' });
    }

    try {
        if (await bcrypt.compare(req.body.password, user.password)) {
            req.session.userId = user._id;
            res.redirect('/expenses');
        } else {
            res.render('login', { error: 'Incorrect password' });
        }
    } catch {
        res.status(500).send();
    }
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.get('/login', (req, res) => {
    const message = req.session.message;
    req.session.message = null; // Clear the message
    res.render('login', { message: message });
});

app.get('/expenses', async (req, res) => {
    if (!req.session.userId) {
        req.session.message = 'You need to log in to view the Expenses page';
        return res.redirect('/login');
    }

    try {
        const expenses = await Expense.find({ userId: req.session.userId });
        const user = await User.findById(req.session.userId);
        res.render('expenses', {user: user, expenses: expenses, currentPage: 'expenses' });
    } catch (err) {
        res.status(500).send(err);
    }
});

app.post('/expenses', async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }

    try {
        const expense = new Expense({ ...req.body, userId: req.session.userId });
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

app.get('/profile', function(req, res) {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    User.findById(req.session.userId)
        .then(user => {
            res.render('profile', { user: user, currentPage: 'profile'});
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

app.use('/uploads', express.static('uploads'));
app.use('/images', express.static('images'));