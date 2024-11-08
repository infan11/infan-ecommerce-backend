const express = require('express');
const cors = require('cors');
const app = express()
require("dotenv").config();
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const port = process.env.PORT || 5000;

// middlewere

app.use(express.json())
app.use(cors())


// api 

const uri = `mongodb+srv://${process.env.DBNAME}:${process.env.DBPASSWORD}@cluster0.lopynog.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const usersCollection = client.db("infanEcomerceWeb").collection("users");
    const addItemsCollection = client.db("infanEcomerceWeb").collection("addItems");
    const cartCollection = client.db("infanEcomerceWeb").collection("cart");
    // const addBooksItemCollection = client.db("infanEcomerceWeb").collection("addBooksItem");
    // jwt token api 
    
    // users api 
    app.get("/users" , async (req, res) => {
      const result = await usersCollection.find().toArray()
      res.send(result)
    })
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const existingUser = await usersCollection.findOne(query)
      if (existingUser) {
        return res.send({ message: "user already exist", insertedId: null })
      }
      const result = await usersCollection.insertOne(user);
      console.log(result);
      res.send(result)
    })
    app.delete("/users/:id" , async (req , res) => {
      const id = req.params.id;
      const query = {_id : new ObjectId(id)}
      const result = await usersCollection.deleteOne(query)
      res.send(result)
    })
    // user admin 
    app.patch("/users/admin/:id" , async (req, res) => {
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)}
      const updatedDoc  = {
        $set : {
          role : "admin"
        }
      }
      const result = await usersCollection.updateOne(filter , updatedDoc)
      res.send(result);
    })
    // Add items api
    app.get('/addItems' , async (req ,res) => {
      const result = await addItemsCollection.find().toArray()
      res.send(result)
    })
    app.get('/addItems/:id' , async (req, res) => {
      const id = req.params.id;
      const query = {_id : new ObjectId(id)}
      const result = await addItemsCollection.findOne(query);
      res.send(result)     
    })
    app.post("/addItems" , async (req, res) => {
      const addItem = req.body; 
      const result = await addItemsCollection.insertOne(addItem);
      res.send(result)
    })
    // Add books item api 
    // app.get("/addBooksItem" , async (req , res ) => {
    //   const  result = await addBooksItemCollection.find().toArray();
    //   res.send(result);
    // })
    // app.get("/addBooksItem/:id" , async (req , res) => {
    //   const id  = req.params.id;
    //   const query = {_id : new ObjectId(id)}
    //   const result = await addBooksItemCollection.findOne(query);
    //   res.send(result)
    // })
    // app.post('/addBooksItem' , async (req , res) => {
    //   const bookItem = req.body;
    //   const result = await addBooksItemCollection.insertOne(bookItem);
    //   res.send(result)
    // })
    // cart api 
    app.get("/cart" , async (req, res) => {
      const email = req.query.email;
      const query = {email : email}
      const result  = await cartCollection.find(query).toArray();
      res.send(result);
    })
    app.post("/cart" , async (req, res ) => {
      const cartItem = req.body;
      const result = await cartCollection.insertOne(cartItem)
      res.send(result)
    })  
    app.delete("/cart/:id" , async (req, res) => {
      const id = req.params.id;
      const query = {_id : new ObjectId(id)};
      const result = await cartCollection.deleteOne(query)
      res.send(result) ;
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", async (req, res) => {
  res.send("Infan Ecommerce Web Running")
})
app.listen(port, () => {
  console.log(`Signel infan ecommerce web server port ${port}`);
})