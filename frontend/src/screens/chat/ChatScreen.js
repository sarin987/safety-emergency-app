import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Dimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { launchImageLibrary } from 'react-native-image-picker';
import Video from 'react-native-video';
import ImageView from 'react-native-image-viewing';
import VideoPlayer from 'react-native-video-controls';
import axios from 'axios';
import { API_URL } from '../../config';
import { io } from 'socket.io-client';
import debounce from 'lodash/debounce';

const ChatScreen = ({ route, navigation }) => {
  const { otherUser } = route.params;
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [socket, setSocket] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [videoPlayerVisible, setVideoPlayerVisible] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    initializeSocket();
    fetchMessages();
    return () => {
      if (socket) {
        socket.disconnect();
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const initializeSocket = () => {
    const newSocket = io(API_URL);
    
    newSocket.on('connect', () => {
      console.log('Connected to chat socket');
      newSocket.emit('joinChat', {
        userId: global.userId,
        otherUserId: otherUser.id
      });
    });

    newSocket.on('newMessage', (message) => {
      if (message.sender.id === otherUser.id || message.sender.id === global.userId) {
        addMessage(message);
        // Mark message as delivered
        newSocket.emit('messageDelivered', {
          messageId: message.id,
          userId: global.userId
        });
      }
    });

    newSocket.on('messageStatus', ({ messageId, status }) => {
      updateMessageStatus(messageId, status);
    });

    newSocket.on('userTyping', ({ userId, isTyping }) => {
      if (userId === otherUser.id) {
        setIsTyping(isTyping);
      }
    });

    setSocket(newSocket);
  };

  const addMessage = (message) => {
    setMessages(prev => [message, ...prev]);
  };

  const updateMessageStatus = (messageId, status) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, status } : msg
    ));
  };

  const fetchMessages = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${API_URL}/chat/messages`, {
        params: {
          userId: global.userId,
          otherUserId: otherUser.id
        }
      });
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
      Alert.alert('Error', 'Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTyping = debounce(() => {
    if (socket) {
      socket.emit('typing', {
        userId: global.userId,
        otherUserId: otherUser.id,
        isTyping: true
      });

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing', {
          userId: global.userId,
          otherUserId: otherUser.id,
          isTyping: false
        });
      }, 1500);
    }
  }, 100);

  const handleSend = async () => {
    if (!inputMessage.trim()) return;

    try {
      const message = {
        senderId: global.userId,
        receiverId: otherUser.id,
        messageType: 'text',
        content: inputMessage,
        status: 'sending'
      };

      // Optimistically add message to UI
      const tempId = Date.now().toString();
      addMessage({ ...message, id: tempId });

      const response = await axios.post(`${API_URL}/chat/messages`, message);

      // Update message with server-generated ID and status
      updateMessageStatus(tempId, 'sent');
      setInputMessage('');

      // Clear typing indicator
      if (socket) {
        socket.emit('typing', {
          userId: global.userId,
          otherUserId: otherUser.id,
          isTyping: false
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    }
  };

  const handleMediaPick = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'mixed',
        quality: 0.8,
      });

      if (result.assets && result.assets[0]) {
        const file = result.assets[0];
        setIsUploading(true);

        // Create form data
        const formData = new FormData();
        formData.append('media', {
          uri: file.uri,
          type: file.type,
          name: file.fileName,
        });

        // Upload media
        const uploadResponse = await axios.post(
          `${API_URL}/chat/upload`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );

        // Send message with media URL
        const message = {
          senderId: global.userId,
          receiverId: otherUser.id,
          messageType: file.type.startsWith('image/') ? 'image' : 'video',
          mediaUrl: uploadResponse.data.url,
          status: 'sending'
        };

        const response = await axios.post(`${API_URL}/chat/messages`, message);
        updateMessageStatus(response.data.id, 'sent');
      }
    } catch (error) {
      console.error('Error handling media:', error);
      Alert.alert('Error', 'Failed to send media');
    } finally {
      setIsUploading(false);
    }
  };

  const handleMediaPress = (message) => {
    if (message.messageType === 'image') {
      setSelectedImage(message.mediaUrl);
      setImageViewerVisible(true);
    } else if (message.messageType === 'video') {
      setSelectedVideo(message.mediaUrl);
      setVideoPlayerVisible(true);
    }
  };

  const renderMessage = ({ item }) => {
    const isOwnMessage = item.sender.id === global.userId;

    return (
      <View style={[
        styles.messageContainer,
        isOwnMessage ? styles.ownMessage : styles.otherMessage
      ]}>
        {item.messageType === 'text' ? (
          <Text style={styles.messageText}>{item.content}</Text>
        ) : (
          <TouchableOpacity onPress={() => handleMediaPress(item)}>
            {item.messageType === 'image' ? (
              <Image
                source={{ uri: item.mediaUrl }}
                style={styles.mediaContent}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.videoThumbnail}>
                <Image
                  source={{ uri: item.thumbnailUrl || item.mediaUrl }}
                  style={styles.mediaContent}
                  resizeMode="cover"
                />
                <View style={styles.playButton}>
                  <Icon name="play" size={30} color="#fff" />
                </View>
              </View>
            )}
          </TouchableOpacity>
        )}

        <View style={styles.messageFooter}>
          <Text style={styles.timestamp}>
            {new Date(item.timestamp).toLocaleTimeString()}
          </Text>
          {isOwnMessage && (
            <Icon
              name={getStatusIcon(item.status)}
              size={16}
              color={item.status === 'read' ? '#4CAF50' : '#999'}
              style={styles.statusIcon}
            />
          )}
        </View>
      </View>
    );
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'sending':
        return 'clock-outline';
      case 'sent':
        return 'check';
      case 'delivered':
        return 'check-all';
      case 'read':
        return 'check-all';
      default:
        return 'clock-outline';
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : null}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {isTyping && (
        <View style={styles.typingIndicator}>
          <Text style={styles.typingText}>{otherUser.name} is typing...</Text>
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id.toString()}
          inverted
          contentContainerStyle={styles.messagesList}
        />
      )}

      <View style={styles.inputContainer}>
        <TouchableOpacity 
          style={styles.mediaButton} 
          onPress={handleMediaPick}
          disabled={isUploading}
        >
          <Icon name="image-plus" size={24} color="#007AFF" />
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          value={inputMessage}
          onChangeText={(text) => {
            setInputMessage(text);
            handleTyping();
          }}
          placeholder="Type a message..."
          multiline
        />

        <TouchableOpacity 
          style={styles.sendButton}
          onPress={handleSend}
          disabled={!inputMessage.trim() || isUploading}
        >
          <Icon 
            name="send" 
            size={24} 
            color={!inputMessage.trim() || isUploading ? '#ccc' : '#007AFF'} 
          />
        </TouchableOpacity>
      </View>

      {isUploading && (
        <View style={styles.uploadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.uploadingText}>Uploading media...</Text>
        </View>
      )}

      <ImageView
        images={[{ uri: selectedImage }]}
        imageIndex={0}
        visible={imageViewerVisible}
        onRequestClose={() => setImageViewerVisible(false)}
      />

      {videoPlayerVisible && (
        <View style={styles.videoPlayerContainer}>
          <VideoPlayer
            source={{ uri: selectedVideo }}
            style={styles.videoPlayer}
            onBack={() => setVideoPlayerVisible(false)}
            disableVolume
          />
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  typingIndicator: {
    padding: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  typingText: {
    color: '#666',
    fontSize: 12,
    fontStyle: 'italic',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  messageContainer: {
    maxWidth: '80%',
    marginVertical: 5,
    padding: 10,
    borderRadius: 15,
  },
  ownMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#E5E5EA',
  },
  messageText: {
    fontSize: 16,
    color: '#fff',
  },
  mediaContent: {
    width: 200,
    height: 200,
    borderRadius: 10,
  },
  videoThumbnail: {
    position: 'relative',
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -15 }, { translateY: -15 }],
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 10,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  timestamp: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginRight: 5,
  },
  statusIcon: {
    marginLeft: 5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  mediaButton: {
    padding: 10,
  },
  input: {
    flex: 1,
    marginHorizontal: 10,
    maxHeight: 100,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    fontSize: 16,
  },
  sendButton: {
    padding: 10,
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  videoPlayerContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 1000,
  },
  videoPlayer: {
    flex: 1,
  },
});

export default ChatScreen;
