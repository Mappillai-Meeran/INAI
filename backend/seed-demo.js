require('dotenv').config();
const dns = require('dns');
const crypto = require('crypto');
const mongoose = require('mongoose');

dns.setServers(['8.8.8.8', '8.8.4.4']);

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('Missing MONGO_URI. Create backend/.env first.');
  process.exit(1);
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(String(password), salt, 120000, 64, 'sha512').toString('hex');
  return `pbkdf2$120000$${salt}$${hash}`;
}

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

const joinedAt = Date.now();

const users = [
  {
    id: 'demo_saravanavelu',
    name: 'Saravanavelu M',
    password: hashPassword('velu12'),
    gender: 'Male',
    hostel: 'Bharathi Hostel',
    block: 'A',
    room: '101',
    year: '2nd Year',
    branch: 'CSE',
    state: 'Tamil Nadu',
    language: 'Tamil',
    freeNow: true,
    avatar: 'SM',
    bio: 'Good at practical coding sessions.',
    rating: 4.7,
    helpCount: 8,
    joinedAt,
    strongSkills: [{ subject: 'Python', level: 'Expert' }, { subject: 'DBMS', level: 'Good' }],
    needHelpSkills: ['React', 'OS'],
    lifestyle: { sleepSchedule: 'Late', studyStyle: 'Group' }
  },
  {
    id: 'demo_priya',
    name: 'Priya D',
    password: hashPassword('priya12'),
    gender: 'Female',
    hostel: 'Saraswathi Hostel',
    block: 'C',
    room: '203',
    year: '2nd Year',
    branch: 'CSE',
    state: 'Tamil Nadu',
    language: 'Tamil',
    freeNow: true,
    avatar: 'PD',
    bio: 'Enjoys group study and revision planning.',
    rating: 4.8,
    helpCount: 11,
    joinedAt,
    strongSkills: [{ subject: 'React', level: 'Expert' }, { subject: 'OS', level: 'Good' }],
    needHelpSkills: ['DBMS', 'Python'],
    lifestyle: { sleepSchedule: 'Early', studyStyle: 'Group' }
  },
  {
    id: 'demo_muthu',
    name: 'Muthu Pandi K',
    password: hashPassword('muthu12'),
    gender: 'Male',
    hostel: 'Bharathi Hostel',
    block: 'A',
    room: '109',
    year: '3rd Year',
    branch: 'CSE',
    state: 'Tamil Nadu',
    language: 'Tamil',
    freeNow: false,
    avatar: 'MP',
    bio: 'DSA and interview preparation helper.',
    rating: 4.9,
    helpCount: 15,
    joinedAt,
    strongSkills: [{ subject: 'DSA', level: 'Expert' }, { subject: 'Java', level: 'Good' }],
    needHelpSkills: ['Machine Learning', 'DBMS'],
    lifestyle: { sleepSchedule: 'Late', studyStyle: 'Quiet' }
  },
  {
    id: 'demo_anjali',
    name: 'Anjali Devi S',
    password: hashPassword('anjali12'),
    gender: 'Female',
    hostel: 'Saraswathi Hostel',
    block: 'C',
    room: '205',
    year: '2nd Year',
    branch: 'IT',
    state: 'Tamil Nadu',
    language: 'Tamil',
    freeNow: true,
    avatar: 'AS',
    bio: 'Looking for a study group for coding practice.',
    rating: 4.6,
    helpCount: 5,
    joinedAt,
    strongSkills: [{ subject: 'DBMS', level: 'Expert' }, { subject: 'SQL', level: 'Good' }],
    needHelpSkills: ['React', 'OS'],
    lifestyle: { sleepSchedule: 'Early', studyStyle: 'Group' }
  },
  {
    id: 'demo_john',
    name: 'John Wesley J',
    password: hashPassword('john12'),
    gender: 'Male',
    hostel: 'Thiruvalluvar Hostel',
    block: 'B',
    room: '302',
    year: '3rd Year',
    branch: 'CSE',
    state: 'Tamil Nadu',
    language: 'English',
    freeNow: true,
    avatar: 'JW',
    bio: 'Web developer who loves backend engineering.',
    rating: 4.8,
    helpCount: 12,
    joinedAt,
    strongSkills: [{ subject: 'NodeJS', level: 'Expert' }, { subject: 'DBMS', level: 'Expert' }],
    needHelpSkills: ['DSA', 'Java'],
    lifestyle: { sleepSchedule: 'Late', studyStyle: 'Quiet' }
  }
];

async function run() {
  await mongoose.connect(MONGO_URI);
  for (const user of users) {
    await User.findOneAndUpdate(
      { name: user.name },
      user,
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
  }
  await mongoose.disconnect();
  console.log('Demo accounts seeded.');
}

run().catch(async err => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
