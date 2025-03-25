const express = require('express');
const router = express.Router();
const multer = require('multer');
const chatController = require('../controllers/chatController');
const authMiddleware = require('../middleware/auth');

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images and videos only
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and videos are allowed.'));
    }
  }
});

// Get all conversations for a user
router.get('/conversations/:userId', authMiddleware, chatController.getConversations);

// Get messages between two users
router.get('/messages', authMiddleware, chatController.getMessages);

// Send a new message
router.post('/messages', authMiddleware, chatController.sendMessage);

// Upload media for chat
router.post('/upload', 
  authMiddleware, 
  upload.single('media'),
  chatController.uploadMedia
);

// Mark message as delivered
router.put('/messages/:messageId/delivered', 
  authMiddleware, 
  chatController.markMessageDelivered
);

// Mark message as read
router.put('/messages/:messageId/read', 
  authMiddleware, 
  chatController.markMessageRead
);

// Error handling middleware
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        error: 'File is too large. Maximum size is 10MB.' 
      });
    }
  }
  
  if (err.message === 'Invalid file type. Only images and videos are allowed.') {
    return res.status(400).json({ error: err.message });
  }

  console.error('Chat route error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = router;
