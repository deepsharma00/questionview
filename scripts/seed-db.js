// scripts/seed-db.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-interview-platform';
// Log the MongoDB URI (masking sensitive parts if present)
const maskedURI = MONGODB_URI.replace(/(mongodb:\/\/)([^@]+@)/, '$1****@');
console.log('Using MongoDB URI:', maskedURI);

// Define schemas directly in this file to avoid import issues
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Please provide a username'],
    unique: true,
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
  },
  role: {
    type: String,
    enum: ['admin', 'candidate'],
    required: [true, 'Please specify user role'],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
    return;
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

const questionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: [true, 'Please provide the question text'],
  },
  techStack: {
    type: String,
    required: [true, 'Please specify the tech stack'],
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Create models
const User = mongoose.models.User || mongoose.model('User', userSchema);
const Question = mongoose.models.Question || mongoose.model('Question', questionSchema);

async function seedDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully!');

    // Clear existing data
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Question.deleteMany({});

    // Create admin user
    console.log('Creating admin user...');
    const admin = new User({
      username: 'admin',
      password: 'admin123', // Will be hashed by the pre-save hook
      role: 'admin'
    });
    await admin.save();

    // Create candidate user
    console.log('Creating candidate user...');
    const candidate = new User({
      username: 'candidate',
      password: 'candidate123', // Will be hashed by the pre-save hook
      role: 'candidate'
    });
    await candidate.save();

    // Create sample questions
    console.log('Creating sample questions...');
    const techStacks = ['JavaScript', 'React', 'Node.js', 'Python'];
    
    const sampleQuestions = {
      'JavaScript': [
        'Explain the difference between let, const, and var in JavaScript.',
        'What is closure in JavaScript and how would you use it?',
        'Explain event delegation in JavaScript.',
        'How does prototypal inheritance work in JavaScript?'
      ],
      'React': [
        'Explain the virtual DOM in React.',
        'What are hooks in React and why were they introduced?',
        'Explain the component lifecycle in React.',
        'What is the difference between state and props in React?'
      ],
      'Node.js': [
        'What is the event loop in Node.js?',
        'How does Node.js handle concurrency?',
        'Explain middleware in Express.js.',
        'What are streams in Node.js and how are they used?'
      ],
      'Python': [
        'What are decorators in Python?',
        'Explain list comprehensions in Python.',
        'What is the difference between a tuple and a list in Python?',
        'How does memory management work in Python?'
      ]
    };

    for (const stack of techStacks) {
      const questions = sampleQuestions[stack];
      for (const text of questions) {
        await Question.create({
          text,
          techStack: stack,
          createdBy: admin._id
        });
      }
    }

    console.log('Database seeded successfully!');
    
    // Print login credentials
    console.log('\n=== Login Credentials ===');
    console.log('Admin: username="admin", password="admin123"');
    console.log('Candidate: username="candidate", password="candidate123"');

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
}

seedDatabase();