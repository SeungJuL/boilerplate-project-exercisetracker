const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const { MongoClient, ObjectId } = require('mongodb')

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors())
app.use(express.static('public'))

let db;
const url = process.env.DB_URL;
new MongoClient(url).connect().then((client)=>{
  console.log('Success connecting DB')
  db = client.db('exercise')
  const listener = app.listen(process.env.PORT || 3000, () => {
    console.log('Your app is listening on port ' + listener.address().port)
  })
}).catch((err)=>{
  console.log(err)
})

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.route('/api/users').get(async (req, res) => {
  // get all the users data from db and send
  let result = await db.collection('users').find().toArray();
  res.send(result);

}).post(async (req, res) => {
  // save the user data to db
  await db.collection('users').insertOne({
    username: req.body.username
  });
  // get the user id from db
  let result = await db.collection('users').findOne({
    username: req.body.username
  });

  res.json({
    username: result.username,
    _id: result._id
  });
});

app.post('/api/users/:_id/exercises', async (req, res) => {
  // check if there is date input
  let date;
  if(req.body.date) {
    date = new Date(req.body.date);
  } else {
    date = new Date();
  };
  
  // save datas to db
  await db.collection('exercises').insertOne({
    userId: req.params._id,
    description: req.body.description,
    duration: Number(req.body.duration),
    date: date
  });

  // get username info from db
  let result = await db.collection('users').findOne({
    _id: new ObjectId(req.params._id)
  });

  // save datas to a object
  let exerciseData = {
    username: result.username,
    description: req.body.description,
    duration: Number(req.body.duration),
    date: date.toDateString(),
    _id: req.params._id
  };

  res.send(exerciseData);
})



app.get('/api/users/:_id/logs', async (req, res) => {
  
  // get user info from id
  const { from, to, limit } = req.query;
  let userResult = await db.collection('users').findOne({
    _id: new ObjectId(req.params._id)
  });

  // make a query filter
  let query = {
    userId: req.params._id
  };

  if(from || to) {
    query.date = {};
    if(from) {
      query.date.$gte = new Date(from);
    }
    if(to) {
      query.date.$lte = new Date(to);
    }
  }

  // find the data from db with query filter
  const exerciseResult = await db.collection('exercises').find(query).limit(Number(+limit ?? 500)).toArray();
  const log = exerciseResult.map(e => ({
    description: e.description,
    duration: e.duration,
    date: new Date(e.date).toDateString()
  }))

  let userFullData = {
    username: userResult.username,
    count: exerciseResult.length,
    _id: req.params._id,
    log: log
  };

  res.send(userFullData);
})

