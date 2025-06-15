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

// User schema

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // hashed
  name: { type: String, required: true },
  role: { type: String, default: 'admin' },
}, { timestamps: true });
const User = mongoose.model('User', userSchema);

// Feedback schema
const feedbackSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String },
  text: { type: String, required: true },
  date: { type: String, required: true }
}, { timestamps: true });
const Feedback = mongoose.model('Feedback', feedbackSchema);

// ========== API ROUTES ==========

// ====== FEEDBACK API ======
// Додати новий відгук
app.post('/api/feedback', async (req, res) => {
  try {
    const { name, email, text, date } = req.body;
    if (!name || !text || !date) {
      return res.status(400).json({ error: 'Відсутні обовʼязкові поля' });
    }
    const feedback = await Feedback.create({ name, email, text, date });
    res.json(feedback);
  } catch (err) {
    res.status(500).json({ error: 'Помилка сервера' });
  }
});
// Отримати всі відгуки
app.get('/api/feedback', async (req, res) => {
  try {
    const feedbacks = await Feedback.find().sort({ createdAt: -1 });
    res.json(feedbacks);
  } catch (err) {
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

// Products CRUD
// In-memory cache for products
let productsCache = null;
let productsCacheTime = 0;
const PRODUCTS_CACHE_TTL = 60 * 1000; // 60 секунд

app.get('/api/products', async (req, res) => {
  const now = Date.now();
  if (productsCache && (now - productsCacheTime < PRODUCTS_CACHE_TTL)) {
    return res.json(productsCache);
  }
  const products = await Product.find();
  productsCache = products;
  productsCacheTime = now;
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

// ========== USER MANAGEMENT ==========

// Register new user (admin only)
app.post('/api/users', async (req, res) => {
  console.log('POST /api/users', req.body);
  try {
    const { username, password, name, role } = req.body;
    if (!username || !password || !name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(409).json({ error: 'User already exists' });
    }
    const user = await User.create({ username, password, name, role });
    res.json({ success: true, user: { username: user.username, name: user.name, role: user.role, _id: user._id } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// User login
app.post('/api/users/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('LOGIN ATTEMPT:', username);
    // Case-insensitive search
    const user = await User.findOne({ username: new RegExp(`^${username}$`, 'i') });
    console.log('USER FOUND:', user);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (password !== user.password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    // For now, just return user info (no JWT/session)
    res.json({ success: true, user: { username: user.username, name: user.name, role: user.role, _id: user._id } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Change password (authenticated user)
app.post('/api/users/change-password', async (req, res) => {
  try {
    const { username, currentPassword, newPassword } = req.body;
    if (!username || !currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (currentPassword !== user.password) {
      return res.status(401).json({ error: 'Current password incorrect' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }
    user.password = newPassword;
    await user.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create user (admin only)
app.post('/api/users', async (req, res) => {
  try {
    const { username, password, name, role } = req.body;
    if (!username || !password || !name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const exists = await User.findOne({ username });
    if (exists) {
      return res.status(409).json({ error: 'User already exists' });
    }
    const user = await User.create({ username, password, name, role });
    res.json({ success: true, user: { username: user.username, name: user.name, role: user.role, _id: user._id } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// List users (admin only)
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, '-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Edit user (admin only)
app.put('/api/users/:id', async (req, res) => {
  try {
    const { name, role } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { name, role }, { new: true, fields: '-password' });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete user (admin only)
app.delete('/api/users/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== REVIEWS ==========
// Get all reviews
app.get('/api/reviews', async (req, res) => {
  try {
    const reviews = await Review.find();
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});
// Get reviews for a product
app.get('/api/reviews/product/:productId', async (req, res) => {
  try {
    const reviews = await Review.find({ productId: req.params.productId });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});
// Create review
app.post('/api/reviews', async (req, res) => {
  try {
    const { productId, username, text, rating } = req.body;
    if (!productId || !username || !text) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const review = await Review.create({ productId, username, text, rating });
    res.json(review);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});
// Update review
app.put('/api/reviews/:id', async (req, res) => {
  try {
    const { text, rating } = req.body;
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { text, rating },
      { new: true }
    );
    if (!review) return res.status(404).json({ error: 'Review not found' });
    res.json(review);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});
// Delete review
app.delete('/api/reviews/:id', async (req, res) => {
  try {
    await Review.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== END USER MANAGEMENT ==========

// Admin password check (legacy, to be removed after migration)
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
