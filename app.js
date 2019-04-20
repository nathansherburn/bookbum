require('dotenv').config();

const AWS = require('aws-sdk');
const express = require('express');
const session = require('express-session');
const LokiStore = require('connect-loki')(session);
const bodyParser = require('body-parser');
const cfsign = require('aws-cloudfront-sign');

let app, s3;

AWS.config.update({
  accessKeyId: process.env.S3_ACCESS_KEY,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
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

let auth = function(req, res, next) {
  if (req.session && req.session.isAuthenticated) {
    return next();
  } else {
    return res.redirect('/login.html');
  }
};

app.post('/login', function(req, res) {
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

app.get('/list-books', auth, function(req, res, next) {
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

app.get('/book/:name', auth, function(req, res, next) {
  let signingParams = {
    keypairId: process.env.CF_ACCESS_KEY.replace(/\\n/g, '\n'),
    privateKeyString: process.env.CF_PRIVATE_KEY.replace(/\\n/g, '\n'),
    expireTime: new Date().getTime() + 60 * 60 * 3
  };
  let url = cfsign.getSignedUrl(
    'http://d3g3vsgnvsbggq.cloudfront.net/' + req.params.name,
    signingParams
  );
  res.send({ url });
});

app.listen(process.env.PORT);
