const express = require('express');
const bodyParser = require('body-parser');

var cors = require('cors');
const app = express();
app.use(cors());

app.listen(5000);