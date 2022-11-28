const express = require('express');
const app = express();
require('dotenv').config();
const port = process.env.PORT || 5000;
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { query } = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');

// middleware 
app.use(cors());
app.use(express.json());

// const verifyUser = (req, res, next) => {
//     const authHeader = req.headers.authorization;
//     if (!authHeader) {
//         return res.status(401).send({ message: 'unauthorized access' });
//     }
//     const token = authHeader.split(' ')[1];
//     if (!token) {
//         return res.status(401).send({ message: 'unauthorized access' })
//     };
//     jwt.verify(token, process.env.TOKEN_SECRET, (err, decoded) => {
//         if (err) {
//             res.status(403).send({ message: '403 Forbidden' })
//         }
//         req.decoded = decoded;
//     });
//     next();

// }


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.hlzaati.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


const run = async () => {
    const usersCollection = client.db('car-zone').collection("users");
    const categoryCollection = client.db('car-zone').collection("car-category");
    const carsCollection = client.db('car-zone').collection("all-cars");

    try {

        //jwt user token
        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '20d' });
            res.send({ accessToken: token });
        });

        //save users info in db
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result);
        });

        // get car category 
        app.get("/category", async (req, res) => {
            const query = {};
            const result = await categoryCollection.find(query).toArray();
            res.send(result);
        });

        //get all cars by category
        app.get("/all-cars/:category_name", async (req, res) => {
            const category = req.params.category_name;
            const query = {
                category: category
            }
            const result = await carsCollection.find(query).toArray();
            res.send(result);
        })

    }

    finally {

    }

}
run().catch(error => console.log(error))


app.get('/', (req, res) => {
    res.send('Car Zone Server is Running');
})

app.listen(port, () => {
    console.log(`Car Zone Server is running on port: ${5000}`);
})