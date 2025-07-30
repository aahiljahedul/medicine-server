require('dotenv').config()
const express =require('express')
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
console.log("Stripe key:", process.env.STRIPE_SECRET_KEY);
const cors = require ('cors');
const app = express();
const port = process.env.PORT || 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');



// midleware
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@agri1.777r20i.mongodb.net/?retryWrites=true&w=majority&appName=Agri1`;
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


    // // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

   const database =client.db('medicinebd')
   const categoriesCollections=database.collection('category')
   const medicineCollection =database.collection('medicine')
   const orderCollection = database.collection('orders');
    const cartCollection = database.collection('carts');
     const userCollection = database.collection('users');
    const  adCollection = database.collection('advertisements');


    ///users

 

  app.post('/users', async (req, res) => {
  const email = req.body.email;
  const user = req.body;

  const result = await userCollection.updateOne(
    { email },
    { $setOnInsert: user },
    { upsert: true }
  );

  res.send({
    message: result.upsertedCount > 0
      ? 'User inserted'
      : 'User already exists',
    inserted: result.upsertedCount > 0,
  });
});


  app.get('/users', async (req, res) => {
  try {
    const users = await userCollection.find().toArray();
    res.send(users);
  } catch (error) {
    res.status(500).send({ message: 'Server error' });
  }
});



  // GET profile by email

app.get('/profile/:email', async (req, res) => {
  try {
    const email = req.params.email;
    const user = await userCollection.findOne({ email });
    if (!user) return res.status(404).send({ success: false, message: 'User not found' });

    
    res.send({
      success: true,
      data: {
        name: user.name,
        email: user.email,
        photoURL: user.photoURL,
      
      }
    });
  } catch (error) {
    res.status(500).send({ success: false, message: 'Server error' });
  }
});

 // update users

app.put('/profile/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const { name, photoURL } = req.body;

    const result = await userCollection.updateOne(
      { email },
      { $set: { name, photoURL, last_updated: new Date().toISOString() } }
    );

    if (!result.matchedCount) return res.status(404).send({ message: 'User not found' });

    res.send({ message: 'Profile updated' });
  } catch {
    res.status(500).send({ message: 'Update failed' });
  }
});

    //  users roll
    app.get('/user/role/:email',async (req,res) => {
      const email = req.params.email
      const result = await userCollection.findOne({email})
      if (!result) {
        return res.status(404).send({message:'User not found'})
      }
      res.send({role:result?.role})
    })

      // Update user role
app.patch('/users/role/:email', async (req, res) => {
  try {
    const { role } = req.body;
     console.log("GET /user/role called with email:", req.params.email)
    const result = await userCollection.updateOne(
      { email: req.params.email },
      { $set: { role } }
    );

    if (!result.matchedCount) {
      return res.status(404).send({ message: 'User not found', modifiedCount: 0 });
    }

    res.send({
      message: 'Role updated successfully',
      modifiedCount: result.modifiedCount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Failed to update role', modifiedCount: 0 });
  }
});

// Delete user 
app.delete('/users/:email', async (req, res) => {
  try {
    const email = req.params.email;
    const result = await userCollection.deleteOne({ email });
    if (result.deletedCount === 0) {
      return res.status(404).send({ message: 'User not found' });
    }
    res.send({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).send({ message: 'Failed to delete user' });
  }
});

     /// category

     app.get('/categories', async (req, res) => {
  try {
    const categories = await categoriesCollections.find().toArray();

    const categoriesWithCount = await Promise.all(
      categories.map(async (cat) => {
        const medicineCount = await medicineCollection.countDocuments({ category: cat.name });
        return {
          _id: cat._id,
          name: cat.name,
          image: cat.image,
          medicineCount
        };
      })
    );

    res.send(categoriesWithCount);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).send({ message: 'Failed to fetch categories' });
  }
});




    //category medicine

    app.get('/medicine',async (req,res) => {
      const category = req.query.category;
      console.log('Requested category:', category); 

      let query = {}; 

      if (category) {
        query = { category: { $regex: new RegExp(category, "i") } }; // Case-insensitive match
      }

      try {
        const result = await medicineCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching medicines:", error);
        res.status(500).json({ error: "Failed to fetch medicines" });
      }
    });
 



   // single medicine
      app.get('/medicine/:id',async (req,res) => {
         const id = req.params.id;
          const query = { _id: new ObjectId(id) };
           const medicine = await medicineCollection.findOne(query);
            res.send(medicine);
      })
   

// add medicine 
app.post('/add-medicine',async (req,res) => {
  const medicine = req.body
   console.log("added medicine:",medicine);
  const result=await medicineCollection.insertOne(medicine)
  console.log(medicine)
  res.send(result)
  
})
  

     app.get('/all-medicine', async (req, res) => {
  const email = req.query.email;
  const query = email ? { addedBy: email } : {};
  const medicines = await medicineCollection.find(query).toArray();
  res.send(medicines);
});


//
   // Node.js + Express
app.get('/medicines/discounted', async (req, res) => {
  const result = await medicineCollection.find({
    discount: { $gte: 6, $lte: 10 }
  }).toArray();
  res.send(result);
});

// 
app.get('/admin/categories', async (req, res) => {
  try {
    const categories = await categoriesCollections.find().toArray();
    res.send(categories);
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch categories' });
  }
});

// Create Category
app.post('/admin/categories', async (req, res) => {
  const { name, image } = req.body;
  if (!name || !image) return res.status(400).send({ message: 'Required fields missing' });
  const result = await categoriesCollections.insertOne({ name, image });
  res.send(result);
});

// GET single category
app.get('/admin/categories/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const category = await categoriesCollections.findOne({ _id: new ObjectId(id) });
    if (!category) {
      return res.status(404).send({ message: 'Category not found' });
    }
    res.send(category);
  } catch (error) {
    res.status(500).send({ message: 'Error fetching category' });
  }
});

// Update Category
app.patch('/admin/categories/:id', async (req, res) => {
  const { name, image } = req.body;
  const { id } = req.params;
  const result = await categoriesCollections.updateOne(
    { _id: new ObjectId(id) },
    { $set: { name, image } }
  );
  res.send(result);
});

// Delete Category
app.delete('/admin/categories/:id', async (req, res) => {
  const result = await categoriesCollections.deleteOne({ _id: new ObjectId(req.params.id) });
  res.send(result);
});


   
        //
        
   // cart 
app.post('/cart', async (req, res) => {
  try {
    const { userId, items } = req.body; 

    if (!userId || !items) {
      return res.status(400).send({ message: 'userId and items are required' });
    }

   
    const existingCart = await cartCollection.findOne({ userId });

    if (existingCart) {
    
      const result = await cartCollection.updateOne(
        { userId },
        { $set: { items, updatedAt: new Date() } }
      );
      res.send({ message: 'Cart updated', modifiedCount: result.modifiedCount });
    } else {
      // Create new cart document
      const result = await cartCollection.insertOne({ userId, items, createdAt: new Date(), updatedAt: new Date() });
      res.send({ message: 'Cart created', insertedId: result.insertedId });
    }
  } catch (error) {
    console.error('Error saving cart:', error);
    res.status(500).send({ message: 'Failed to save cart' });
  }
});  
       // 
app.get('/cart/:id', async (req, res) => {
  try {
    const userId= req.params.id;
    const cart = await cartCollection.findOne({ userId });
    res.send(cart || { items: [] });
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).send({ message: 'Failed to fetch cart' });
  }
});



   /// order
   app.post('/orders', async (req, res) => {
  try {
    const order = req.body;
    console.log('order recieved',req.body)
    const result = await orderCollection.insertOne(order);
    res.send({ insertedId: result.insertedId });
  } catch (error) {
    console.error('Order insert error:', error);
    res.status(500).send({ message: 'Failed to insert order' });
  }
});
      
    //  all orders (admin dashboard)
   app.get('/orders', async (req, res) => {
  try {
       const email = req.query.email;
    const query = email ? { "user.email": email } : {};
    const result = await orderCollection.find(query).toArray();
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: 'Failed to fetch orders' });
  }
});
    // single order for Invoice page)
     app.get('/orders/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    console.log(query)
    const order = await orderCollection.findOne(query);
    res.send(order);
  } catch (error) {
    res.status(500).send({ message: 'Failed to fetch order' });
  }
       });
   


      // seller/orders 

app.get('/seller/orders', async (req, res) => {
  const sellerEmail = req.query.sellerEmail;
  if (!sellerEmail) return res.status(400).send({ message: 'sellerEmail is required' });

  try {
    const orders = await orderCollection.find({ 'items.addedBy': sellerEmail }).toArray();
    res.send({ success: true, data: orders });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Failed to fetch orders' });
  }
});
  

// Seller sales summary
app.get('/seller-sales/:email', async (req, res) => {
  try {
    const sellerEmail = req.params.email;


    const orders = await orderCollection.find({
      'items.addedBy': sellerEmail
    }).toArray();

    let paid = 0;
    let pending = 0;

    
    orders.forEach(order => {
      order.items.forEach(item => {
        if (item.addedBy === sellerEmail) {
          if (order.paymentStatus === 'paid') {
            paid += item.price * item.quantity;
          } else {
            pending += item.price * item.quantity;
          }
        }
      });
    });

    res.send({ paid, pending });
  } catch (error) {
    console.error('Error in /seller-sales:', error);
    res.status(500).send({ message: 'Failed to calculate sales' });
  }
});

/// admin dashboard

app.get('/admin-status', async (req, res) => {
  try {
    const users = await userCollection.countDocuments();
    const medicines = await medicineCollection.countDocuments();
    const orders = await orderCollection.countDocuments({});

    res.send({ users, medicines, orders });
  } catch {
    res.status(500).send({ message: 'Failed to load stats' });
  }
});



// Create a Payment Intent
      

app.post('/create-payment-intent', async (req, res) => {
  try {
    const { amount } = req.body;
    console.log("Received amount:", amount);

    // Validate
    if (!amount || typeof amount !== 'number') {
      return res.status(400).json({ error: 'Invalid or missing amount' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // convert to cents
      currency: 'usd',
      payment_method_types: ['card'],
    });

    res.send({
      clientSecret: paymentIntent.client_secret
    });
  } catch (err) {
    console.error('Stripe Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});  
    // Optional: GET version for testing or browser access
app.get('/create-payment-intent', async (req, res) => {
  try {
    const amount = parseFloat(req.query.amount);

    if (!amount || isNaN(amount)) {
      return res.status(400).json({ error: 'Invalid or missing amount' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      payment_method_types: ['card'],
    });

    res.send({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error('Stripe GET error:', err.message);
    res.status(500).json({ error: err.message });
  }
});


////admin payment
 app.patch('/admin/orders/:id/accept-payment', async (req, res) => {
  const { id } = req.params;
  const result = await orderCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: { paymentStatus: 'paid' } }
  );
  res.send(result);
});
  //// sales report admin




app.get('/admin/sales-report', async (req, res) => {
  try {
    const { start, end, page = 1, limit = 50 } = req.query;

    let query = {};

    if (start && end) {
      const startDate = new Date(start);
      const endDate = new Date(end);

    
      endDate.setHours(23, 59, 59, 999);

      query.date = { $gte: startDate, $lte: endDate };
    }
   console.log("Final Query:", query);
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      orderCollection.find(query).skip(skip).limit(Number(limit)).toArray(),
      orderCollection.countDocuments(query)
    ]);

    res.send({ data, total, page: Number(page), limit: Number(limit) });
  } catch (error) {
    console.error('Error fetching sales report:', error);
    res.status(500).send({ message: 'Failed to fetch sales report' });
  }
});

         
  

/// post advertisement

    app.post('/advertisements', async (req, res) => {
  try {
    const ad = req.body;

    if (!ad.medicineId || !ad.sellerEmail || !ad.adImage || !ad.description) {
      return res.status(400).send({ message: 'Missing required advertisement fields' });
    }

  
    ad.status = 'pending';
    ad.createdAt = new Date();
    ad.updatedAt = new Date();

    const result = await adCollection.insertOne(ad);

    res.status(201).send({ message: 'Advertisement created', insertedId: result.insertedId });
  } catch (error) {
    console.error('Failed to create advertisement:', error);
    res.status(500).send({ message: 'Failed to create advertisement' });
  }
});

app.get('/advertisements', async (req, res) => {
  try {
    const sellerEmail = req.query.sellerEmail;

    // Validation: Ensure sellerEmail is provided
    if (!sellerEmail) {
      return res.status(400).send({ message: "sellerEmail query param is required" });
    }

    console.log("Fetching advertisements for seller:", sellerEmail);

    // Optional: Case-insensitive match
    const ads = await adCollection.find({
      sellerEmail: { $regex: `^${sellerEmail}$`, $options: 'i' }
    }).toArray();

    res.status(200).send(ads);
  } catch (err) {
    console.error("Error fetching advertisements:", err);
    res.status(500).send({ message: "Failed to fetch advertisements" });
  }
});


  /// admin addvertise
 app.get('/admin/advertisements', async (req, res) => {
  try {
    const { status } = req.query; 

    const query = {};
    if (status) query.status = status;

    const ads = await adCollection.find(query).toArray();
    res.send({ success: true, data: ads });
  } catch (error) {
    console.error('Error fetching advertisements:', error);
    res.status(500).send({ message: 'Failed to fetch advertisements' });
  }
});

  app.patch('/admin/advertisements/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; 

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).send({ message: 'Invalid status value' });
    }

    const result = await adCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status, updatedAt: new Date() } }
    );

    if (!result.matchedCount) return res.status(404).send({ message: 'Advertisement not found' });

    res.send({ message: `Advertisement ${status} successfully` });
  } catch (error) {
    console.error('Error updating advertisement status:', error);
    res.status(500).send({ message: 'Failed to update advertisement status' });
  }
});

/// delate 
app.delete('/admin/advertisements/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await adCollection.deleteOne({ _id: new ObjectId(id) });

    if (!result.deletedCount) return res.status(404).send({ message: 'Advertisement not found' });

    res.send({ message: 'Advertisement deleted successfully' });
  } catch (error) {
    console.error('Error deleting advertisement:', error);
    res.status(500).send({ message: 'Failed to delete advertisement' });
  }
});

  // GET banners
app.get('/advertisements/banners', async (req, res) => {
  try {
    const banners = await adCollection.find({ isBanner: true, status: 'approved' }).toArray();
    res.send(banners);
  } catch (error) {
    console.error('Error fetching banners:', error);
    res.status(500).send({ message: 'Failed to fetch banners' });
  }
});

 
/// toggle-banner
app.patch('/admin/advertisements/:id/toggle-banner', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { isBanner } = req.body;

    const updateData = {};
    if (typeof isBanner === 'boolean') {
      updateData.isBanner = isBanner;
    } else {
      // Toggle if not specified
      const ad = await adCollection.findOne({ _id: new ObjectId(id) });
      if (!ad) return res.status(404).send({ message: 'Advertisement not found' });
      updateData.isBanner = !ad.isBanner;
    }
    updateData.updatedAt = new Date();

    const result = await adCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (!result.matchedCount) return res.status(404).send({ message: 'Advertisement not found' });

    res.send({ message: 'Banner status updated successfully' });
  } catch (error) {
    console.error('Error toggling banner status:', error);
    res.status(500).send({ message: 'Failed to update banner status' });
  }
});



    // // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}

   run().catch(console.dir);






app.get("/",(req,res)=> {
    res.send('Medicine web page loading')
})

app.listen(port,()=> {
    console.log(`Medicine  SERVER SITE IS RUNNING ON PORT ${port}`)
})