const admin = require('firebase-admin');
const db = require('../config/db');
const mlService = require('./mlService');
const analyticsService = require('./analyticsService');

class NotificationService {
  constructor() {
    this.notificationQueue = new Map();
    this.userPreferences = new Map();
    this.deviceTokens = new Map();
    this.initialize();
  }

  async initialize() {
    await this.loadUserPreferences();
    this.startNotificationProcessor();
  }

  async loadUserPreferences() {
    try {
      const [preferences] = await db.execute('SELECT * FROM notification_preferences');
      preferences.forEach(pref => {
        this.userPreferences.set(pref.user_id, {
          channels: JSON.parse(pref.channels),
          priorities: JSON.parse(pref.priorities),
          quietHours: JSON.parse(pref.quiet_hours),
          filters: JSON.parse(pref.filters)
        });
      });
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    }
  }

  async sendSmartNotification(userId, notification) {
    try {
      // Get user preferences
      const preferences = this.userPreferences.get(userId);
      if (!preferences) return;

      // Analyze notification context
      const context = await this.analyzeNotificationContext(notification);
      
      // Calculate priority and urgency
      const {
        priority,
        urgency,
        shouldSend
      } = await this.calculateNotificationPriority(notification, context);

      if (!shouldSend) return;

      // Select appropriate channels
      const channels = this.selectNotificationChannels(
        notification,
        preferences,
        priority,
        urgency
      );

      // Prepare notification content
      const content = await this.prepareNotificationContent(
        notification,
        preferences,
        context
      );

      // Send through selected channels
      await this.dispatchNotifications(userId, content, channels);

      // Track notification metrics
      await this.trackNotificationMetrics(userId, notification, context);
    } catch (error) {
      console.error('Error sending smart notification:', error);
    }
  }

  async analyzeNotificationContext(notification) {
    // Analyze notification content
    const contentAnalysis = await mlService.analyzeContent(notification.content);

    // Get user context
    const userContext = await this.getUserContext(notification.userId);

    // Get environmental context
    const envContext = await this.getEnvironmentalContext(notification);

    return {
      contentType: contentAnalysis.type,
      sentiment: contentAnalysis.sentiment,
      userState: userContext.currentState,
      userActivity: userContext.currentActivity,
      timeContext: this.getTimeContext(),
      environmentalFactors: envContext
    };
  }

  async calculateNotificationPriority(notification, context) {
    const factors = {
      // Content-based factors
      contentType: this.getContentTypePriority(notification.type),
      contentUrgency: this.getContentUrgency(notification.content),
      
      // Context-based factors
      timeRelevance: this.calculateTimeRelevance(context.timeContext),
      userStateRelevance: this.calculateUserStateRelevance(context.userState),
      environmentalRelevance: this.calculateEnvironmentalRelevance(context.environmentalFactors),
      
      // Historical factors
      userResponseRate: await this.getUserResponseRate(notification.userId, notification.type),
      previousInteractions: await this.analyzePreviewsInteractions(notification.userId)
    };

    // Calculate weighted priority score
    const priorityScore = this.calculatePriorityScore(factors);
    
    // Determine if notification should be sent
    const shouldSend = this.shouldSendNotification(priorityScore, context);

    return {
      priority: this.getPriorityLevel(priorityScore),
      urgency: this.getUrgencyLevel(factors),
      shouldSend
    };
  }

  selectNotificationChannels(notification, preferences, priority, urgency) {
    const availableChannels = preferences.channels;
    const selectedChannels = new Set();

    // High priority notifications use all available channels
    if (priority === 'high') {
      return new Set(availableChannels);
    }

    // Select channels based on notification type and urgency
    switch (notification.type) {
      case 'emergency':
        selectedChannels.add('push');
        selectedChannels.add('sms');
        if (urgency === 'high') selectedChannels.add('call');
        break;

      case 'health_alert':
        selectedChannels.add('push');
        if (urgency === 'high') selectedChannels.add('sms');
        break;

      case 'safety_alert':
        selectedChannels.add('push');
        if (priority === 'medium') selectedChannels.add('sms');
        break;

      case 'activity_update':
        selectedChannels.add('push');
        break;

      default:
        selectedChannels.add('push');
    }

    // Filter channels based on user preferences
    return new Set(
      [...selectedChannels].filter(channel => 
        availableChannels.includes(channel)
      )
    );
  }

  async prepareNotificationContent(notification, preferences, context) {
    // Get base content
    const baseContent = this.getLocalizedContent(
      notification,
      preferences.language
    );

    // Personalize content
    const personalizedContent = this.personalizeContent(
      baseContent,
      context.userState
    );

    // Add context-aware information
    const enrichedContent = await this.enrichContentWithContext(
      personalizedContent,
      context
    );

    // Format for different channels
    return {
      push: this.formatPushNotification(enrichedContent),
      sms: this.formatSMSContent(enrichedContent),
      email: this.formatEmailContent(enrichedContent),
      call: this.formatCallScript(enrichedContent)
    };
  }

  async dispatchNotifications(userId, content, channels) {
    const dispatches = [];

    // Get user's device tokens
    const tokens = await this.getDeviceTokens(userId);

    for (const channel of channels) {
      switch (channel) {
        case 'push':
          dispatches.push(
            this.sendPushNotification(tokens.push, content.push)
          );
          break;

        case 'sms':
          dispatches.push(
            this.sendSMS(tokens.phone, content.sms)
          );
          break;

        case 'email':
          dispatches.push(
            this.sendEmail(tokens.email, content.email)
          );
          break;

        case 'call':
          dispatches.push(
            this.initiateCall(tokens.phone, content.call)
          );
          break;
      }
    }

    // Wait for all notifications to be sent
    await Promise.all(dispatches);
  }

  async sendPushNotification(tokens, content) {
    try {
      const message = {
        notification: {
          title: content.title,
          body: content.body
        },
        data: content.data,
        tokens: tokens
      };

      const response = await admin.messaging().sendMulticast(message);
      return response;
    } catch (error) {
      console.error('Error sending push notification:', error);
      throw error;
    }
  }

  async trackNotificationMetrics(userId, notification, context) {
    try {
      // Store notification record
      await db.execute(
        'INSERT INTO notification_metrics (user_id, type, content, context, sent_at) VALUES (?, ?, ?, ?, NOW())',
        [userId, notification.type, JSON.stringify(notification), JSON.stringify(context)]
      );

      // Update user engagement metrics
      await this.updateUserEngagementMetrics(userId, notification.type);

      // Analyze notification effectiveness
      await this.analyzeNotificationEffectiveness(userId);
    } catch (error) {
      console.error('Error tracking notification metrics:', error);
    }
  }

  // Helper methods
  getTimeContext() {
    const now = new Date();
    return {
      hour: now.getHours(),
      day: now.getDay(),
      isWeekend: now.getDay() === 0 || now.getDay() === 6,
      isQuietHours: this.isQuietHours(now)
    };
  }

  calculateTimeRelevance(timeContext) {
    // Calculate relevance score based on time factors
    let relevance = 1.0;

    // Reduce relevance during quiet hours
    if (timeContext.isQuietHours) {
      relevance *= 0.3;
    }

    // Adjust for time of day
    if (timeContext.hour < 8 || timeContext.hour > 22) {
      relevance *= 0.5;
    }

    // Adjust for weekends
    if (timeContext.isWeekend) {
      relevance *= 0.8;
    }

    return relevance;
  }

  getPriorityLevel(score) {
    if (score >= 0.8) return 'high';
    if (score >= 0.5) return 'medium';
    return 'low';
  }

  getUrgencyLevel(factors) {
    const urgencyScore = (
      factors.contentUrgency * 0.4 +
      factors.timeRelevance * 0.3 +
      factors.userStateRelevance * 0.3
    );

    if (urgencyScore >= 0.8) return 'high';
    if (urgencyScore >= 0.5) return 'medium';
    return 'low';
  }

  async getUserResponseRate(userId, notificationType) {
    const [results] = await db.execute(
      `SELECT 
        COUNT(CASE WHEN responded = true THEN 1 END) as responded,
        COUNT(*) as total
       FROM notification_metrics
       WHERE user_id = ? AND type = ?
       AND sent_at >= NOW() - INTERVAL 7 DAY`,
      [userId, notificationType]
    );

    const { responded, total } = results[0];
    return total > 0 ? responded / total : 0.5;
  }

  shouldSendNotification(priorityScore, context) {
    // Don't send during quiet hours unless high priority
    if (context.timeContext.isQuietHours && priorityScore < 0.8) {
      return false;
    }

    // Don't send if user is in do-not-disturb mode unless emergency
    if (context.userState.doNotDisturb && priorityScore < 0.9) {
      return false;
    }

    // Always send if priority is high enough
    if (priorityScore >= 0.7) {
      return true;
    }

    // Consider user's current activity
    if (context.userState.currentActivity === 'busy' && priorityScore < 0.6) {
      return false;
    }

    return true;
  }
}

module.exports = new NotificationService();
