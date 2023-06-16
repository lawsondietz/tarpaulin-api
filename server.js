require('dotenv').config()

const express = require('express')
const morgan = require('morgan')
const redis = require('redis')

const api = require('./api')
const sequelize = require('./lib/sequelize')
const { requireAuthentication, verifyAuthentication } = require('./lib/auth')

const app = express();
const port = process.env.PORT || 8080;

// Redis information
const redisHost = process.env.REDIS_HOST || "localhost"
const redisPort = process.env.REDIS_PORT || "6379"
const redisClient = redis.createClient({
  url: `redis://${redisHost}:${redisPort}`
})

async function connectRedis() {

  await redisClient.connect()

}

const rateLimitWindowMillis = 60000

async function rateLimit(req, res, next) {

  let rateLimitMaxRequests
  let rateLimitRefreshRate
  
  verify = verifyAuthentication(req)

  // Set to 30 for authorized users, else 10
  rateLimitMaxRequests = verify ? 30 : 10
  rateLimitRefreshRate = rateLimitMaxRequests / rateLimitWindowMillis

  let tokenBucket
  try {

      tokenBucket = await redisClient.hGetAll(req.ip)

  } catch (e) {

      next()
      return

  }

  tokenBucket = {
      tokens: parseFloat(tokenBucket.tokens) || rateLimitMaxRequests,
      last: parseInt(tokenBucket.last) || Date.now()
  }

  
  const timestamp = Date.now()
  const ellapsedMillis = timestamp - tokenBucket.last
  tokenBucket.tokens += ellapsedMillis * rateLimitRefreshRate
  tokenBucket.tokens = Math.min(tokenBucket.tokens, rateLimitMaxRequests)
  tokenBucket.last = timestamp

  if (tokenBucket.tokens >= 1) {
      tokenBucket.tokens -= 1
      await redisClient.hSet(req.ip, [
          [ "tokens", tokenBucket.tokens ],
          [ "last", tokenBucket.last ]
      ])
      next()

  } else {

      await redisClient.hSet(req.ip, [
          [ "tokens", tokenBucket.tokens ],
          [ "last", tokenBucket.last ]
      ])
      res.status(429).send({ error: "Too many requests per minute" })

  }
}


/*
 * Morgan is a popular request logger.
 */
app.use(morgan('dev'));

app.use(express.json());
app.use(express.static('public'));
app.use(rateLimit)


/*
 * All routes for the API are written in modules in the api/ directory.  The
 * top-level router lives in api/index.js.  That's what we include here, and
 * it provides all of the routes.
 */
app.use('/', api);

app.use('/', function (req, res, next) {
  res.status(404).json({
    error: "Requested resource " + req.originalUrl + " does not exist"
  });
});

/*
 * This route will catch any errors thrown from our API endpoints and return
 * a response with a 500 status to the client.
 */
app.use('/', function (err, req, res, next) {
  console.error("== Error:", err)
  res.status(500).send({
      err: "Server error.  Please try again later."
  })
})

sequelize.sync().then(async function () {
  try {

    await connectRedis()

  } catch (err) {

    console.log("Error connecting to redis server: ", err)

  }
  app.listen(port, function() {
    console.log("== Server is running on port", port);
  });
})