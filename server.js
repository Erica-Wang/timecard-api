const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const routes = require('./routes');
require('dotenv').config();

express()
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.json({}))
  .listen(5000, () => console.log(`Listening on 5000 }`))
