require('dotenv').config();
const dns = require('dns');
const crypto = require('crypto');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
dns.setServers(['8.8.8.8', '8.8.4.4']);
// Allow requests from the frontend (which is usually running on localhost or 127.0.0.1)
app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('Missing MONGO_URI. Create backend/.env from backend/.env.example');
  process.exit(1);
}
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(String(password), salt, 120000, 64, 'sha512').toString('hex');
  return `pbkdf2$120000$${salt}$${hash}`;
}

function verifyPassword(password, storedPassword) {
  if (!storedPassword) return false;
  if (!storedPassword.startsWith('pbkdf2$')) {
    return storedPassword === simpleHash(password) || storedPassword === password;
  }

  const [, iterations, salt, hash] = storedPassword.split('$');
  const testHash = crypto
    .pbkdf2Sync(String(password), salt, Number(iterations), 64, 'sha512')
    .toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(testHash, 'hex'));
}

function simpleHash(str) {
  let hash = 0;
  const text = String(str);
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString();
}

function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function requireAdmin(req, res, next) {
  if (req.headers['x-admin-password'] !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, message: "Admin verification required." });
  }
  next();
}

// --- SCHEMAS ---
const userSchema = new mongoose.Schema({
  id: String,
  name: String,
  password: String,
  gender: String,
  hostel: String,
  block: String,
  room: String,
  year: String,
  branch: String,
  state: String,
  language: String,
  freeNow: Boolean,
  avatar: String,
  bio: String,
  rating: Number,
  helpCount: Number,
  joinedAt: Number,
  strongSkills: [{
    subject: String,
    level: String
  }],
  needHelpSkills: [String],
  lifestyle: {
    sleepSchedule: String,
    studyStyle: String
  }
});
const User = mongoose.model('User', userSchema);

const requestSchema = new mongoose.Schema({
  id: String,
  from: String,
  fromName: String,
  to: String,
  toName: String,
  type: String,
  status: String,
  timestamp: Number,
  updatedAt: Number
});
const Request = mongoose.model('Request', requestSchema);

// --- API ROUTES ---

// 1. Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Register new user
app.post('/api/users', async (req, res) => {
  try {
    const exists = await User.findOne({ name: req.body.name });
    if (exists) return res.status(400).json({ success: false, message: "Name already registered." });
    
    const newUser = new User({
      ...req.body,
      password: hashPassword(req.body.password)
    });
    await newUser.save();
    const user = newUser.toObject();
    delete user.password;
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. Login user
app.post('/api/login', async (req, res) => {
  try {
    const { name, password } = req.body;
    const user = await User.findOne({ name });
    if (!user || !verifyPassword(password, user.password)) {
      return res.status(401).json({ success: false, message: "Invalid username or password." });
    }

    if (!user.password.startsWith('pbkdf2$')) {
      user.password = hashPassword(password);
      await user.save();
    }

    const safeUser = user.toObject();
    delete safeUser.password;
    res.json({ success: true, user: safeUser });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3a. Reset password with basic identity check for this micro project
app.post('/api/forgot-password', async (req, res) => {
  try {
    const { name, room, state, newPassword } = req.body;
    if (!name || !room || !state || !newPassword) {
      return res.status(400).json({ success: false, message: "Fill all reset fields." });
    }

    const user = await User.findOne({
      name,
      room,
      state: new RegExp(`^${escapeRegex(String(state).trim())}$`, 'i')
    });
    if (!user) {
      return res.status(404).json({ success: false, message: "Details did not match any account." });
    }

    user.password = hashPassword(newPassword);
    await user.save();
    res.json({ success: true, message: "Password reset successfully. Login with your new password." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3b. Admin login without exposing the password in frontend code
app.post('/api/admin/login', (req, res) => {
  const ok = req.body.password === ADMIN_PASSWORD;
  res.status(ok ? 200 : 401).json({
    success: ok,
    message: ok ? "Admin verified." : "Invalid admin password."
  });
});

// 4. Update existing user
app.put('/api/users/:id', async (req, res) => {
  try {
    const updates = { ...req.body };
    if (updates.password) updates.password = hashPassword(updates.password);
    const updatedUser = await User.findOneAndUpdate({ id: req.params.id }, updates, { new: true }).select('-password');
    res.json({ success: true, user: updatedUser });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. Get all requests
app.get('/api/requests', async (req, res) => {
  try {
    const requests = await Request.find({});
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Create new request
app.post('/api/requests', async (req, res) => {
  try {
    const newRequest = new Request(req.body);
    await newRequest.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 6. Update request status
app.put('/api/requests/:id', async (req, res) => {
  try {
    await Request.findOneAndUpdate({ id: req.params.id }, { status: req.body.status, updatedAt: req.body.updatedAt });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 7. Delete user
app.delete('/api/users/:id', requireAdmin, async (req, res) => {
  try {
    await User.findOneAndDelete({ id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 8. Delete requests for user
app.delete('/api/requests/user/:userId', requireAdmin, async (req, res) => {
  try {
    const userId = req.params.userId;
    await Request.deleteMany({ $or: [{ from: userId }, { to: userId }] });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
