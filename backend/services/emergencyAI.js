const { Configuration, OpenAIApi } = require('openai');
const tf = require('@tensorflow/tfjs-node');
const { processImage } = require('../utils/imageProcessing');
const { calculateRiskScore } = require('../utils/riskAssessment');

class EmergencyAI {
  constructor() {
    this.openai = new OpenAIApi(new Configuration({
      apiKey: process.env.OPENAI_API_KEY
    }));
    this.model = null;
    this.loadModel();
  }

  async loadModel() {
    // Load pre-trained emergency assessment model
    this.model = await tf.loadLayersModel('file://./models/emergency-assessment/model.json');
  }

  async assessEmergency(data) {
    const {
      description,
      images,
      location,
      vitalSigns,
      audioRecording,
      historicalData
    } = data;

    // 1. Process text description using GPT-4
    const textAnalysis = await this.analyzeDescription(description);

    // 2. Analyze images if available
    const imageAnalysis = images ? await this.analyzeImages(images) : null;

    // 3. Process audio for distress signals
    const audioAnalysis = audioRecording ? await this.analyzeAudio(audioRecording) : null;

    // 4. Analyze location risk factors
    const locationRisk = await this.assessLocationRisk(location);

    // 5. Process vital signs if medical emergency
    const vitalsAnalysis = vitalSigns ? this.analyzeVitalSigns(vitalSigns) : null;

    // 6. Consider historical emergency data
    const historicalAnalysis = await this.analyzeHistoricalData(historicalData);

    // Combine all analyses using weighted scoring
    const severityScore = this.calculateSeverityScore({
      textAnalysis,
      imageAnalysis,
      audioAnalysis,
      locationRisk,
      vitalsAnalysis,
      historicalAnalysis
    });

    return {
      severity: severityScore,
      response: this.getRecommendedResponse(severityScore),
      insights: this.generateInsights({
        textAnalysis,
        imageAnalysis,
        audioAnalysis,
        locationRisk,
        vitalsAnalysis,
        historicalAnalysis
      })
    };
  }

  async analyzeDescription(description) {
    const response = await this.openai.createCompletion({
      model: "gpt-4",
      prompt: `Analyze this emergency description and extract key risk factors: "${description}"`,
      max_tokens: 200
    });

    return {
      riskFactors: response.data.choices[0].text,
      keywords: this.extractKeywords(description),
      urgencyLevel: this.assessUrgency(response.data.choices[0].text)
    };
  }

  async analyzeImages(images) {
    const results = await Promise.all(images.map(async (image) => {
      // Process image using TensorFlow
      const tensor = await processImage(image);
      const prediction = await this.model.predict(tensor).data();
      
      // Detect specific emergency indicators
      return {
        hazardousObjects: this.detectHazards(prediction),
        injuryDetection: this.detectInjuries(prediction),
        environmentalRisks: this.assessEnvironment(prediction),
        confidenceScore: Math.max(...prediction)
      };
    }));

    return this.aggregateImageAnalysis(results);
  }

  async analyzeAudio(audioData) {
    // Process audio for distress signals, background noises, and voice stress analysis
    const audioFeatures = await this.extractAudioFeatures(audioData);
    return {
      distressLevel: this.detectDistress(audioFeatures),
      backgroundSounds: this.classifyBackgroundSounds(audioFeatures),
      voiceStressAnalysis: this.analyzeVoiceStress(audioFeatures)
    };
  }

  async assessLocationRisk(location) {
    // Consider multiple location-based risk factors
    const [weatherData, crimeStats, nearbyResources] = await Promise.all([
      this.getWeatherConditions(location),
      this.getCrimeStatistics(location),
      this.findNearbyEmergencyResources(location)
    ]);

    return {
      weatherRisk: this.calculateWeatherRisk(weatherData),
      crimeRisk: this.analyzeCrimePatterns(crimeStats),
      resourceAccessibility: this.assessResourceProximity(nearbyResources),
      terrainRisk: await this.analyzeTerrainRisk(location)
    };
  }

  analyzeVitalSigns(vitalSigns) {
    return {
      criticalityScore: this.assessVitalsCriticality(vitalSigns),
      abnormalities: this.detectVitalAbnormalities(vitalSigns),
      trendAnalysis: this.analyzeVitalsTrend(vitalSigns)
    };
  }

  async analyzeHistoricalData(historicalData) {
    return {
      patternRecognition: this.detectEmergencyPatterns(historicalData),
      riskTrends: this.analyzeRiskTrends(historicalData),
      seasonalFactors: this.assessSeasonalImpact(historicalData)
    };
  }

  calculateSeverityScore(analyses) {
    // Weighted combination of all analysis factors
    const weights = {
      textAnalysis: 0.25,
      imageAnalysis: 0.20,
      audioAnalysis: 0.15,
      locationRisk: 0.15,
      vitalsAnalysis: 0.15,
      historicalAnalysis: 0.10
    };

    let totalScore = 0;
    let totalWeight = 0;

    for (const [key, analysis] of Object.entries(analyses)) {
      if (analysis) {
        totalScore += this.normalizeScore(analysis) * weights[key];
        totalWeight += weights[key];
      }
    }

    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }

  getRecommendedResponse(severityScore) {
    // Define response protocols based on severity
    if (severityScore >= 0.8) {
      return {
        priority: 'CRITICAL',
        responseTime: 'IMMEDIATE',
        requiredResources: ['AMBULANCE', 'POLICE', 'FIRE'],
        specialInstructions: this.getCriticalInstructions()
      };
    } else if (severityScore >= 0.6) {
      return {
        priority: 'HIGH',
        responseTime: '< 5 minutes',
        requiredResources: ['AMBULANCE', 'POLICE'],
        specialInstructions: this.getHighPriorityInstructions()
      };
    } // ... more conditions

    return {
      priority: 'STANDARD',
      responseTime: '< 15 minutes',
      requiredResources: ['POLICE'],
      specialInstructions: this.getStandardInstructions()
    };
  }

  generateInsights(analyses) {
    return {
      keyFindings: this.extractKeyFindings(analyses),
      riskFactors: this.identifyRiskFactors(analyses),
      recommendations: this.generateRecommendations(analyses),
      potentialComplications: this.predictComplications(analyses)
    };
  }
}

module.exports = new EmergencyAI();
