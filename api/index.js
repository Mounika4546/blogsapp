const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Post = require('./models/Post');
const cookieParser = require('cookie-parser');
const User = require('./models/User');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const react = require('react');

const app = express();
const secret = 'asdf45566gfd';
const uploadMiddleware = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Only images are allowed'));
    }
    cb(null, true);
  },
});

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Serve static files from the 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB Connection
mongoose.connect('mongodb+srv://renukachowhank:mounika123@cluster0.fqsexbp.mongodb.net/blog?retryWrites=true&w=majority&appName=Cluster0')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes

// Register Route
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPassword = bcrypt.hashSync(password, bcrypt.genSaltSync(10));
    const userDoc = await User.create({ username, password: hashedPassword });
    res.json(userDoc);
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: e.message || 'Registration failed' });
  }
});

// Login Route
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const userDoc = await User.findOne({ username });
  if (!userDoc) {
    return res.status(400).json({ error: 'User not found' });
  }
  const passOk = bcrypt.compareSync(password, userDoc.password);
  if (passOk) {
    jwt.sign({ username, id: userDoc._id }, secret, { expiresIn: '1h' }, (err, token) => {
      if (err) throw err;
      res.cookie('token', token, { httpOnly: true, secure: false }).json({ id: userDoc._id, username });
    });
  } else {
    res.status(400).json({ error: 'Wrong credentials' });
  }
});

// Profile Route
app.get('/profile', (req, res) => {
  console.log('Cookies:', req.cookies); // Debugging cookies
  const { token } = req.cookies;
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  jwt.verify(token, secret, {}, (err, info) => {
    if (err) return res.status(401).json({ error: 'Invalid token' });
    res.json(info);
  });
});

// Logout Route
app.post('/logout', (req, res) => {
  res.clearCookie('token').json({ message: 'Logged out' });
});

// Create Post Route
app.post('/post', uploadMiddleware.single('file'), async (req, res) => {
  const { originalname, path: tempPath } = req.file;
  const parts = originalname.split('.');
  const ext = parts[parts.length - 1];
  const newPath = tempPath + '.' + ext;
  fs.renameSync(tempPath, newPath);

  const { token } = req.cookies;
  jwt.verify(token, secret, {}, async (err, info) => {
    if (err) return res.status(401).json({ error: 'Invalid token' });
    const { title, summary, content } = req.body;
    const postDoc = await Post.create({
      title,
      summary,
      content,
      cover: `/uploads/${path.basename(newPath)}`, // Correct path for the image
      author: info.id,
    });
    res.json(postDoc);
  });
});

app.put('/post',uploadMiddleware.single(file),async(req,res) =>{
  let newPath=null;
  if(req.file){
      const { originalname, path: tempPath } = req.file;
      const parts = originalname.split('.');
      const ext = parts[parts.length - 1];
      newPath = tempPath + '.' + ext;
      fs.renameSync(tempPath, newPath);
     }
     const { token } = req.cookies;
     jwt.verify(token, secret, {}, async (err, info) => {
      if (err) return res.status(401).json({ error: 'Invalid token' });

       const {id, title, summary, content } = req.body;
       const postDoc = await Post.findById(id);
       const isAuthor=JSON.stringify(postDoc.author)===JSON.stringify(info.id);
        res.json({isAuthor,postDoc,info})
        if(isAuthor){
          return res.status(400).json('you are not the author');
        }
         await postDoc.update({title,
          summary,
          content,
          cover:newPath ? newPath:postDoc.cover,
        });
        //title,
        //summary,
        //content,
       // cover: `/uploads/${path.basename(newPath)}`, // Correct path for the image
       // author: info.id,
     // });
      res.json(postDoc);
    });
  });
  

// Get Posts Route
app.get('/post', async (req, res) => {
 res.json(await Post.find()
 .populate('author',['username'])
 .sort({createdAt:-1}))
 .limit(20)
});

app.get('/post/:id', async (req,res) =>{
  const {id}=req.params;
  const postDoc=await Post.findById(id).populate('author',['username']);
  res.json(postDoc);
});

// Start Server
app.listen(4000, () => {
  console.log('Server running on http://localhost:4000');
});
