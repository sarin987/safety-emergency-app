const db = require('../config/db');
const { io } = require('../server');
const admin = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');

exports.getConversations = async (req, res) => {
  const userId = req.params.userId;

  try {
    const [conversations] = await db.promise().query(
      `SELECT 
        c.id,
        c.user1_id,
        c.user2_id,
        c.last_message_id,
        c.updated_at,
        u1.full_name as user1_name,
        u1.profile_pic_url as user1_profile_pic,
        u2.full_name as user2_name,
        u2.profile_pic_url as user2_profile_pic,
        m.content as last_message_content,
        m.message_type as last_message_type,
        m.created_at as last_message_time,
        (
          SELECT COUNT(*)
          FROM messages
          WHERE ((sender_id = c.user1_id AND receiver_id = c.user2_id)
            OR (sender_id = c.user2_id AND receiver_id = c.user1_id))
          AND read_at IS NULL
          AND receiver_id = ?
        ) as unread_count
      FROM conversations c
      LEFT JOIN users u1 ON c.user1_id = u1.id
      LEFT JOIN users u2 ON c.user2_id = u2.id
      LEFT JOIN messages m ON c.last_message_id = m.id
      WHERE c.user1_id = ? OR c.user2_id = ?
      ORDER BY c.updated_at DESC`,
      [userId, userId, userId]
    );

    // Format conversations
    const formattedConversations = conversations.map(conv => ({
      id: conv.id,
      user1: {
        id: conv.user1_id,
        name: conv.user1_name,
        profilePicUrl: conv.user1_profile_pic
      },
      user2: {
        id: conv.user2_id,
        name: conv.user2_name,
        profilePicUrl: conv.user2_profile_pic
      },
      lastMessage: conv.last_message_id ? {
        content: conv.last_message_content,
        messageType: conv.last_message_type,
        timestamp: conv.last_message_time
      } : null,
      unreadCount: conv.unread_count,
      updatedAt: conv.updated_at
    }));

    res.json(formattedConversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
};

exports.getMessages = async (req, res) => {
  const { userId, otherUserId, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  try {
    const [messages] = await db.promise().query(
      `SELECT 
        m.*,
        u.full_name as sender_name,
        u.profile_pic_url as sender_profile_pic
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE (m.sender_id = ? AND m.receiver_id = ?)
        OR (m.sender_id = ? AND m.receiver_id = ?)
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?`,
      [userId, otherUserId, otherUserId, userId, parseInt(limit), offset]
    );

    // Mark messages as read
    await db.promise().query(
      `UPDATE messages 
       SET read_at = CURRENT_TIMESTAMP
       WHERE sender_id = ?
         AND receiver_id = ?
         AND read_at IS NULL`,
      [otherUserId, userId]
    );

    // Format messages
    const formattedMessages = messages.map(msg => ({
      id: msg.id,
      sender: {
        id: msg.sender_id,
        name: msg.sender_name,
        profilePicUrl: msg.sender_profile_pic
      },
      messageType: msg.message_type,
      content: msg.content,
      mediaUrl: msg.media_url,
      status: msg.read_at ? 'read' : (msg.delivered_at ? 'delivered' : 'sent'),
      timestamp: msg.created_at
    }));

    res.json(formattedMessages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

exports.sendMessage = async (req, res) => {
  const { senderId, receiverId, messageType, content, mediaUrl } = req.body;

  try {
    // Insert message
    const [result] = await db.promise().query(
      `INSERT INTO messages (sender_id, receiver_id, message_type, content, media_url)
       VALUES (?, ?, ?, ?, ?)`,
      [senderId, receiverId, messageType, content, mediaUrl]
    );

    // Update or create conversation
    await db.promise().query(
      `INSERT INTO conversations (user1_id, user2_id, last_message_id)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         last_message_id = ?,
         updated_at = CURRENT_TIMESTAMP`,
      [
        Math.min(senderId, receiverId),
        Math.max(senderId, receiverId),
        result.insertId,
        result.insertId
      ]
    );

    // Get user device tokens for push notification
    const [devices] = await db.promise().query(
      'SELECT device_token FROM user_devices WHERE user_id = ? AND is_active = 1',
      [receiverId]
    );

    // Send push notification
    if (devices.length > 0) {
      const [senderInfo] = await db.promise().query(
        'SELECT full_name FROM users WHERE id = ?',
        [senderId]
      );

      const message = {
        notification: {
          title: senderInfo[0].full_name,
          body: messageType === 'text' ? content : `Sent a ${messageType}`,
        },
        data: {
          type: 'chat',
          senderId: senderId.toString(),
          messageId: result.insertId.toString(),
        },
        tokens: devices.map(d => d.device_token),
      };

      await admin.messaging().sendMulticast(message);
    }

    res.json({
      id: result.insertId,
      timestamp: new Date(),
      status: 'sent'
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

exports.uploadMedia = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const bucket = admin.storage().bucket();
    const filename = `chat-media/${uuidv4()}-${req.file.originalname}`;
    const file = bucket.file(filename);

    // Create a write stream and upload the file
    const stream = file.createWriteStream({
      metadata: {
        contentType: req.file.mimetype,
      },
    });

    stream.on('error', (error) => {
      console.error('Error uploading file:', error);
      res.status(500).json({ error: 'Failed to upload file' });
    });

    stream.on('finish', async () => {
      // Make the file publicly accessible
      await file.makePublic();
      const url = `https://storage.googleapis.com/${bucket.name}/${filename}`;
      res.json({ url });
    });

    stream.end(req.file.buffer);
  } catch (error) {
    console.error('Error handling file upload:', error);
    res.status(500).json({ error: 'Failed to handle file upload' });
  }
};

exports.markMessageDelivered = async (req, res) => {
  const { messageId } = req.params;

  try {
    await db.promise().query(
      'UPDATE messages SET delivered_at = CURRENT_TIMESTAMP WHERE id = ? AND delivered_at IS NULL',
      [messageId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking message as delivered:', error);
    res.status(500).json({ error: 'Failed to mark message as delivered' });
  }
};

exports.markMessageRead = async (req, res) => {
  const { messageId } = req.params;

  try {
    await db.promise().query(
      'UPDATE messages SET read_at = CURRENT_TIMESTAMP WHERE id = ? AND read_at IS NULL',
      [messageId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ error: 'Failed to mark message as read' });
  }
};
