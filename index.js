const express = require('express');
const app = express();
require('dotenv').config();
const port = process.env.PORT || 5000;
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { query } = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

// middleware 
app.use(cors());
app.use(express.json());

//JWT verify
const verifyUser = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'unauthorized access' });
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).send({ message: 'unauthorized access' })
    };
    jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) {
            res.status(403).send({ message: '403 Forbidden' })
        }
        req.decoded = decoded;
    });
    next();

}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.hlzaati.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


const run = async () => {
    const usersCollection = client.db('car-zone').collection("users");
    const categoryCollection = client.db('car-zone').collection("car-category");
    const carsCollection = client.db('car-zone').collection("all-cars");
    const bookingCollection = client.db('car-zone').collection("booking");
    const advertisementCollection = client.db('car-zone').collection("advertisement");

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
        app.get("/all-cars/:category", async (req, res) => {
            const category = req.params.category;
            const query = {
                category: category
            }
            const result = await carsCollection.find(query).toArray();
            res.send(result);
        });


        //get booking cars
        app.get('/booking', verifyUser, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;
            if (decodedEmail !== email) {
                return res.status(401).send({ message: 'unauthorized access' })
            };
            const query = {
                email: email
            };
            const result = await bookingCollection.find(query).toArray();
            res.send(result);
        });

        //post booking cars in db
        app.post('/booking', async (req, res) => {
            const booking = req.body;
            const result = await bookingCollection.insertOne(booking);
            res.send(result);
        });

        //check buyer role
        app.get('/buyer', verifyUser, async (req, res) => {
            const email = req.query.email;
            const query = {
                email: email
            };
            const user = await usersCollection.findOne(query);
            res.send({ isBuyer: user?.role === 'buyer' });
        });

        //check seller role
        app.get('/seller', verifyUser, async (req, res) => {
            const email = req.query.email;
            const query = {
                email: email
            };
            const user = await usersCollection.findOne(query);
            res.send({ isSeller: user?.role === 'seller' });
        });

        //check seller role
        app.get('/admin', verifyUser, async (req, res) => {
            const email = req.query.email;
            const query = {
                email: email
            };
            const user = await usersCollection.findOne(query);
            res.send({ isAdmin: user?.role === 'admin' });
        });

        //Upload a product (car)
        app.post('/uploadCar', async (req, res) => {
            const car = req.body;
            const upload = await carsCollection.insertOne(car);
            res.send(upload);
        });

        // get my product
        app.get('/my-products', verifyUser, async (req, res) => {
            const email = req.query.email;
            const query = {
                email: email
            };
            const result = await carsCollection.find(query).toArray();
            res.send(result);
        });

        // delete product
        app.delete('/deleteproduct/:id', async (req, res) => {
            const deleteId = req.params.id;
            const query = {
                _id: ObjectId(deleteId)
            }
            const result = await carsCollection.deleteOne(query);
            res.send(result);
        });

        // advertise 
        app.post('/advertise', async (req, res) => {
            const id = req.query.id;
            // find product
            const query = {
                _id: ObjectId(id)
            };
            const result = await carsCollection.findOne(query);

            if (result) {
                const upload = await advertisementCollection.insertOne(result);
                res.send(upload);
            };
        });

        app.put('/advertise', async (req, res) => {
            const id = req.query.id;
            const query = {
                _id: ObjectId(id)
            }
            const options = { upsert: true }
            const updatedDoc = {
                $set: {
                    advertise: true
                }
            }
            const result = await carsCollection.updateOne(query, updatedDoc, options);
            res.send(result);
        });

        // get all advertisment product
        app.get('/advertise', async (req, res) => {
            const query = {};
            const result = await carsCollection.find(query).toArray();
            res.send(result);
        });

        // get all seller 
        app.get('/allseller', verifyUser, async (req, res) => {
            const query = {
                role: 'seller'
            };
            const result = await usersCollection.find(query).toArray();
            res.send(result);
        });

        // delete seller & buyer 
        app.delete('/allseller/:id', async (req, res) => {
            const id = req.params.id;
            const query = {
                _id: ObjectId(id)
            }
            const result = await usersCollection.deleteOne(query);
            res.send(result)
        });

        // get all buyer 
        app.get('/allbuyer', verifyUser, async (req, res) => {
            const query = {
                role: 'buyer'
            };
            const result = await usersCollection.find(query).toArray();
            res.send(result);
        });

        // verify seller 
        app.put('/verifyseller/:id', async (req, res) => {
            const id = req.params.id;
            const query = {
                _id: ObjectId(id)
            };
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    verified: true
                }
            };
            const result = usersCollection.updateOne(query, updatedDoc, options);
            res.send(result);
        });

        app.get('/verifiedseller', async (req, res) => {
            const email = req.query.email;
            const query = {
                email: email
            };
            const matchedItem = await usersCollection.findOne(query);

            if (matchedItem) {
                res.send({ verified: matchedItem.verified === true })
            }
        });


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