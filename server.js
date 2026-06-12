const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { Server } = require('socket.io');
const http = require('http');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/scrollingapp', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ MongoDB Connected')).catch(err => console.log(err));

// ========== SCHEMAS ==========

// User Schema
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  fullName: { type: String, default: '' },
  bio: { type: String, default: '✨ Welcome to Scrolling.app ✨' },
  avatar: { type: String, default: 'https://res.cloudinary.com/default-avatar.png' },
  coverPhoto: { type: String, default: '' },
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  savedPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
  createdAt: { type: Date, default: Date.now },
  lastActive: { type: Date, default: Date.now },
  isVerified: { type: Boolean, default: false },
  settings: {
    darkMode: { type: Boolean, default: false },
    notifications: { type: Boolean, default: true },
    language: { type: String, default: 'en' },
    privateAccount: { type: Boolean, default: false }
  }
});

// Post Schema (Photos & Reels)
const PostSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  mediaUrl: { type: String, required: true },
  mediaType: { type: String, enum: ['image', 'video'], required: true },
  caption: { type: String, default: '' },
  music: { type: String, default: '' },
  musicId: { type: String, default: '' },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  shares: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  saves: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  views: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

// Story Schema
const StorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  mediaUrl: { type: String, required: true },
  mediaType: { type: String, enum: ['image', 'video'], required: true },
  text: { type: String, default: '' },
  textColor: { type: String, default: '#ffffff' },
  backgroundColor: { type: String, default: '#000000' },
  fontSize: { type: String, default: '24px' },
  fontFamily: { type: String, default: 'Arial' },
  views: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  reactions: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    emoji: { type: String }
  }],
  expiresAt: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) },
  createdAt: { type: Date, default: Date.now }
});

// Message Schema
const MessageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, default: '' },
  mediaUrl: { type: String, default: '' },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// Conversation Schema
const ConversationSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  lastMessage: { type: String, default: '' },
  lastMessageTime: { type: Date, default: Date.now }
});

// Models
const User = mongoose.model('User', UserSchema);
const Post = mongoose.model('Post', PostSchema);
const Story = mongoose.model('Story', StorySchema);
const Message = mongoose.model('Message', MessageSchema);
const Conversation = mongoose.model('Conversation', ConversationSchema);

// ========== MIDDLEWARE ==========
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey');
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// ========== AUTH ROUTES ==========
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, email, password: hashedPassword });
    await user.save();
    
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'secretkey', { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, username, email, avatar: user.avatar } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ error: 'User not found' });
    
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(400).json({ error: 'Invalid password' });
    
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'secretkey', { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, username: user.username, email: user.email, avatar: user.avatar } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== USER ROUTES ==========
app.get('/api/users/:id', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/users/:id', authMiddleware, async (req, res) => {
  try {
    const { fullName, bio, avatar, coverPhoto, settings } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { fullName, bio, avatar, coverPhoto, settings },
      { new: true }
    ).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users/:id/follow', authMiddleware, async (req, res) => {
  try {
    const userToFollow = await User.findById(req.params.id);
    const currentUser = await User.findById(req.userId);
    
    if (!userToFollow || !currentUser) return res.status(404).json({ error: 'User not found' });
    
    if (currentUser.following.includes(req.params.id)) {
      currentUser.following = currentUser.following.filter(id => id.toString() !== req.params.id);
      userToFollow.followers = userToFollow.followers.filter(id => id.toString() !== req.userId);
    } else {
      currentUser.following.push(req.params.id);
      userToFollow.followers.push(req.userId);
    }
    
    await currentUser.save();
    await userToFollow.save();
    
    res.json({ following: currentUser.following.includes(req.params.id) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== POST ROUTES ==========
const upload = multer({ storage: multer.memoryStorage() });

app.post('/api/posts', authMiddleware, upload.single('media'), async (req, res) => {
  try {
    const { caption, music, musicId } = req.body;
    const mediaType = req.file.mimetype.startsWith('image') ? 'image' : 'video';
    
    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { resource_type: mediaType === 'image' ? 'image' : 'video' },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(req.file.buffer);
    });
    
    const post = new Post({
      userId: req.userId,
      mediaUrl: result.secure_url,
      mediaType,
      caption,
      music,
      musicId
    });
    
    await post.save();
    res.json(post);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/posts', authMiddleware, async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate('userId', 'username fullName avatar')
      .limit(50);
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/posts/:id/like', authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    
    const hasLiked = post.likes.includes(req.userId);
    if (hasLiked) {
      post.likes = post.likes.filter(id => id.toString() !== req.userId);
    } else {
      post.likes.push(req.userId);
    }
    
    await post.save();
    res.json({ liked: !hasLiked, count: post.likes.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/posts/:id/save', authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    const user = await User.findById(req.userId);
    
    if (!post || !user) return res.status(404).json({ error: 'Not found' });
    
    const hasSaved = user.savedPosts.includes(req.params.id);
    if (hasSaved) {
      user.savedPosts = user.savedPosts.filter(id => id.toString() !== req.params.id);
      post.saves = post.saves.filter(id => id.toString() !== req.userId);
    } else {
      user.savedPosts.push(req.params.id);
      post.saves.push(req.userId);
    }
    
    await user.save();
    await post.save();
    res.json({ saved: !hasSaved, count: post.saves.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/posts/:id/comment', authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    
    post.comments.push({ userId: req.userId, text });
    await post.save();
    
    const populatedPost = await Post.findById(req.params.id).populate('comments.userId', 'username avatar');
    res.json(populatedPost.comments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== STORY ROUTES ==========
app.post('/api/stories', authMiddleware, upload.single('media'), async (req, res) => {
  try {
    const { text, textColor, backgroundColor, fontSize, fontFamily } = req.body;
    
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { resource_type: req.file.mimetype.startsWith('image') ? 'image' : 'video' },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(req.file.buffer);
    });
    
    const story = new Story({
      userId: req.userId,
      mediaUrl: result.secure_url,
      mediaType: req.file.mimetype.startsWith('image') ? 'image' : 'video',
      text,
      textColor,
      backgroundColor,
      fontSize,
      fontFamily
    });
    
    await story.save();
    res.json(story);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/stories', authMiddleware, async (req, res) => {
  try {
    const stories = await Story.find({ expiresAt: { $gt: new Date() } })
      .sort({ createdAt: -1 })
      .populate('userId', 'username fullName avatar');
    res.json(stories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/stories/:id/view', authMiddleware, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ error: 'Story not found' });
    
    if (!story.views.includes(req.userId)) {
      story.views.push(req.userId);
      await story.save();
    }
    
    res.json({ views: story.views.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== MESSAGE ROUTES ==========
app.post('/api/messages', authMiddleware, async (req, res) => {
  try {
    const { receiverId, text, mediaUrl } = req.body;
    
    const message = new Message({
      senderId: req.userId,
      receiverId,
      text,
      mediaUrl
    });
    
    await message.save();
    
    // Update or create conversation
    let conversation = await Conversation.findOne({
      participants: { $all: [req.userId, receiverId] }
    });
    
    if (conversation) {
      conversation.lastMessage = text || 'Media';
      conversation.lastMessageTime = new Date();
      await conversation.save();
    } else {
      conversation = new Conversation({
        participants: [req.userId, receiverId],
        lastMessage: text || 'Media'
      });
      await conversation.save();
    }
    
    // Emit via Socket.io
    io.to(receiverId).emit('new_message', message);
    
    res.json(message);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/conversations', authMiddleware, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.userId
    }).populate('participants', 'username fullName avatar');
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/messages/:userId', authMiddleware, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { senderId: req.userId, receiverId: req.params.userId },
        { senderId: req.params.userId, receiverId: req.userId }
      ]
    }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== SPOTIFY API ROUTES ==========
const SpotifyWebApi = require('spotify-web-api-node');

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET
});

let spotifyToken = null;

async function refreshSpotifyToken() {
  try {
    const data = await spotifyApi.clientCredentialsGrant();
    spotifyToken = data.body['access_token'];
    spotifyApi.setAccessToken(spotifyToken);
    setTimeout(refreshSpotifyToken, data.body['expires_in'] * 1000);
  } catch (error) {
    console.error('Spotify token error:', error);
  }
}

refreshSpotifyToken();

app.get('/api/music/search', authMiddleware, async (req, res) => {
  try {
    const { q } = req.query;
    const result = await spotifyApi.searchTracks(q, { limit: 20 });
    res.json(result.body.tracks.items.map(track => ({
      id: track.id,
      name: track.name,
      artists: track.artists.map(a => a.name).join(', '),
      previewUrl: track.preview_url,
      albumImage: track.album.images[0]?.url,
      duration: track.duration_ms
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== SOCKET.IO ==========
io.on('connection', (socket) => {
  const userId = socket.handshake.auth.userId;
  if (userId) {
    socket.join(userId);
  }
  
  socket.on('typing', ({ receiverId, isTyping }) => {
    socket.to(receiverId).emit('user_typing', { userId, isTyping });
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// ========== START SERVER ==========
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});