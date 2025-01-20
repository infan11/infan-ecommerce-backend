const express = require('express');
const cors = require('cors');
const app = express()
require("dotenv").config();
const jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.VITE_STRIPE_SECRET_KEY);
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
    const checkOutCollection = client.db("infanEcomerceWeb").collection("checkOut");
    const paymentsCollection = client.db("infanEcomerceWeb").collection("payments");
    // const addBooksItemCollection = client.db("infanEcomerceWeb").collection("addBooksItem");
    // jwt token api 
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.SECRET_WEB_TOKEN, { expiresIn: "20m" });
      res.send({ token })
    })
    // verify Token
    const verifyToken = (req, res, next) => {
      console.log("verify Token", req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "Unauthorized access" })
      }
      const token = req.headers.authorization.split(' ')[1]
      console.log("token find", token);
      jwt.verify(token, process.env.SECRET_WEB_TOKEN, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "Unauthorized access" })
        }
        console.log("err find", err);
        req.decoded = decoded;
        next();
      })
    }
    // verify admin token 
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query)
      const isAdmin = user?.role === "admin"
      if (!isAdmin) {
        return res.status(403).send({ message: "Forbidden access" })
      }
      next();
    }
    // users api 
    app.get("/users", verifyToken,verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray()
      res.send(result)
    })


    // users admin api 
    app.get("/users/admin/:email", verifyToken, verifyAdmin,async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "Forbidden access" })
      }
      const query = { email: email }
      const user = await usersCollection.findOne(query)
      let admin = false;
      if (user) {
        admin = user?.role === "admin"
      }
      res.send({ admin })
    })
    // 
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
    app.delete("/users/:id", verifyToken , verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await usersCollection.deleteOne(query)
      res.send(result)
    })
    // user admin 
    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          role: "admin"
        }
      }
      const result = await usersCollection.updateOne(filter, updatedDoc)
      res.send(result);
    })
    // Add items api
    app.get('/addItems',verifyToken,  async (req, res) => {
      const result = await addItemsCollection.find().toArray()
      res.send(result)
    })
    app.get('/addItems/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await addItemsCollection.findOne(query);
      res.send(result)
    })
    app.post("/addItems", async (req, res) => {
      const addItem = req.body;
      const result = await addItemsCollection.insertOne(addItem);
      res.send(result)
    })
    app.delete("/addItems/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await addItemsCollection.deleteOne(query)
      res.send(result)
    })
    // cart api 
    app.get("/cart", async (req, res) => {
      const email = req.query.email;
      const query = { email: email }
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    })
    app.post("/cart", async (req, res) => {
      const cartItem = req.body;
      const result = await cartCollection.insertOne(cartItem)
      res.send(result)
    })
    app.delete("/cart/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query)
      res.send(result);
    })
    // checkout
    app.get("/checkOut", async (req, res) => {
      const email = req.query.email;
      const query = { email: email }
      const result = await checkOutCollection.find(query).toArray();
      res.send(result);
    })

    app.post("/checkOut", async (req, res) => {
      const checkOutItems = req.body;
      const result = await checkOutCollection.insertOne(checkOutItems)
      res.send(result)
    })

    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      console.log(amount, "payment intent");
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ['card']
      });
      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })
    app.get("/payments/:email", async (req, res) => {
      const query = { email: req.params.email }
      // if (req.params.email !== req.decoded.email) {
      //   return res.status(403).send({ message: "forbidden access" })
      // }
      const result = await paymentsCollection.find(query).toArray()
      res.send(result)
    })
    app.post("/payments", async (req, res) => {
      const payment = req.body;
      const paymentResult = await paymentsCollection.insertOne(payment);
      const query = {
        _id: {
          $in: payment.cardId.map(id => new ObjectId(id))
        }
      };
      const deletedResult = await cartCollection.deleteMany(query);
      res.send({ paymentResult, deletedResult });

    });

    app.delete("/payments/:id" , async (req, res) => {
      const id = req.params.id;
      const query = {_id : new ObjectId(id)}
      const result = await paymentsCollection.deleteOne(query)
      res.send(result)
    })

    // stats $ Analytics
    app.get("/admin-stats" , async (req, res) => {
      const users = await usersCollection.estimatedDocumentCount();
      const cartItem = await cartCollection.estimatedDocumentCount();
      const addItem = await addItemsCollection.estimatedDocumentCount();
      const orders = await paymentsCollection.estimatedDocumentCount()
      const result = await paymentsCollection.aggregate([
        {
          $group: {
            _id: null ,
            totalRevenue: {
              $sum : "$price"
            }
            
          }
        }
      ]).toArray();
      const revenue = result.length > 0 ? result [0].totalRevenue : 0;
      res.send({
        users,
        cartItem,
        addItem,
        orders, 
        revenue
      })
    })
    // orders 
    app.get("/orders-stats" , async (req, res ) => {
      const result = await paymentsCollection.aggregate([
         {
          $unwind: "$addItemsId"
         }, {
          $lookup:{
            from: "addItems",
            localField : "addItemsId",
            foreignField : "_id",
            as :"cartItems"
          },
         }
      ]).toArray();
         res.send(result)
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