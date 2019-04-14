const AWS = require('aws-sdk')
const express = require('express')

// Load environment variables from .env file
require('dotenv').config()

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY
})

const app = express()
const s3 = new AWS.S3()

app.use(express.static(__dirname + '/public'));

app.get('/api/v1/list-books', function (req, res, next) {
  s3.listObjects({
    Bucket: 'bookbum'
  }, function (err, data) {
    if (err) next()
    res.send(data.Contents)
  });
})

app.get('/api/v1/book/:name', function (req, res, next) {
  s3.getSignedUrl('getObject', {
    Bucket: 'bookbum',
    Key: req.params.name,
    Expires: 60 * 5
  }, function (err, url) {
    if (err) next()
    res.send({ url })
  })
})

app.listen(process.env.PORT)