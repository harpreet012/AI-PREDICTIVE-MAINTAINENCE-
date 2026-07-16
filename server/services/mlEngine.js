const axios = require("axios");

/**
 * ML Engine — AI Predictive Maintenance
 */

const SENSOR_WEIGHTS = {
  temperature: 0.30,
  vibration: 0.30,
  pressure: 0.20,
  rpm: 0.10,
  current: 0.10,
};

const THRESHOLDS = {
  default: {
    temperature: { warning: 75, critical: 90 },
    vibration: { warning: 6, critical: 10 },
    pressure: { warning: 120, critical: 145 },
    rpm: { warning: 3200, critical: 3600 },
    current: { warning: 45, critical: 58 },
  },
  Compressor: {
    temperature: { warning: 80, critical: 95 },
    vibration: { warning: 5, critical: 9 },
    pressure: { warning: 130, critical: 155 },
    rpm: { warning: 2800, critical: 3200 },
    current: { warning: 42, critical: 55 },
  },
  Motor: {
    temperature: { warning: 70, critical: 85 },
    vibration: { warning: 4, critical: 8 },
    pressure: { warning: 100, critical: 130 },
    rpm: { warning: 3100, critical: 3500 },
    current: { warning: 48, critical: 60 },
  },
  Pump: {
    temperature: { warning: 65, critical: 82 },
    vibration: { warning: 7, critical: 12 },
    pressure: { warning: 125, critical: 150 },
    rpm: { warning: 2500, critical: 3000 },
    current: { warning: 38, critical: 50 },
  },
};

function getThresholds(equipmentType) {
  return THRESHOLDS[equipmentType] || THRESHOLDS.default;
}

function zScore(value, mean, std) {
  if (std === 0) return 0;
  return Math.abs((value - mean) / std);
}

function normalizeSensorScore(value, normal, warning, critical) {
  if (value <= normal) return 1.0;
  if (value >= critical) return 0.0;

  if (value >= warning) {
    return 0.3 * (1 - (value - warning) / (critical - warning));
  }

  return (
    0.7 +
    0.3 * (1 - (value - normal) / (warning - normal))
  );
}

function calculateHealthScore(reading, equipmentType = "default") {
  const thresholds = getThresholds(equipmentType);

  const scores = {
    temperature: normalizeSensorScore(
      reading.temperature,
      thresholds.temperature.warning * 0.7,
      thresholds.temperature.warning,
      thresholds.temperature.critical
    ),

    vibration: normalizeSensorScore(
      reading.vibration,
      thresholds.vibration.warning * 0.5,
      thresholds.vibration.warning,
      thresholds.vibration.critical
    ),

    pressure: normalizeSensorScore(
      reading.pressure,
      thresholds.pressure.warning * 0.7,
      thresholds.pressure.warning,
      thresholds.pressure.critical
    ),

    rpm: normalizeSensorScore(
      reading.rpm,
      thresholds.rpm.warning * 0.8,
      thresholds.rpm.warning,
      thresholds.rpm.critical
    ),

    current: normalizeSensorScore(
      reading.current,
      thresholds.current.warning * 0.7,
      thresholds.current.warning,
      thresholds.current.critical
    ),
  };

  const weightedScore =
    scores.temperature * SENSOR_WEIGHTS.temperature +
    scores.vibration * SENSOR_WEIGHTS.vibration +
    scores.pressure * SENSOR_WEIGHTS.pressure +
    scores.rpm * SENSOR_WEIGHTS.rpm +
    scores.current * SENSOR_WEIGHTS.current;

  return Math.round(
    Math.max(0, Math.min(100, weightedScore * 100))
  );
}
function calculateAnomalyScore(
  reading,
  historicalStats,
  equipmentType = "default"
) {
  const thresholds = getThresholds(equipmentType);

  const flags = {
    temperatureFlag: reading.temperature > thresholds.temperature.warning,
    vibrationFlag: reading.vibration > thresholds.vibration.warning,
    pressureFlag: reading.pressure > thresholds.pressure.warning,
    rpmFlag: reading.rpm > thresholds.rpm.warning,
    currentFlag: reading.current > thresholds.current.warning,
  };

  let anomalyScore = 0;

  if (historicalStats && historicalStats.temperature) {

    const zTemperature = zScore(
      reading.temperature,
      historicalStats.temperature.mean,
      historicalStats.temperature.std
    );

    const zVibration = zScore(
      reading.vibration,
      historicalStats.vibration.mean,
      historicalStats.vibration.std
    );

    const zPressure = zScore(
      reading.pressure,
      historicalStats.pressure.mean,
      historicalStats.pressure.std
    );

    const zRpm = zScore(
      reading.rpm,
      historicalStats.rpm.mean,
      historicalStats.rpm.std
    );

    const zCurrent = zScore(
      reading.current,
      historicalStats.current.mean,
      historicalStats.current.std
    );

    const maxZ = Math.max(
      zTemperature,
      zVibration,
      zPressure,
      zRpm,
      zCurrent
    );

    anomalyScore = Math.min(1, maxZ / 5);

  } else {

    const flaggedCount = Object.values(flags).filter(Boolean).length;

    anomalyScore = flaggedCount / 5;

    if (
      reading.temperature > thresholds.temperature.critical ||
      reading.vibration > thresholds.vibration.critical ||
      reading.pressure > thresholds.pressure.critical
    ) {
      anomalyScore = Math.max(anomalyScore, 0.8);
    }
  }

  return {
    anomalyScore: Number(anomalyScore.toFixed(4)),
    isAnomaly: anomalyScore > 0.4,
    sensorFlags: flags,
  };
}

function predictFailure(healthScore, degradationRate = null) {

  if (healthScore >= 85) return null;

  const criticalThreshold = 20;

  const lambda = degradationRate || 0.002;

  if (healthScore <= criticalThreshold) return 0;

  const failureIn =
    -Math.log(criticalThreshold / healthScore) / lambda;

  return Math.round(
    Math.max(0, Math.min(8760, failureIn))
  );
}

function calculateFailureProbability(healthScore) {

  const x = (100 - healthScore) / 20;

  const probability =
    1 / (1 + Math.exp(-x + 2));

  return Math.round(
    Math.max(
      0,
      Math.min(100, probability * 100)
    )
  );
}

function generateRecommendation(
  healthScore,
  anomalyScore,
  sensorFlags,
  equipmentType
) {

  const recommendations = [];

  if (healthScore < 30) {

    recommendations.push(
      "🚨 IMMEDIATE SHUTDOWN REQUIRED — Critical health score detected."
    );

    recommendations.push(
      "Schedule emergency corrective maintenance immediately."
    );

  } else if (healthScore < 50) {

    recommendations.push(
      "⚠️ Urgent maintenance required within 24 hours."
    );

    recommendations.push(
      "Reduce operating load to 60% capacity."
    );

  } else if (healthScore < 70) {

    recommendations.push(
      "🔧 Schedule preventive maintenance within 1 week."
    );

    recommendations.push(
      "Increase monitoring frequency to every 30 minutes."
    );

  } else if (healthScore < 85) {

    recommendations.push(
      "📋 Monitor closely. Schedule inspection within 2 weeks."
    );
  }

  if (sensorFlags.temperatureFlag)
    recommendations.push(
      "🌡️ Check cooling system and lubrication levels."
    );

  if (sensorFlags.vibrationFlag)
    recommendations.push(
      "📳 Inspect bearings, alignment, and mounting bolts."
    );

  if (sensorFlags.pressureFlag)
    recommendations.push(
      "💨 Check for leaks or blockages in pressure lines."
    );

  if (sensorFlags.rpmFlag)
    recommendations.push(
      "⚙️ Inspect drive belt, coupling, and motor controller."
    );

  if (sensorFlags.currentFlag)
    recommendations.push(
      "⚡ Check electrical connections and motor windings."
    );

  if (recommendations.length === 0) {

    recommendations.push(
      "✅ Equipment operating within normal parameters."
    );
  }

  return recommendations;
}
/**
 * Full analysis pipeline
 */
async function analyzeReading(
  reading,
  equipmentType = "default",
  historicalStats = null
) {
  const healthScore = calculateHealthScore(
    reading,
    equipmentType
  );

  let mlResult = {
    anomaly: false,
    confidence: 0,
    feature_importance: {}
  };

  try {

    const mlUrl =
      process.env.ML_SERVICE_URL ||
      "https://pm-ml-service.onrender.com/predict";

    const payload = {
      ...reading,
      ...(reading.rawData || {})
    };

    console.log("Calling ML Service:", mlUrl);

    const response = await axios.post(
      mlUrl,
      payload,
      {
        timeout: 3000
      }
    );

    mlResult = response.data;

  } catch (err) {

    console.error("\n==============================");
    console.error("ML SERVICE ERROR");
    console.error("==============================");

    console.error("Message :", err.message);
    console.error("Status  :", err.response?.status || "No Response");
    console.error("URL     :", err.config?.url);
    console.error("Method  :", err.config?.method);

    if (err.response?.data) {
      console.error("Response :", err.response.data);
    }

    if (err.response?.status === 429) {

      console.warn("⚠ Rate Limit Hit (429)");
      console.warn("Using JavaScript Heuristic.");

    } else if (!err.response) {

      console.warn("⚠ ML Service not reachable.");

    } else {

      console.warn("⚠ ML Service returned an unexpected error.");
    }

    console.error("==============================\n");

    // JS fallback
    const backup = calculateAnomalyScore(
      reading,
      historicalStats,
      equipmentType
    );

    mlResult = {
      anomaly: backup.isAnomaly,
      confidence: backup.anomalyScore * 100,
      feature_importance: {}
    };
  }

  const anomalyScore =
    mlResult.confidence / 100;

  const isAnomaly =
    mlResult.anomaly;

  const featureImportance =
    mlResult.feature_importance || {};

  const failureProbability =
    calculateFailureProbability(
      healthScore
    );

  const predictedFailureIn =
    predictFailure(
      healthScore
    );

  const recommendations =
    generateRecommendation(
      healthScore,
      anomalyScore,
      {
        feature_importance: featureImportance
      },
      equipmentType
    );

  const status =
    healthScore < 30
      ? "critical"
      : healthScore < 60
      ? "warning"
      : healthScore < 85
      ? "warning"
      : "healthy";

  return {
    healthScore,
    anomalyScore,
    isAnomaly,
    sensorFlags: {
      feature_importance: featureImportance
    },
    failureProbability,
    predictedFailureIn,
    status,
    recommendations
  };
}

module.exports = {
  analyzeReading,
  calculateHealthScore,
  calculateAnomalyScore,
  predictFailure,
  calculateFailureProbability,
  generateRecommendation,
  getThresholds,
};
