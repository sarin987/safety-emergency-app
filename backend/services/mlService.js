const tf = require('@tensorflow/tfjs-node');
const { loadModel, preprocessData } = require('../utils/mlUtils');
const db = require('../config/database');

class MLService {
  constructor() {
    this.models = {
      behavior: null,
      health: null,
      anomaly: null,
      emergency: null
    };
    this.initialize();
  }

  async initialize() {
    try {
      // Load pre-trained models
      this.models.behavior = await loadModel('behavior');
      this.models.health = await loadModel('health');
      this.models.anomaly = await loadModel('anomaly');
      this.models.emergency = await loadModel('emergency');
    } catch (error) {
      console.error('Error initializing ML models:', error);
    }
  }

  async analyzeBehaviorPattern(deviceId, timeframe = '7d') {
    try {
      // Fetch historical data
      const [activities] = await db.execute(
        `SELECT * FROM activity_logs 
         WHERE device_id = ? 
         AND created_at >= NOW() - INTERVAL ? DAY`,
        [deviceId, parseInt(timeframe)]
      );

      // Preprocess activity data
      const processedData = preprocessData(activities);
      
      // Run behavior analysis
      const behaviorTensor = tf.tensor2d(processedData);
      const prediction = await this.models.behavior.predict(behaviorTensor);
      
      // Analyze results
      const patterns = this.interpretBehaviorResults(prediction);
      
      return {
        patterns,
        confidence: prediction.confidence,
        anomalies: patterns.filter(p => p.isAnomalous)
      };
    } catch (error) {
      console.error('Error analyzing behavior:', error);
      throw error;
    }
  }

  async predictHealthRisks(deviceId) {
    try {
      // Fetch vital signs history
      const [vitals] = await db.execute(
        `SELECT * FROM vital_signs 
         WHERE device_id = ? 
         ORDER BY recorded_at DESC 
         LIMIT 100`,
        [deviceId]
      );

      // Preprocess health data
      const processedData = this.preprocessHealthData(vitals);
      
      // Run health risk prediction
      const healthTensor = tf.tensor2d(processedData);
      const prediction = await this.models.health.predict(healthTensor);
      
      // Analyze health risks
      const risks = this.interpretHealthRisks(prediction);
      
      return {
        risks,
        confidence: prediction.confidence,
        recommendations: this.generateHealthRecommendations(risks)
      };
    } catch (error) {
      console.error('Error predicting health risks:', error);
      throw error;
    }
  }

  async detectAnomalies(deviceId, data) {
    try {
      // Prepare data for anomaly detection
      const tensor = tf.tensor2d(this.prepareAnomalyData(data));
      
      // Run anomaly detection
      const prediction = await this.models.anomaly.predict(tensor);
      
      // Analyze anomalies
      const anomalies = this.interpretAnomalies(prediction, data);
      
      return {
        anomalies,
        severity: this.calculateAnomalySeverity(anomalies),
        recommendations: this.generateAnomalyRecommendations(anomalies)
      };
    } catch (error) {
      console.error('Error detecting anomalies:', error);
      throw error;
    }
  }

  async predictEmergencyRisk(deviceId) {
    try {
      // Fetch relevant data
      const [data] = await Promise.all([
        db.execute(
          `SELECT v.*, l.latitude, l.longitude, a.activity_type, a.data as activity_data
           FROM vital_signs v
           LEFT JOIN device_locations l ON v.device_id = l.device_id
           LEFT JOIN activity_logs a ON v.device_id = a.device_id
           WHERE v.device_id = ?
           ORDER BY v.recorded_at DESC
           LIMIT 50`,
          [deviceId]
        )
      ]);

      // Prepare emergency prediction data
      const tensor = tf.tensor2d(this.prepareEmergencyData(data));
      
      // Run emergency risk prediction
      const prediction = await this.models.emergency.predict(tensor);
      
      // Analyze emergency risks
      const risks = this.interpretEmergencyRisks(prediction);
      
      return {
        risks,
        probability: prediction.probability,
        recommendedActions: this.generateEmergencyRecommendations(risks)
      };
    } catch (error) {
      console.error('Error predicting emergency risk:', error);
      throw error;
    }
  }

  // Helper methods for data processing and interpretation
  preprocessHealthData(vitals) {
    return vitals.map(vital => ({
      heartRate: this.normalizeValue(vital.heart_rate, 60, 120),
      temperature: this.normalizeValue(vital.temperature, 97, 99),
      bloodOxygen: this.normalizeValue(vital.blood_oxygen, 95, 100),
      activityLevel: this.encodeActivityLevel(vital.activity_level),
      stressLevel: this.normalizeValue(vital.stress_level, 0, 100)
    }));
  }

  prepareAnomalyData(data) {
    return {
      location: this.processLocationData(data.location),
      vitals: this.processVitalsData(data.vitals),
      activity: this.processActivityData(data.activity),
      timeFeatures: this.extractTimeFeatures(data.timestamp)
    };
  }

  prepareEmergencyData(data) {
    return data.map(record => ({
      vitalSigns: this.processVitalsData(record),
      location: this.processLocationData(record),
      activity: this.processActivityData(record.activity_data),
      environmentalFactors: this.extractEnvironmentalFactors(record),
      historicalPatterns: this.analyzeHistoricalPatterns(record)
    }));
  }

  interpretBehaviorResults(prediction) {
    const behaviors = prediction.arraySync();
    return behaviors.map(behavior => ({
      type: this.getBehaviorType(behavior[0]),
      confidence: behavior[1],
      isAnomalous: behavior[2] > 0.7,
      risk: this.calculateRiskLevel(behavior)
    }));
  }

  interpretHealthRisks(prediction) {
    const risks = prediction.arraySync();
    return risks.map(risk => ({
      condition: this.getHealthCondition(risk[0]),
      probability: risk[1],
      severity: this.calculateSeverity(risk[2]),
      timeframe: this.getTimeframe(risk[3])
    }));
  }

  interpretAnomalies(prediction, originalData) {
    return prediction.arraySync().map((anomaly, index) => ({
      type: this.getAnomalyType(anomaly[0]),
      severity: this.calculateSeverity(anomaly[1]),
      confidence: anomaly[2],
      relatedData: this.extractRelatedData(originalData, index),
      timestamp: new Date()
    }));
  }

  interpretEmergencyRisks(prediction) {
    return prediction.arraySync().map(risk => ({
      type: this.getEmergencyType(risk[0]),
      probability: risk[1],
      severity: this.calculateSeverity(risk[2]),
      timeToEvent: this.estimateTimeToEvent(risk[3]),
      contributingFactors: this.identifyContributingFactors(risk)
    }));
  }

  // Utility methods
  normalizeValue(value, min, max) {
    return (value - min) / (max - min);
  }

  encodeActivityLevel(level) {
    const levels = {
      'sedentary': 0,
      'light': 1,
      'moderate': 2,
      'vigorous': 3
    };
    return levels[level] || 0;
  }

  calculateRiskLevel(behavior) {
    const [pattern, confidence, anomaly] = behavior;
    return (pattern * 0.3 + confidence * 0.3 + anomaly * 0.4);
  }

  calculateSeverity(value) {
    if (value >= 0.8) return 'critical';
    if (value >= 0.6) return 'high';
    if (value >= 0.4) return 'moderate';
    return 'low';
  }

  generateHealthRecommendations(risks) {
    return risks.map(risk => ({
      condition: risk.condition,
      recommendations: this.getHealthRecommendations(risk),
      preventiveMeasures: this.getPreventiveMeasures(risk),
      urgency: this.calculateUrgency(risk)
    }));
  }

  generateAnomalyRecommendations(anomalies) {
    return anomalies.map(anomaly => ({
      type: anomaly.type,
      actions: this.getAnomalyActions(anomaly),
      priority: this.calculatePriority(anomaly),
      notification: this.shouldNotify(anomaly)
    }));
  }

  generateEmergencyRecommendations(risks) {
    return risks.map(risk => ({
      type: risk.type,
      immediateActions: this.getEmergencyActions(risk),
      preventiveSteps: this.getPreventiveSteps(risk),
      notificationTargets: this.getNotificationTargets(risk)
    }));
  }
}

module.exports = new MLService();
