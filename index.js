const express = require('express')
const app = express()
const cors = require('cors');
var admin = require("firebase-admin");
require("dotenv").config();
const { MongoClient } = require('mongodb');
const ObjectId = require('mongodb').ObjectId;
// const stripe = require('stripe')(process.env.STRIPE_SECRET)


const port = process.env.PORT || 5000

app.use(cors());
app.use(express.json());

var serviceAccount = require("./doctors-4f03c-firebase-adminsdk-xuojg-d74c19d949.json");

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.9nw5f.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});


async function verifyToken(req, res, next) {
  if (req.headers?.authorization?.startsWith('Bearer ')) {
    const token = req.headers.authorization.split(' ')[1];

    try {
      const decodedUser = await admin.auth().verifyIdToken(token)
      req.decodedEmail = decodedUser.email
    }
    catch { }
  }
  next()
}

async function run() {
  try {
    await client.connect();
    const database = client.db('doctor_portals');
    const doctorCollection = database.collection('doctors');
    const usersCollection = database.collection('users');
    const appointmentCollection = database.collection('appointment');
    const ambulanceCollection = database.collection('ambulance');



    //get doctors
    app.get('/doctors', async (req, res) => {

      const cursor = doctorCollection.find({});
      const doctor = await cursor.toArray();
      res.send(doctor);
    })

    //doctor post api
    app.post('/doctors', async (req, res) => {
      const doctor = req.body;
      const result = await doctorCollection.insertOne(doctor)

      res.json(result)
    })

    // doctor update 
    app.put("/doctors/:id", async (req, res) => {
      const token = req.body;
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const updateDoc = {
        $set: token
      };
      const result = await doctorCollection.updateOne(filter, updateDoc);
      res.json(result);;
    });

    //doctor delete
    app.delete("/doctors/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const cursor = await doctorCollection.deleteOne(query);
      res.json(cursor);
    });

    //user post api
    app.post('/users', async (req, res) => {
      const appointment = req.body;
      const result = await usersCollection.insertOne(appointment)
      console.log(result);
      res.json(result)
    })

    //user put api for google  
    app.put('/users', async (req, res) => {
      const user = req.body;
      const filter = { email: user.email };
      const options = { upsert: true };
      const updateDoc = { $set: user };
      const result = await usersCollection.updateOne(filter, updateDoc, options);
      res.json(result);
    })

    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const cursor = await usersCollection.findOne(query);
      let isAdmin = false;
      if (cursor?.role == "admin") {
        isAdmin = true;
      }
      res.json({ admin: isAdmin });
    });

    app.put("/users/admin", verifyToken, async (req, res) => {
      const user = req.body;
      const requester = req.decodedEmail;
      console.log(requester);
      if (requester) {
        const requesterAccount = await usersCollection.findOne({
          email: requester,
        });
        if (requesterAccount?.role == "admin") {
          const filter = { email: user.email };
          const updateDoc = {
            $set: { role: "admin" },
          };
          const result = await usersCollection.updateOne(filter, updateDoc);
          res.json(result);
        } else {
          res.status(403).json({ message: "you do not have to access admin" });
        }
      }
    });

    //apointment get api
    app.get('/appoinment', async (req, res) => {
      const params = req.params;

      const cursor = appointmentCollection.find({});
      const order = await cursor.toArray();
      // console.log(order);
      res.json(order);
    })

    //appointment post api
    app.post('/appoinment', async (req, res) => {
      const appointment = req.body;
      const result = await appointmentCollection.insertOne(appointment)

      res.json(result)
    })

    //Delete appointment API

    app.delete('/appoinment/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      console.log(query);
      const result = await appointmentCollection.deleteOne(query);
      // console.log("delet with id:", result);
      res.json(result);
    })

    //ambulance post api
    app.post('/ambulance', async (req, res) => {
      const ambulance = req.body;
      const result = await ambulanceCollection.insertOne(ambulance)
      res.json(result)
    })

    //get ambulance
    app.get('/ambulance', async (req, res) => {
      const cursor = ambulanceCollection.find({});
      const ambulance = await cursor.toArray();
      res.send(ambulance);
    })

    //ambulance delete
    app.delete("/ambulance/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const cursor = await ambulanceCollection.deleteOne(query);
      res.json(cursor);
    });
  }


  finally {

  }
}
run().catch(console.dir);

console.log(uri);
app.get('/', (req, res) => {
  res.send('Hello doctor portal')
})

app.listen(port, () => {
  console.log(` listening at ${port}`)
})