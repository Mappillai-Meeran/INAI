require('dotenv').config();
const dns = require('dns');
const crypto = require('crypto');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
dns.setServers(['8.8.8.8', '8.8.4.4']);

// Configure allowed origins for CORS (Vercel domains and local dev)
const allowedOrigins = [
  "https://inai-weld.vercel.app",
  "http://localhost:3000",
  "http://localhost:5000",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5000"
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl) or matching allowed list or Vercel subdomains
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

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

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!ADMIN_PASSWORD) {
  console.error("Missing ADMIN_PASSWORD");
  process.exit(1);
}

const USER_TOKEN_SECRET = process.env.USER_TOKEN_SECRET || "inai_user_token_default_secret_key_849204";

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(String(password), salt, 120000, 64, 'sha512').toString('hex');
  return `pbkdf2$120000$${salt}$${hash}`;
}

function verifyPassword(password, storedPassword) {
  if (!storedPassword) return false;
  if (!storedPassword.startsWith('pbkdf2$')) {
    return storedPassword === password;
  }

  const [, iterations, salt, hash] = storedPassword.split('$');
  const testHash = crypto
    .pbkdf2Sync(String(password), salt, Number(iterations), 64, 'sha512')
    .toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(testHash, 'hex'));
}

function generateAdminToken() {
  const expires = Date.now() + 28800000; // 8 hours
  const signature = crypto.createHmac('sha256', ADMIN_PASSWORD).update(String(expires)).digest('hex');
  return `${expires}:${signature}`;
}

function verifyAdminToken(token) {
  if (!token) return false;
  const parts = token.split(':');
  if (parts.length !== 2) return false;
  const [expiresStr, signature] = parts;
  const expires = parseInt(expiresStr);
  if (isNaN(expires) || Date.now() > expires) return false;
  const expectedSignature = crypto.createHmac('sha256', ADMIN_PASSWORD).update(expiresStr).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'));
  } catch (e) {
    return false;
  }
}

function generateUserToken(userId) {
  const expires = Date.now() + 28800000; // 8 hours
  const payload = `${userId}:${expires}`;
  const signature = crypto.createHmac('sha256', USER_TOKEN_SECRET).update(payload).digest('hex');
  return `${payload}:${signature}`;
}

function verifyUserToken(token) {
  if (!token) return null;
  const parts = token.split(':');
  if (parts.length !== 3) return null;
  const [userId, expiresStr, signature] = parts;
  const expires = parseInt(expiresStr);
  if (isNaN(expires) || Date.now() > expires) return null;
  const expectedSignature = crypto.createHmac('sha256', USER_TOKEN_SECRET).update(`${userId}:${expiresStr}`).digest('hex');
  try {
    if (crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'))) {
      return userId;
    }
  } catch (e) {
    return null;
  }
  return null;
}

function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Simple IP-based rate limiting
const rateLimitCache = new Map();

// Periodic cleanup of rateLimitCache to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamps] of rateLimitCache.entries()) {
    // If the IP has no active timestamps within the last 15 minutes, remove it
    const active = timestamps.filter(t => now - t < 900000);
    if (active.length === 0) {
      rateLimitCache.delete(ip);
    } else {
      rateLimitCache.set(ip, active);
    }
  }
}, 300000); // Clean up every 5 minutes

function rateLimiter(limitCount, windowMs) {
  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const now = Date.now();
    if (!rateLimitCache.has(ip)) {
      rateLimitCache.set(ip, []);
    }
    const timestamps = rateLimitCache.get(ip);
    const activeTimestamps = timestamps.filter(t => now - t < windowMs);
    if (activeTimestamps.length >= limitCount) {
      return res.status(429).json({ success: false, message: "Too many attempts. Please try again later." });
    }
    activeTimestamps.push(now);
    rateLimitCache.set(ip, activeTimestamps);
    next();
  };
}

function requireAdmin(req, res, next) {
  let token = req.headers['authorization'];
  if (token && token.startsWith('Bearer ')) {
    token = token.substring(7);
  } else {
    return res.status(401).json({ success: false, message: "Admin verification required." });
  }
  if (verifyAdminToken(token)) {
    return next();
  }
  return res.status(401).json({ success: false, message: "Admin verification required." });
}

function requireAdminOrSelf(req, res, next) {
  let token = req.headers['authorization'];
  if (token && token.startsWith('Bearer ')) {
    token = token.substring(7);
  } else {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }
  if (verifyAdminToken(token)) {
    return next();
  }
  const userId = verifyUserToken(token);
  const targetId = req.params.id || req.params.userId;
  if (userId && targetId && userId === targetId) {
    return next();
  }
  return res.status(401).json({ success: false, message: "Unauthorized." });
}

function requireUser(req, res, next) {
  let token = req.headers['authorization'];
  if (token && token.startsWith('Bearer ')) {
    token = token.substring(7);
  }
  const userId = verifyUserToken(token);
  if (!userId) {
    return res.status(401).json({ success: false, message: "Authentication required." });
  }
  req.userId = userId;
  next();
}

function requireUserOrAdmin(req, res, next) {
  let token = req.headers['authorization'];
  if (token && token.startsWith('Bearer ')) {
    token = token.substring(7);
  }
  if (verifyAdminToken(token)) {
    req.isAdmin = true;
    return next();
  }
  const userId = verifyUserToken(token);
  if (userId) {
    req.userId = userId;
    return next();
  }
  return res.status(401).json({ success: false, message: "Authentication required." });
}

// --- SCHEMAS ---
const userSchema = new mongoose.Schema({
  id: { type: String, unique: true, index: true, required: true },
  name: { type: String, unique: true, index: true, required: true },
  password: { type: String, required: true },
  gender: { type: String, required: true },
  hostel: { type: String, required: true },
  block: { type: String, required: true },
  room: { type: String, required: true },
  year: { type: String, required: true },
  branch: { type: String, required: true },
  state: { type: String, required: true },
  language: String,
  freeNow: Boolean,
  avatar: String,
  bio: String,
  rating: Number,
  ratingCount: Number,
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
  },
  quizAnswers: [Number]
});
const User = mongoose.model('User', userSchema);

const requestSchema = new mongoose.Schema({
  id: { type: String, unique: true, index: true, required: true },
  from: { type: String, index: true, required: true },
  fromName: String,
  to: { type: String, index: true, required: true },
  toName: String,
  type: { type: String, required: true },
  status: { type: String, required: true },
  timestamp: Number,
  updatedAt: Number
});
requestSchema.index({ from: 1, to: 1 });
const Request = mongoose.model('Request', requestSchema);

const messageSchema = new mongoose.Schema({
  requestId: { type: String, index: true, required: true },
  sender: { type: String, required: true },
  senderName: String,
  text: { type: String, required: true },
  timestamp: Number
});
const Message = mongoose.model('Message', messageSchema);

// --- STUDY SESSION SCHEMA ---
const studySessionSchema = new mongoose.Schema({
  id: { type: String, unique: true, index: true, required: true },
  requestId: String,
  proposerId: { type: String, required: true },
  proposerName: String,
  targetId: { type: String, required: true },
  targetName: String,
  subject: String,
  proposedTime: Number,
  proposedLocation: String,
  notes: String,
  status: { type: String, default: "pending" },
  completedAt: Number,
  createdAt: { type: Number, default: Date.now }
});
const StudySession = mongoose.model('StudySession', studySessionSchema);

async function applyUserRating(userId, rating) {
  const user = await User.findOne({ id: userId });
  if (!user) return;
  const count = user.ratingCount || 0;
  const newCount = count + 1;
  const newAvg = count === 0 ? rating : ((user.rating || 0) * count + rating) / newCount;
  user.rating = Math.round(newAvg * 10) / 10;
  user.ratingCount = newCount;
  await user.save();
}

// --- STUDY ROOM SCHEMA ---
const studyRoomSchema = new mongoose.Schema({
  id: { type: String, unique: true, index: true, required: true },
  name: { type: String, required: true },
  subject: { type: String, required: true },
  createdBy: { type: String, required: true },
  createdByName: String,
  hostel: String,
  block: String,
  maxMembers: { type: Number, default: 4 },
  members: [{
    userId: String,
    userName: String,
    joinedAt: Number
  }],
  scheduledTime: Number,
  location: String,
  status: { type: String, default: "active" },
  createdAt: { type: Number, default: Date.now }
});
const StudyRoom = mongoose.model('StudyRoom', studyRoomSchema);

// --- API ROUTES ---

function capitalizeWords(str) {
  if (!str) return str;
  return str.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}

function normalizeUserFields(user) {
  if (user.name) user.name = String(user.name).trim();
  if (user.branch) user.branch = String(user.branch).trim().toUpperCase();
  if (user.block) user.block = String(user.block).trim().toUpperCase();
  if (user.hostel) user.hostel = capitalizeWords(String(user.hostel).trim());
  if (user.state) user.state = capitalizeWords(String(user.state).trim());
  if (user.language) user.language = capitalizeWords(String(user.language).trim());
  
  if (user.strongSkills && Array.isArray(user.strongSkills)) {
    user.strongSkills = user.strongSkills.map(s => ({
      subject: String(s.subject || "").trim().toUpperCase(),
      level: s.level
    }));
  }
  if (user.needHelpSkills && Array.isArray(user.needHelpSkills)) {
    user.needHelpSkills = user.needHelpSkills.map(s => String(s || "").trim().toUpperCase());
  }
  return user;
}

function validateUserFields(user, isUpdate = false) {
  if (!isUpdate) {
    if (!user.id || typeof user.id !== 'string') {
      throw new Error("User ID is required.");
    }
    if (!user.name || typeof user.name !== 'string' || user.name.length < 3 || user.name.length > 50) {
      throw new Error("Name must be between 3 and 50 characters.");
    }
    if (!user.password || typeof user.password !== 'string' || user.password.length < 6 || user.password.length > 100) {
      throw new Error("Password must be between 6 and 100 characters.");
    }
    if (!user.gender || !["Male", "Female"].includes(user.gender)) {
      throw new Error("Gender must be Male or Female.");
    }
    if (!user.room || typeof user.room !== 'string' || !/^[A-Za-z0-9\-]{1,10}$/.test(user.room)) {
      throw new Error("Room must be alphanumeric (max 10 chars).");
    }
  } else {
    if (user.password !== undefined && (typeof user.password !== 'string' || user.password.length < 6 || user.password.length > 100)) {
      throw new Error("Password must be between 6 and 100 characters.");
    }
  }

  if (user.hostel !== undefined && (!user.hostel || typeof user.hostel !== 'string' || user.hostel.length > 100)) {
    throw new Error("Hostel name is required and must be less than 100 characters.");
  }
  if (user.block !== undefined && (!user.block || typeof user.block !== 'string' || user.block.length > 10)) {
    throw new Error("Block name is required and must be less than 10 characters.");
  }
  if (user.bio !== undefined && (typeof user.bio !== 'string' || user.bio.length > 200)) {
    throw new Error("Bio must be less than 200 characters.");
  }
  if (user.branch !== undefined && (!user.branch || typeof user.branch !== 'string' || user.branch.length > 50)) {
    throw new Error("Branch must be less than 50 characters.");
  }
  if (user.state !== undefined && (!user.state || typeof user.state !== 'string' || user.state.length > 50)) {
    throw new Error("State must be less than 50 characters.");
  }
  if (user.strongSkills !== undefined && Array.isArray(user.strongSkills)) {
    if (user.strongSkills.length > 5) {
      throw new Error("Maximum of 5 strong subjects allowed.");
    }
    for (const skill of user.strongSkills) {
      if (!skill.subject || typeof skill.subject !== 'string' || skill.subject.length > 50) {
        throw new Error("Skill subject is required and must be less than 50 characters.");
      }
      if (!["Basic", "Good", "Expert"].includes(skill.level)) {
        throw new Error("Skill level must be Basic, Good, or Expert.");
      }
    }
  }
  if (user.needHelpSkills !== undefined && Array.isArray(user.needHelpSkills)) {
    if (user.needHelpSkills.length > 10) {
      throw new Error("Maximum of 10 need help subjects allowed.");
    }
    for (const skill of user.needHelpSkills) {
      if (typeof skill !== 'string' || skill.length > 50) {
        throw new Error("Need help skill subject must be less than 50 characters.");
      }
    }
  }
  if (user.lifestyle !== undefined) {
    if (user.lifestyle.sleepSchedule && !["Early", "Late"].includes(user.lifestyle.sleepSchedule)) {
      throw new Error("Sleep schedule must be Early or Late.");
    }
    if (user.lifestyle.studyStyle && !["Quiet", "Group"].includes(user.lifestyle.studyStyle)) {
      throw new Error("Study style must be Quiet or Group.");
    }
  }
}

// --- API ROUTES ---

// 1. Get all users
app.get('/api/users', requireUserOrAdmin, async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    if (req.isAdmin) {
      return res.json(users);
    }
    
    const currentUserId = req.userId;
    // Get all accepted requests involving the current user
    const connections = await Request.find({
      status: "accepted",
      $or: [{ from: currentUserId }, { to: currentUserId }]
    });
    const connectedUserIds = new Set(
      connections.map(c => c.from === currentUserId ? c.to : c.from)
    );
    
    const currentUser = await User.findOne({ id: currentUserId });
    const currentHostel = currentUser ? String(currentUser.hostel).toLowerCase().trim() : "";
    const currentBlock = currentUser ? String(currentUser.block).toLowerCase().trim() : "";
    
    const safeUsers = users.map(u => {
      const userObj = u.toObject();
      userObj.sameHostel = userObj.hostel ? (String(userObj.hostel).toLowerCase().trim() === currentHostel) : false;
      userObj.sameBlock = userObj.block ? (String(userObj.block).toLowerCase().trim() === currentBlock) : false;
      
      // Note: room/block included for ALL users so the hostel map can render.
      // Frontend hides room/block in match cards at UI level based on connection status.
      return userObj;
    });
    
    res.json(safeUsers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Register new user
app.post('/api/users', rateLimiter(5, 60000), async (req, res) => {
  try {
    const normalized = normalizeUserFields({ ...req.body });
    validateUserFields(normalized, false);

    // Case-insensitive name duplicate check
    const exists = await User.findOne({ name: new RegExp(`^${escapeRegex(normalized.name)}$`, 'i') });
    if (exists) return res.status(400).json({ success: false, message: "Name already registered." });

    // ID duplicate check
    const idExists = await User.findOne({ id: normalized.id });
    if (idExists) return res.status(400).json({ success: false, message: "ID already exists." });

    const newUser = new User({
      ...normalized,
      password: hashPassword(req.body.password)
    });
    await newUser.save();
    
    const userObj = newUser.toObject();
    delete userObj.password;
    const token = generateUserToken(userObj.id);
    res.json({ success: true, user: userObj, token });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. Login user
app.post('/api/login', rateLimiter(5, 60000), async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const password = String(req.body.password || "");
    const user = await User.findOne({ name: new RegExp(`^${escapeRegex(name)}$`, 'i') });
    if (!user || !verifyPassword(password, user.password)) {
      return res.status(401).json({ success: false, message: "Invalid username or password." });
    }

    if (!user.password.startsWith('pbkdf2$')) {
      user.password = hashPassword(password);
      await user.save();
    }

    const safeUser = user.toObject();
    delete safeUser.password;
    const token = generateUserToken(safeUser.id);
    res.json({ success: true, user: safeUser, token });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3b. Admin login
app.post('/api/admin/login', rateLimiter(5, 60000), (req, res) => {
  const ok = req.body.password === ADMIN_PASSWORD;
  if (ok) {
    const token = generateAdminToken();
    res.json({ success: true, message: "Admin verified.", token });
  } else {
    res.status(401).json({ success: false, message: "Invalid admin password." });
  }
});

// 4. Update existing user
app.put('/api/users/:id', requireUser, async (req, res) => {
  try {
    if (req.userId !== req.params.id) {
      return res.status(403).json({ success: false, message: "Forbidden: You cannot modify other users." });
    }
    
    // Whitelist and normalize fields
    const whitelist = ['bio', 'language', 'hostel', 'block', 'year', 'branch', 'state', 'strongSkills', 'needHelpSkills', 'freeNow', 'lifestyle', 'password'];
    const rawUpdates = {};
    for (const key of whitelist) {
      if (req.body[key] !== undefined) {
        rawUpdates[key] = req.body[key];
      }
    }

    const updates = normalizeUserFields(rawUpdates);
    validateUserFields(updates, true);

    if (updates.password) {
      updates.password = hashPassword(updates.password);
    }

    const updatedUser = await User.findOneAndUpdate({ id: req.params.id }, updates, { returnDocument: 'after' }).select('-password');
    res.json({ success: true, user: updatedUser });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 5. Get all requests
app.get('/api/requests', requireUserOrAdmin, async (req, res) => {
  try {
    if (req.isAdmin) {
      const requests = await Request.find({});
      return res.json(requests);
    }
    const requests = await Request.find({
      $or: [{ from: req.userId }, { to: req.userId }]
    });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Create new request
app.post('/api/requests', requireUser, async (req, res) => {
  try {
    const { to, type } = req.body;
    if (!to) {
      return res.status(400).json({ success: false, message: "Recipient ID is required." });
    }
    if (req.userId === to) {
      return res.status(400).json({ success: false, message: "You cannot send a request to yourself." });
    }
    if (type && !["study", "roommate"].includes(type)) {
      return res.status(400).json({ success: false, message: "Invalid request type." });
    }

    // Verify recipient exists
    const toUser = await User.findOne({ id: to });
    if (!toUser) {
      return res.status(404).json({ success: false, message: "Recipient user not found." });
    }

    const fromUser = await User.findOne({ id: req.userId });
    if (!fromUser) {
      return res.status(404).json({ success: false, message: "Sender user not found." });
    }

    // Duplicate check
    const existing = await Request.findOne({
      $or: [
        { from: req.userId, to },
        { from: to, to: req.userId }
      ],
      status: { $in: ["pending", "accepted"] }
    });
    if (existing) {
      return res.status(400).json({ success: false, message: "A request between these users already exists." });
    }

    const newRequest = new Request({
      id: "req_" + crypto.randomUUID(),
      from: req.userId,
      fromName: fromUser.name,
      to: to,
      toName: toUser.name,
      type: type || "study",
      status: "pending",
      timestamp: Date.now(),
      updatedAt: null
    });

    await newRequest.save();
    res.json({ success: true, request: newRequest });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 7. Update request status
app.put('/api/requests/:id', requireUser, async (req, res) => {
  try {
    const status = req.body.status;
    const allowedStatuses = ["accepted", "declined", "disconnected"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid request status." });
    }

    const request = await Request.findOne({ id: req.params.id });
    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found." });
    }
    const isRecipient = request.to === req.userId;
    const isSender = request.from === req.userId;
    
    if (status === "accepted" || status === "declined") {
      if (!isRecipient) {
        return res.status(403).json({ success: false, message: "Forbidden: Only recipient can accept/decline." });
      }
    } else if (status === "disconnected") {
      if (!isRecipient && !isSender) {
        return res.status(403).json({ success: false, message: "Forbidden: You are not part of this request." });
      }
    }

    request.status = status;
    request.updatedAt = Date.now();
    await request.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 8. Delete user (with cascade)
app.delete('/api/users/:id', requireAdminOrSelf, async (req, res) => {
  try {
    const userId = req.params.id;
    // Find requests involving this user
    const requests = await Request.find({ $or: [{ from: userId }, { to: userId }] });
    const requestIds = requests.map(r => r.id);
    
    // Delete all chat messages for these requests
    if (requestIds.length > 0) {
      await Message.deleteMany({ requestId: { $in: requestIds } });
    }
    // Delete requests
    await Request.deleteMany({ $or: [{ from: userId }, { to: userId }] });
    // Delete user
    await User.findOneAndDelete({ id: userId });
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 9. Delete requests for user (with cascade)
app.delete('/api/requests/user/:userId', requireAdminOrSelf, async (req, res) => {
  try {
    const userId = req.params.userId;
    const requests = await Request.find({ $or: [{ from: userId }, { to: userId }] });
    const requestIds = requests.map(r => r.id);
    
    if (requestIds.length > 0) {
      await Message.deleteMany({ requestId: { $in: requestIds } });
    }
    await Request.deleteMany({ $or: [{ from: userId }, { to: userId }] });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 10. Get chat messages
app.get('/api/chat/:requestId', requireUser, async (req, res) => {
  try {
    const request = await Request.findOne({ id: req.params.requestId });
    if (!request || (request.from !== req.userId && request.to !== req.userId)) {
      return res.status(403).json({ success: false, message: "Unauthorized chat session." });
    }
    if (request.status !== "accepted") {
      return res.status(403).json({ success: false, message: "Chat history only visible for accepted connections." });
    }

    const messages = await Message.find({ requestId: req.params.requestId }).sort({ timestamp: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 11. Post chat message
app.post('/api/chat', requireUser, async (req, res) => {
  try {
    const { requestId, text } = req.body;
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ success: false, message: "Message text is required." });
    }
    if (text.length > 1000) {
      return res.status(400).json({ success: false, message: "Message is too long (max 1000 characters)." });
    }
    
    // Auth & connection check
    const request = await Request.findOne({ id: requestId });
    if (!request || (request.from !== req.userId && request.to !== req.userId)) {
      return res.status(403).json({ success: false, message: "Unauthorized chat session." });
    }
    if (request.status !== "accepted") {
      return res.status(403).json({ success: false, message: "Chat is only available for accepted connections." });
    }

    // Lookup sender secure details
    const user = await User.findOne({ id: req.userId });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    
    const message = new Message({
      requestId,
      sender: req.userId,
      senderName: user.name,
      text: text.trim(),
      timestamp: Date.now()
    });
    await message.save();
    res.json({ success: true, message });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 12. Create study room
app.post('/api/rooms', requireUser, async (req, res) => {
  try {
    const { name, subject, maxMembers, scheduledTime, location } = req.body;
    if (!name || !subject) {
      return res.status(400).json({ success: false, message: "Room name and subject are required." });
    }
    if (name.length > 100) return res.status(400).json({ success: false, message: "Name too long." });
    if (subject.length > 50) return res.status(400).json({ success: false, message: "Subject too long." });
    
    const user = await User.findOne({ id: req.userId });
    if (!user) return res.status(404).json({ success: false, message: "User not found." });
    
    const room = new StudyRoom({
      id: "room_" + crypto.randomUUID(),
      name: String(name).trim(),
      subject: String(subject).trim().toUpperCase(),
      createdBy: req.userId,
      createdByName: user.name,
      hostel: user.hostel,
      block: user.block,
      maxMembers: Math.min(Math.max(parseInt(maxMembers) || 4, 2), 10),
      members: [{ userId: req.userId, userName: user.name, joinedAt: Date.now() }],
      scheduledTime: parseInt(scheduledTime) || null,
      location: location ? String(location).trim() : null,
      status: "active",
      createdAt: Date.now()
    });
    await room.save();
    res.json({ success: true, room });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 13. List study rooms
app.get('/api/rooms', requireUserOrAdmin, async (req, res) => {
  try {
    const rooms = await StudyRoom.find({ status: "active" }).sort({ createdAt: -1 });
    if (req.isAdmin) return res.json(rooms);
    const currentUser = await User.findOne({ id: req.userId });
    const currentHostel = currentUser ? String(currentUser.hostel).toLowerCase().trim() : "";
    const currentBlock = currentUser ? String(currentUser.block).toLowerCase().trim() : "";
    const filtered = rooms.filter(r => {
      if (r.hostel && String(r.hostel).toLowerCase().trim() !== currentHostel) return false;
      return true;
    });
    res.json(filtered);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 14. Join study room
app.post('/api/rooms/:id/join', requireUser, async (req, res) => {
  try {
    const room = await StudyRoom.findOne({ id: req.params.id, status: "active" });
    if (!room) return res.status(404).json({ success: false, message: "Room not found." });
    if (room.members.length >= room.maxMembers) {
      return res.status(400).json({ success: false, message: "Room is full." });
    }
    if (room.members.some(m => m.userId === req.userId)) {
      return res.status(400).json({ success: false, message: "Already in this room." });
    }
    const user = await User.findOne({ id: req.userId });
    if (!user) return res.status(404).json({ success: false, message: "User not found." });
    
    room.members.push({ userId: req.userId, userName: user.name, joinedAt: Date.now() });
    await room.save();
    res.json({ success: true, room });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 15. Leave study room
app.post('/api/rooms/:id/leave', requireUser, async (req, res) => {
  try {
    const room = await StudyRoom.findOne({ id: req.params.id, status: "active" });
    if (!room) return res.status(404).json({ success: false, message: "Room not found." });
    const idx = room.members.findIndex(m => m.userId === req.userId);
    if (idx === -1) return res.status(400).json({ success: false, message: "Not in this room." });
    room.members.splice(idx, 1);
    const roomClosed = room.members.length === 0;
    if (roomClosed) {
      room.status = "cancelled";
    }
    if (room.createdBy === req.userId && room.members.length > 0) {
      room.createdBy = room.members[0].userId;
      room.createdByName = room.members[0].userName;
    }
    await room.save();
    res.json({ success: true, room, roomClosed });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 16. Create study session (propose)
app.post('/api/sessions', requireUser, async (req, res) => {
  try {
    const { targetId, subject, proposedTime, proposedLocation, notes } = req.body;
    if (!targetId) return res.status(400).json({ success: false, message: "Target user required." });
    const user = await User.findOne({ id: req.userId });
    if (!user) return res.status(404).json({ success: false, message: "User not found." });
    const target = await User.findOne({ id: targetId });
    if (!target) return res.status(404).json({ success: false, message: "Target user not found." });
    
    // Check mutual connection (schema uses from/to not userId/targetUserId)
    const request = await Request.findOne({
      $or: [
        { from: req.userId, to: targetId, status: "accepted" },
        { from: targetId, to: req.userId, status: "accepted" }
      ]
    });
    if (!request) return res.status(400).json({ success: false, message: "You must be connected with this user to propose a session." });

    const session = new StudySession({
      id: "sess_" + crypto.randomUUID(),
      requestId: request.id,
      proposerId: req.userId,
      proposerName: user.name,
      targetId,
      targetName: target.name,
      subject: subject ? String(subject).trim() : "General",
      proposedTime: parseInt(proposedTime) || null,
      proposedLocation: proposedLocation ? String(proposedLocation).trim() : null,
      notes: notes ? String(notes).trim() : null,
      status: "pending",
      createdAt: Date.now()
    });
    await session.save();
    res.json({ success: true, session });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 17. List my sessions
app.get('/api/sessions', requireUser, async (req, res) => {
  try {
    const sessions = await StudySession.find({
      $or: [{ proposerId: req.userId }, { targetId: req.userId }]
    }).sort({ createdAt: -1 });
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 18. Confirm session
app.post('/api/sessions/:id/confirm', requireUser, async (req, res) => {
  try {
    const session = await StudySession.findOne({ id: req.params.id, status: "pending" });
    if (!session) return res.status(404).json({ success: false, message: "Session not found." });
    if (session.targetId !== req.userId) {
      return res.status(403).json({ success: false, message: "Only the recipient can confirm." });
    }
    session.status = "confirmed";
    await session.save();
    res.json({ success: true, session });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 19. Decline session
app.post('/api/sessions/:id/decline', requireUser, async (req, res) => {
  try {
    const session = await StudySession.findOne({ id: req.params.id, status: "pending" });
    if (!session) return res.status(404).json({ success: false, message: "Session not found." });
    if (session.targetId !== req.userId && session.proposerId !== req.userId) {
      return res.status(403).json({ success: false, message: "Not your session." });
    }
    session.status = "declined";
    await session.save();
    res.json({ success: true, session });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 19b. Complete session (marks done + optional partner rating)
app.post('/api/sessions/:id/complete', requireUser, async (req, res) => {
  try {
    const session = await StudySession.findOne({ id: req.params.id, status: "confirmed" });
    if (!session) return res.status(404).json({ success: false, message: "Session not found or already completed." });
    if (session.proposerId !== req.userId && session.targetId !== req.userId) {
      return res.status(403).json({ success: false, message: "Not your session." });
    }

    const rating = parseInt(req.body.rating);
    const hasRating = !isNaN(rating) && rating >= 1 && rating <= 5;
    const ratedUserId = session.proposerId === req.userId ? session.targetId : session.proposerId;

    session.status = "completed";
    session.completedAt = Date.now();
    await session.save();

    await User.updateOne({ id: session.proposerId }, { $inc: { helpCount: 1 } });
    await User.updateOne({ id: session.targetId }, { $inc: { helpCount: 1 } });
    if (hasRating) {
      await applyUserRating(ratedUserId, rating);
    }

    res.json({ success: true, session });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 20. Save quiz answers
app.post('/api/quiz/save', requireUser, async (req, res) => {
  try {
    const { answers } = req.body;
    if (!answers || !Array.isArray(answers) || answers.length !== 5) {
      return res.status(400).json({ success: false, message: "Provide 5 answers (0-3 each)." });
    }
    if (answers.some(a => ![0, 1, 2, 3].includes(a))) {
      return res.status(400).json({ success: false, message: "Each answer must be 0, 1, 2, or 3." });
    }
    await User.updateOne({ id: req.userId }, { $set: { quizAnswers: answers } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 20b. Clear quiz answers (retake)
app.post('/api/quiz/clear', requireUser, async (req, res) => {
  try {
    await User.updateOne({ id: req.userId }, { $set: { quizAnswers: [] } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 21. Get quiz matches (users with highest quiz similarity)
app.get('/api/quiz/matches', requireUser, async (req, res) => {
  try {
    const currentUser = await User.findOne({ id: req.userId });
    if (!currentUser || !currentUser.quizAnswers || currentUser.quizAnswers.length !== 5) {
      return res.status(400).json({ success: false, message: "Complete the quiz first." });
    }
    const connections = await Request.find({
      status: "accepted",
      $or: [{ from: req.userId }, { to: req.userId }]
    });
    const connectedIds = new Set(
      connections.map(c => c.from === req.userId ? c.to : c.from)
    );
    const allUsers = await User.find({ id: { $ne: req.userId }, quizAnswers: { $exists: true, $ne: [] } });
    const scored = allUsers.map(u => {
      let score = 0;
      for (let i = 0; i < 5; i++) {
        if (currentUser.quizAnswers[i] === (u.quizAnswers || [])[i]) score += 20;
      }
      const isConnected = connectedIds.has(u.id);
      return {
        userId: u.id,
        score,
        branch: u.branch,
        isConnected,
        name: isConnected ? u.name : null,
        hostel: isConnected ? u.hostel : null
      };
    }).sort((a, b) => b.score - a.score);
    res.json(scored);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
