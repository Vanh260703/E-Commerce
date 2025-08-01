const express = require('express');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const methodOverride = require('method-override');
const cookieParser = require('cookie-parser');
const { engine } = require('express-handlebars');
const app = express();
const path = require('path');
const PORT = process.env.PORT || 3000;

// Call Function Helpers
const formatDate = require('./utils/formatDate.helper');
const eq = require('./utils/eq.helper');

const db = require('./config/db');
const { initMinioBucket } = require('./services/uploadMinioService');

// Kết nối đến db
db.connect();
// Khởi tạo bucket
initMinioBucket();
const route = require('./routes');

app.use(express.static(path.join(__dirname, 'public')));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(methodOverride('_method'));



app.engine(
    'hbs',
    engine({
        extname: '.hbs',
        helpers: {
            formatDate,
            eq,
        }
    })
)

app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'resources/views'));

route(app);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);

});