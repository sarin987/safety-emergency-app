const db = require('../config/database');
const mlService = require('./mlService');
const { calculateTrends, predictFuture } = require('../utils/analytics');

class AnalyticsService {
  constructor() {
    this.analysisCache = new Map();
    this.predictionModels = new Map();
    this.initialize();
  }

  async initialize() {
    await this.loadPredictionModels();
    this.startPeriodicAnalysis();
  }

  async generateChildReport(deviceId, timeframe = '30d') {
    try {
      // Gather comprehensive data
      const [
        vitals,
        locations,
        activities,
        alerts,
        attendance
      ] = await Promise.all([
        this.getVitalsData(deviceId, timeframe),
        this.getLocationData(deviceId, timeframe),
        this.getActivityData(deviceId, timeframe),
        this.getAlertData(deviceId, timeframe),
        this.getAttendanceData(deviceId, timeframe)
      ]);

      // Generate insights
      const insights = {
        health: await this.analyzeHealthTrends(vitals),
        behavior: await this.analyzeBehaviorPatterns(activities),
        safety: await this.analyzeSafetyMetrics(alerts, locations),
        academic: await this.analyzeAcademicPerformance(attendance),
        predictions: await this.generatePredictions(deviceId)
      };

      // Calculate risk scores
      const riskAnalysis = await this.calculateRiskScores(deviceId, insights);

      // Generate recommendations
      const recommendations = await this.generateRecommendations(insights, riskAnalysis);

      return {
        summary: this.generateSummary(insights),
        details: {
          health: this.formatHealthMetrics(vitals, insights.health),
          safety: this.formatSafetyMetrics(alerts, insights.safety),
          academic: this.formatAcademicMetrics(attendance, insights.academic),
          behavior: this.formatBehaviorMetrics(activities, insights.behavior)
        },
        risks: riskAnalysis,
        recommendations,
        predictions: insights.predictions
      };
    } catch (error) {
      console.error('Error generating child report:', error);
      throw error;
    }
  }

  async analyzeHealthTrends(vitals) {
    const analysis = {
      vitalSigns: this.analyzeVitalSigns(vitals),
      sleepPatterns: this.analyzeSleepPatterns(vitals),
      activityLevels: this.analyzeActivityLevels(vitals),
      stressLevels: this.analyzeStressLevels(vitals)
    };

    // Detect patterns and anomalies
    const patterns = await mlService.analyzeBehaviorPattern(vitals);
    const anomalies = await mlService.detectAnomalies(vitals);

    return {
      ...analysis,
      patterns,
      anomalies,
      recommendations: this.generateHealthRecommendations(analysis)
    };
  }

  async analyzeBehaviorPatterns(activities) {
    const patterns = {
      dailyRoutines: this.analyzeDailyRoutines(activities),
      socialInteractions: this.analyzeSocialInteractions(activities),
      emotionalStates: this.analyzeEmotionalStates(activities),
      behavioralChanges: this.detectBehavioralChanges(activities)
    };

    // Predict future behavior
    const predictions = await this.predictBehavior(activities);

    return {
      ...patterns,
      predictions,
      concerns: this.identifyBehavioralConcerns(patterns),
      recommendations: this.generateBehavioralRecommendations(patterns)
    };
  }

  async analyzeSafetyMetrics(alerts, locations) {
    const analysis = {
      safeZoneCompliance: this.analyzeSafeZoneCompliance(locations),
      alertFrequency: this.analyzeAlertFrequency(alerts),
      riskAreas: this.identifyRiskAreas(locations, alerts),
      emergencyResponses: this.analyzeEmergencyResponses(alerts)
    };

    // Generate safety score
    const safetyScore = this.calculateSafetyScore(analysis);

    return {
      ...analysis,
      safetyScore,
      recommendations: this.generateSafetyRecommendations(analysis)
    };
  }

  async analyzeAcademicPerformance(attendance) {
    const analysis = {
      attendanceRate: this.calculateAttendanceRate(attendance),
      punctuality: this.analyzePunctuality(attendance),
      scheduleAdherence: this.analyzeScheduleAdherence(attendance),
      extracurricularEngagement: this.analyzeExtracurricular(attendance)
    };

    return {
      ...analysis,
      trends: this.identifyAcademicTrends(analysis),
      recommendations: this.generateAcademicRecommendations(analysis)
    };
  }

  async generatePredictions(deviceId) {
    const predictions = {
      health: await mlService.predictHealthRisks(deviceId),
      behavior: await this.predictBehavioralChanges(deviceId),
      safety: await mlService.predictEmergencyRisk(deviceId),
      academic: await this.predictAcademicPerformance(deviceId)
    };

    return {
      ...predictions,
      overallRisk: this.calculateOverallRisk(predictions),
      preventiveActions: this.generatePreventiveActions(predictions)
    };
  }

  async calculateRiskScores(deviceId, insights) {
    const weights = {
      health: 0.3,
      safety: 0.3,
      behavior: 0.2,
      academic: 0.2
    };

    const scores = {
      health: this.calculateHealthRisk(insights.health),
      safety: this.calculateSafetyRisk(insights.safety),
      behavior: this.calculateBehaviorRisk(insights.behavior),
      academic: this.calculateAcademicRisk(insights.academic)
    };

    const overallRisk = Object.entries(weights).reduce(
      (total, [key, weight]) => total + (scores[key] * weight),
      0
    );

    return {
      individual: scores,
      overall: overallRisk,
      riskLevel: this.getRiskLevel(overallRisk),
      trends: await this.analyzeRiskTrends(deviceId)
    };
  }

  async generateRecommendations(insights, risks) {
    const recommendations = {
      immediate: this.generateImmediateActions(risks),
      shortTerm: this.generateShortTermActions(insights),
      longTerm: this.generateLongTermStrategies(insights),
      preventive: this.generatePreventiveMeasures(risks)
    };

    // Prioritize recommendations
    return this.prioritizeRecommendations(recommendations);
  }

  // Helper methods for data analysis
  analyzeVitalSigns(vitals) {
    return vitals.reduce((analysis, vital) => {
      analysis.heartRate.push(vital.heart_rate);
      analysis.temperature.push(vital.temperature);
      analysis.bloodOxygen.push(vital.blood_oxygen);
      return analysis;
    }, { heartRate: [], temperature: [], bloodOxygen: [] });
  }

  analyzeSleepPatterns(vitals) {
    return vitals.reduce((patterns, vital) => {
      if (vital.sleep_state) {
        patterns[vital.sleep_state] = (patterns[vital.sleep_state] || 0) + 1;
      }
      return patterns;
    }, {});
  }

  calculateSafetyScore(analysis) {
    const weights = {
      safeZoneCompliance: 0.4,
      alertFrequency: 0.3,
      riskAreas: 0.2,
      emergencyResponses: 0.1
    };

    return Object.entries(weights).reduce((score, [metric, weight]) => {
      return score + (analysis[metric].score * weight);
    }, 0);
  }

  // Data retrieval methods
  async getVitalsData(deviceId, timeframe) {
    const [vitals] = await db.execute(
      `SELECT * FROM vital_signs 
       WHERE device_id = ? 
       AND recorded_at >= NOW() - INTERVAL ? DAY
       ORDER BY recorded_at ASC`,
      [deviceId, parseInt(timeframe)]
    );
    return vitals;
  }

  async getLocationData(deviceId, timeframe) {
    const [locations] = await db.execute(
      `SELECT * FROM device_locations 
       WHERE device_id = ? 
       AND updated_at >= NOW() - INTERVAL ? DAY
       ORDER BY updated_at ASC`,
      [deviceId, parseInt(timeframe)]
    );
    return locations;
  }

  async getActivityData(deviceId, timeframe) {
    const [activities] = await db.execute(
      `SELECT * FROM activity_logs 
       WHERE device_id = ? 
       AND created_at >= NOW() - INTERVAL ? DAY
       ORDER BY created_at ASC`,
      [deviceId, parseInt(timeframe)]
    );
    return activities;
  }

  // Formatting methods
  formatHealthMetrics(vitals, insights) {
    return {
      summary: this.summarizeHealthMetrics(vitals),
      trends: this.formatHealthTrends(insights),
      anomalies: this.formatHealthAnomalies(insights.anomalies),
      recommendations: insights.recommendations
    };
  }

  formatSafetyMetrics(alerts, insights) {
    return {
      summary: this.summarizeSafetyMetrics(alerts),
      riskAreas: this.formatRiskAreas(insights.riskAreas),
      safetyScore: insights.safetyScore,
      recommendations: insights.recommendations
    };
  }

  // Risk calculation methods
  calculateHealthRisk(healthInsights) {
    const factors = {
      vitalSigns: this.assessVitalSignsRisk(healthInsights.vitalSigns),
      sleepQuality: this.assessSleepRisk(healthInsights.sleepPatterns),
      activityLevel: this.assessActivityRisk(healthInsights.activityLevels),
      stressLevel: this.assessStressRisk(healthInsights.stressLevels)
    };

    return this.computeWeightedRisk(factors);
  }

  getRiskLevel(score) {
    if (score >= 0.8) return 'critical';
    if (score >= 0.6) return 'high';
    if (score >= 0.4) return 'moderate';
    return 'low';
  }

  // Recommendation generation methods
  generateImmediateActions(risks) {
    return Object.entries(risks.individual)
      .filter(([_, score]) => score >= 0.7)
      .map(([area, score]) => ({
        area,
        priority: 'high',
        actions: this.getImmediateActionsByArea(area, score)
      }));
  }

  prioritizeRecommendations(recommendations) {
    return Object.entries(recommendations).reduce((prioritized, [term, actions]) => {
      prioritized[term] = actions.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
      return prioritized;
    }, {});
  }
}

module.exports = new AnalyticsService();
