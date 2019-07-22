require('dotenv').config()

const AWS = require('aws-sdk')
const express = require('express')
const session = require('express-session')
const LokiStore = require('connect-loki')(session)
const bodyParser = require('body-parser')
const cfsign = require('aws-cloudfront-sign')
const cors = require('cors')

let app, s3

AWS.config.update({
  accessKeyId: process.env.S3_ACCESS_KEY,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
})

app = express()
s3 = new AWS.S3()

app.use(express.static(__dirname + '/client/dist/bookbum'))
app.use(bodyParser.json())
app.use(
  session({
    store: new LokiStore({ ttl: 0 }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
)

app.use(cors({ origin: process.env.CORS_ALLOW, credentials: true }))
let auth = function(req, res, next) {
  if (req.session && req.session.isAuthenticated) {
    return next()
  } else {
    res.status(401).end()
  }
}

app.post('/login', function(req, res) {
  let emailMatch = req.body.email === 'admin'
  let passwordMatch = req.body.password === process.env.PASSWORD
  if (emailMatch && passwordMatch) {
    req.session.isAuthenticated = true
    res.json({ success: true })
  } else {
    res.json({ success: false })
  }
})

app.get('/logout', function(req, res) {
  req.session.destroy()
  res.json({ success: true })
})

app.get('/books', auth, function(req, res, next) {
  s3.listObjects({ Bucket: 'bookbum' }, function(err, data) {
    if (err) res.status(500).end()
    res.json(data.Contents)
  })
})

app.get('/books/:name', auth, function(req, res, next) {
  let signingParams = {
    keypairId: process.env.CF_ACCESS_KEY.replace(/\\n/g, '\n'),
    privateKeyString: process.env.CF_PRIVATE_KEY.replace(/\\n/g, '\n'),
    expireTime: new Date().getTime() + 60 * 60 * 3,
  }
  let url = cfsign.getSignedUrl(
    'http://d3g3vsgnvsbggq.cloudfront.net/' + req.params.name,
    signingParams
  )
  res.json({ url })
})

app.listen(process.env.PORT)
