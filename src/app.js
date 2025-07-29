const express = require('express');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const methodOverride = require('method-override');
const moment = require('moment');
const { engine } = require('express-handlebars');
const app = express();
const path = require('path');
const PORT = process.env.PORT || 3000;

const db = require('./config/db');

// Kết nối đến db
db.connect();

const route = require('./routes');

app.use(express.static(path.join(__dirname, 'public')));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(methodOverride('_method'));



app.engine(
    'hbs',
    engine({
        extname: '.hbs',
    })
)

app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'resources/views'));

route(app);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);

});