const tf = require('@tensorflow/tfjs-node');
const db = require('../config/database');
const mlService = require('./mlService');
const aiService = require('./aiService');
const notificationService = require('./notificationService');

class HealthMonitoringService {
  constructor() {
    this.models = {
      health: null,
      vitals: null,
      stress: null,
      sleep: null,
      activity: null
    };
    this.healthProfiles = new Map();
    this.initialize();
  }

  async initialize() {
    try {
      // Load health monitoring models
      this.models.health = await tf.loadLayersModel('file://models/health_monitoring');
      this.models.vitals = await tf.loadLayersModel('file://models/vitals_analysis');
      this.models.stress = await tf.loadLayersModel('file://models/stress_detection');
      this.models.sleep = await tf.loadLayersModel('file://models/sleep_analysis');
      this.models.activity = await tf.loadLayersModel('file://models/activity_recognition');
    } catch (error) {
      console.error('Error initializing health monitoring models:', error);
    }
  }

  async monitorHealth(deviceId) {
    try {
      // Gather comprehensive health data
      const [
        vitalsData,
        activityData,
        sleepData,
        stressData,
        environmentalData
      ] = await Promise.all([
        this.getVitalsData(deviceId),
        this.getActivityData(deviceId),
        this.getSleepData(deviceId),
        this.getStressData(deviceId),
        this.getEnvironmentalData(deviceId)
      ]);

      // Analyze different health aspects
      const analysis = {
        vitals: await this.analyzeVitalSigns(vitalsData),
        activity: await this.analyzeActivityPatterns(activityData),
        sleep: await this.analyzeSleepPatterns(sleepData),
        stress: await this.analyzeStressLevels(stressData),
        environmental: await this.analyzeEnvironmentalImpact(environmentalData)
      };

      // Generate health assessment
      const assessment = await this.generateHealthAssessment(analysis);

      // Update health profile
      await this.updateHealthProfile(deviceId, assessment);

      // Check for health concerns
      if (assessment.riskLevel > 0.6) {
        await this.handleHealthConcerns(deviceId, assessment);
      }

      return assessment;
    } catch (error) {
      console.error('Error monitoring health:', error);
      throw error;
    }
  }

  async analyzeVitalSigns(vitalsData) {
    const analysis = {
      heartRate: await this.analyzeHeartRate(vitalsData.heartRate),
      bloodPressure: await this.analyzeBloodPressure(vitalsData.bloodPressure),
      temperature: await this.analyzeTemperature(vitalsData.temperature),
      respiration: await this.analyzeRespiration(vitalsData.respiration),
      oxygenation: await this.analyzeOxygenation(vitalsData.oxygenation)
    };

    return {
      current: analysis,
      trends: await this.analyzeVitalsTrends(analysis),
      anomalies: await this.detectVitalsAnomalies(analysis),
      recommendations: this.generateVitalsRecommendations(analysis)
    };
  }

  async analyzeActivityPatterns(activityData) {
    const analysis = {
      steps: await this.analyzeStepCount(activityData.steps),
      movement: await this.analyzeMovementPatterns(activityData.movement),
      exercise: await this.analyzeExerciseRoutines(activityData.exercise),
      sedentary: await this.analyzeSedentaryPeriods(activityData.sedentary),
      energy: await this.analyzeEnergyExpenditure(activityData)
    };

    return {
      current: analysis,
      trends: await this.analyzeActivityTrends(analysis),
      goals: await this.trackActivityGoals(analysis),
      recommendations: this.generateActivityRecommendations(analysis)
    };
  }

  async analyzeSleepPatterns(sleepData) {
    const analysis = {
      duration: await this.analyzeSleepDuration(sleepData.duration),
      quality: await this.analyzeSleepQuality(sleepData.quality),
      cycles: await this.analyzeSleepCycles(sleepData.cycles),
      disruptions: await this.analyzeSleepDisruptions(sleepData.disruptions),
      environment: await this.analyzeSleepEnvironment(sleepData.environment)
    };

    return {
      current: analysis,
      trends: await this.analyzeSleepTrends(analysis),
      quality: this.calculateSleepQualityScore(analysis),
      recommendations: this.generateSleepRecommendations(analysis)
    };
  }

  async analyzeStressLevels(stressData) {
    const analysis = {
      physiological: await this.analyzePhysiologicalStress(stressData.physiological),
      behavioral: await this.analyzeBehavioralStress(stressData.behavioral),
      emotional: await this.analyzeEmotionalStress(stressData.emotional),
      cognitive: await this.analyzeCognitiveStress(stressData.cognitive),
      environmental: await this.analyzeEnvironmentalStress(stressData.environmental)
    };

    return {
      current: analysis,
      trends: await this.analyzeStressTrends(analysis),
      triggers: await this.identifyStressTriggers(analysis),
      recommendations: this.generateStressManagementPlan(analysis)
    };
  }

  async generateHealthAssessment(analysis) {
    // Calculate health scores
    const scores = {
      vitals: this.calculateVitalsScore(analysis.vitals),
      activity: this.calculateActivityScore(analysis.activity),
      sleep: this.calculateSleepScore(analysis.sleep),
      stress: this.calculateStressScore(analysis.stress),
      overall: await this.calculateOverallHealthScore(analysis)
    };

    // Generate health insights
    const insights = await this.generateHealthInsights(analysis, scores);

    // Create recommendations
    const recommendations = await this.generateHealthRecommendations(analysis, scores);

    return {
      scores,
      insights,
      recommendations,
      riskLevel: this.calculateHealthRiskLevel(scores),
      timestamp: Date.now()
    };
  }

  async handleHealthConcerns(deviceId, assessment) {
    try {
      // Get device and user information
      const [device] = await db.execute(
        'SELECT * FROM devices WHERE id = ?',
        [deviceId]
      );

      // Generate health alert
      const alert = await this.generateHealthAlert(assessment);

      // Notify relevant parties
      await this.notifyHealthStakeholders(device, assessment, alert);

      // Implement health measures
      await this.implementHealthMeasures(device, alert);

      // Log health incident
      await this.logHealthIncident(deviceId, assessment, alert);

      return alert;
    } catch (error) {
      console.error('Error handling health concerns:', error);
      throw error;
    }
  }

  async generateHealthAlert(assessment) {
    return {
      priority: this.calculateHealthPriority(assessment),
      concerns: this.identifyHealthConcerns(assessment),
      actions: await this.determineHealthActions(assessment),
      notifications: this.generateHealthNotifications(assessment)
    };
  }

  async notifyHealthStakeholders(device, assessment, alert) {
    // Notify emergency contacts
    await notificationService.sendSmartNotification(device.user_id, {
      type: 'health_alert',
      priority: alert.priority,
      content: {
        title: 'Health Alert',
        body: this.generateHealthNotificationContent(assessment),
        data: {
          assessment,
          alert
        }
      }
    });

    // Notify medical professionals if necessary
    if (assessment.riskLevel > 0.8) {
      await this.notifyMedicalProfessionals(device, assessment);
    }
  }

  // Helper methods
  calculateHealthRiskLevel(scores) {
    const weights = {
      vitals: 0.3,
      activity: 0.2,
      sleep: 0.2,
      stress: 0.3
    };

    return Object.entries(weights).reduce((total, [key, weight]) => {
      return total + ((1 - scores[key]) * weight);
    }, 0);
  }

  calculateHealthPriority(assessment) {
    if (assessment.riskLevel >= 0.8) return 'critical';
    if (assessment.riskLevel >= 0.6) return 'high';
    if (assessment.riskLevel >= 0.4) return 'medium';
    return 'low';
  }

  generateHealthNotificationContent(assessment) {
    const priority = this.calculateHealthPriority(assessment);
    const concerns = this.identifyHealthConcerns(assessment);
    
    return {
      title: `${priority.toUpperCase()} Health Alert`,
      body: `Health concerns detected: ${concerns.join(', ')}`,
      data: {
        assessment,
        timestamp: Date.now(),
        priority
      }
    };
  }

  async implementHealthMeasures(device, alert) {
    // Implement immediate health monitoring
    await Promise.all([
      this.increaseMonitoringFrequency(device),
      this.activateHealthSafeguards(device),
      this.adjustHealthParameters(device),
      this.scheduleHealthChecks(device)
    ]);
  }
}

module.exports = new HealthMonitoringService();
