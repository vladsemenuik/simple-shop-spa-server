// Скрипт для оновлення всіх паролів користувачів на "admin" у відкритому вигляді
require('dotenv').config();
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, default: 'admin' },
}, { timestamps: true });
const User = mongoose.model('User', userSchema);

async function updateAllPasswords() {
  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  const users = await User.find({});
  for (const user of users) {
    user.password = 'admin';
    await user.save();
    console.log(`Updated password for user: ${user.username}`);
  }
  mongoose.disconnect();
  console.log('All passwords updated to "admin" (plain text).');
}

updateAllPasswords();
