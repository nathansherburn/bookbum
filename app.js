require('dotenv').config();

const AWS = require('aws-sdk');
const express = require('express');
const session = require('express-session');
const LokiStore = require('connect-loki')(session);
const bodyParser = require('body-parser');

let app, s3;

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY
});

app = express();
s3 = new AWS.S3();

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  session({
    store: new LokiStore({ ttl: 0 }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true
  })
);

var auth = function(req, res, next) {
  if (req.session && req.session.isAuthenticated) {
    return next();
  } else {
    return res.redirect('/login.html');
  }
};

app.post('/login', function(req, res) {
  console.log(req.body);
  let userMatch = req.body.username === 'admin';
  let passwordMatch = req.body.password === process.env.PASSWORD;
  if (userMatch && passwordMatch) {
    req.session.isAuthenticated = true;
    res.redirect('/');
  } else {
    res.redirect('/login.html');
  }
});

app.get('/logout', function(req, res) {
  req.session.destroy();
  res.send('goodbye');
});

app.get('/api/v1/list-books', auth, function(req, res, next) {
  s3.listObjects(
    {
      Bucket: 'bookbum'
    },
    function(err, data) {
      if (err) next();
      res.send(data.Contents);
    }
  );
});

app.get('/api/v1/book/:name', auth, function(req, res, next) {
  s3.getSignedUrl(
    'getObject',
    {
      Bucket: 'bookbum',
      Key: req.params.name,
      Expires: 60 * 5
    },
    function(err, url) {
      if (err) next();
      res.send({ url });
    }
  );
});

app.listen(process.env.PORT);
