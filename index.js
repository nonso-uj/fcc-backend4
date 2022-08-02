const express = require('express')
const mongoose = require('mongoose')
const bodyParser = require('body-parser')
require('dotenv').config()

mongoose.connect(process.env.MONGO_URI, {useNewUrlParser: true, useUnifiedTopology: true})

const app = express()
const cors = require('cors')
const bodyP = bodyParser.urlencoded({extended: false})


let userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    index: true
  }
})

const User = mongoose.model('User', userSchema)


const exerciseSchema = new mongoose.Schema({
  // user ref w/ id
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  description: String,
  duration: Number,
  date: String
})

const Exercise = mongoose.model('Exercise', exerciseSchema)

app.use(bodyP)

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});




app.post('/api/users', (req, res) => {
  let newUser = new User({
    username: req.body.username
  });

  newUser.save(function(err, data){
    if(err) return console.log(err)
    res.json({
      username: data.username,
      _id: data._id
    })
  })
})



app.get('/api/users', (req, res) => {
  User.find().select('username _id').exec((err, data)=> {
    if(err) return console.log(err)
    res.json(data)
  })
})





app.post('/api/users/:_id/exercises', (req, res) => {
  let realDate = req.body.date
  
  console.log('reqbody: ', req.body.description, req.body.duration, realDate, req.params._id)
  
  if(realDate == undefined || realDate == ''){
    realDate = new Date()
  }else{
    realDate = new Date(req.body.date)
  }

  realDate = realDate.toISOString().split('T')[0]

  let uid
  if(req.params._id){
    uid = req.params._id
  }else if(req.body[':_id']){
    uid = req.body[':_id']
  }else if(!req.params._id || req.params._id == undefined){
    console.log('gotemp')
    res.json({error: 'ID not found'})
  }
  
  let newExercise = new Exercise({
    user: uid,
    description: req.body.description,
    duration: req.body.duration,
    date: realDate
  })

  newExercise.save(function(err, data){
    if(err) return console.log(err)

    console.log('data:p ', data)
    User.findById(data.user, (err, result) => {
      if(err) return console.log(err)
      console.log('result:p ', result)
      res.json({
      username: result.username,
      description: data.description,
      duration: data.duration,
      date: new Date(data.date).toUTCString().replace(/\d\d:.*/, '').replace(/\s$/, '').replace(/,/, '').replace(/\s([\d]{2})\s([a-zA-Z]{3})\s/, ' $2 $1 '),
      _id: data.user,
    })
    })
  })

})









app.get('/api/users/:_id/logs', (req, res) => {
  console.log('req.query: ', req.query)
  let newResults = []
  let queryLimit = 0
  let queryFrom = 0
  let queryTo = 3000

  if(req.query.limit){
    queryLimit = req.query.limit
  }
  if(req.query.from){
    queryFrom = req.query.from
  }
  if(req.query.to){
    queryTo = req.query.to
  }

  console.log('reqparams id: ', req.params._id)
  console.log('queries: ', req.query.from, req.query.to ,req.query.limit)

  User.findById(req.params._id, function(err, data){
    if(err) return console.log(err)

    console.log('found data')
    Exercise.find({user: data._id, date: {$gte: queryFrom, $lte: queryTo}}).select('description duration date -_id').limit(queryLimit).lean().exec((err, result) => {
      if(err) return console.log(err)

      console.log('found result')
      // console.log('result: ', result)
      result = result.reduce((r, c, i, a) => {
        r = {}
        for(let o in c){
          if(o == 'date'){
            // console.log(o)
            r[o] = new Date(c[o]).toUTCString().replace(/\d\d:.*/, '').replace(/,/, '').replace(/\s([\d]{2})\s([a-zA-Z]{3})\s/, ' $2 $1 ').replace(/\s$/, '')
          }else{
            r[o] = c[o]
          }
        };
        newResults.push(r)
        return r;
      }, {})
      // console.log('newResults: ', newResults)
      console.log('sorted result')
      Exercise.countDocuments({user: data._id}, function(e, c){
        if(e) return console.log(e)

        console.log('found count')
        res.json({
          username: data.username,
          count: c,
          _id: data._id,
          log: newResults
        })
      })
    })
  })
})








const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
