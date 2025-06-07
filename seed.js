// Скрипт для додавання початкових даних у MongoDB
require('dotenv').config();
const mongoose = require('mongoose');


const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, default: 'admin' },
}, { timestamps: true });
const User = mongoose.model('User', userSchema);

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  // Створити admin-користувача, якщо не існує
  const admin = await User.findOne({ username: 'admin' });
  if (!admin) {
    await User.create({ username: 'admin', password: 'admin', name: 'Адміністратор', role: 'admin' });
    console.log('Admin user created!');
  } else {
    console.log('Admin user already exists.');
  }
  mongoose.disconnect();
}

seed();
