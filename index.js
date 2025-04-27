require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '8mb' }));

const PORT = process.env.PORT || 4000;

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('MongoDB connected');
}).catch((err) => {
  console.error('MongoDB connection error:', err);
});

// Product schema
const productSchema = new mongoose.Schema({
  name: String,
  description: String,
  price: Number,
  image: String,
  category: String, // ДОДАНО ДЛЯ ЗБЕРЕЖЕННЯ КАТЕГОРІЇ
}, { timestamps: true });
const Product = mongoose.model('Product', productSchema);

// Order schema
const orderSchema = new mongoose.Schema({
  name: String,
  phone: String, // ДОДАНО ДЛЯ ЗБЕРЕЖЕННЯ НОМЕРУ ТЕЛЕФОНУ
  items: Array,
  total: Number,
  status: { type: String, default: 'new' },
}, { timestamps: true });
const Order = mongoose.model('Order', orderSchema);

// ========== API ROUTES ==========

// Products CRUD
app.get('/api/products', async (req, res) => {
  const products = await Product.find();
  res.json(products);
});

app.post('/api/products', async (req, res) => {
  const prod = await Product.create(req.body);
  res.json(prod);
});

app.put('/api/products/:id', async (req, res) => {
  const prod = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(prod);
});

app.delete('/api/products/:id', async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// Orders CRUD
app.get('/api/orders', async (req, res) => {
  const orders = await Order.find();
  res.json(orders);
});

app.post('/api/orders', async (req, res) => {
  const { name, phone, items } = req.body;
  if (!name || !phone || !Array.isArray(items)) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const order = await Order.create({ name, phone, items, status: 'new' });
  res.json(order);
});

app.put('/api/orders/:id', async (req, res) => {
  const order = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(order);
});

app.delete('/api/orders/:id', async (req, res) => {
  await Order.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// Admin password check
app.post('/api/admin/check', (req, res) => {
  if (req.body.password === process.env.ADMIN_PASSWORD) {
    res.json({ success: true });
  } else {
    res.status(403).json({ success: false, message: 'Wrong password' });
  }
});

// ========== START ==========
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
