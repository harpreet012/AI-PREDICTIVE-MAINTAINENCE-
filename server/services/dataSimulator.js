/**
 * Real-time Sensor Data Simulator
 * Generates realistic industrial IoT sensor data with:
 * - Normal operating patterns
 * - Gradual degradation curves
 * - Random fault injection
 * - Noise + seasonal variation
 */

const SensorReading = require('../models/SensorReading');
const Alert         = require('../models/Alert');
const Equipment     = require('../models/Equipment');
const mlEngine      = require('./mlEngine');

// Per-equipment state tracker for degradation simulation
const equipmentState = {};

/**
 * Gaussian noise generator (Box-Muller transform)
 */
function gaussianNoise(mean, std) {
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z0 * std;
}

/**
 * Clamp a value between min and max
 */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Initialize or reset state for an equipment item
 */
function initEquipmentState(equipmentId, equipmentType) {
  const baseValues = {
    Compressor: { temp: 62, vib: 2.8, pres: 98,  rpm: 2600, cur: 35 },
    Motor:      { temp: 55, vib: 2.0, pres: 80,  rpm: 2950, cur: 40 },
    Pump:       { temp: 48, vib: 3.2, pres: 105, rpm: 2200, cur: 28 },
    Turbine:    { temp: 72, vib: 1.8, pres: 125, rpm: 3100, cur: 48 },
    Generator:  { temp: 68, vib: 2.5, pres: 90,  rpm: 1500, cur: 55 },
    Conveyor:   { temp: 42, vib: 4.0, pres: 60,  rpm: 850,  cur: 22 },
    'CNC Machine': { temp: 58, vib: 3.5, pres: 75, rpm: 1800, cur: 32 },
    Boiler:     { temp: 78, vib: 1.5, pres: 135, rpm: 600,  cur: 45 },
  };

  const base = baseValues[equipmentType] || baseValues.Motor;

  equipmentState[equipmentId] = {
    temperature:        base.temp,
    vibration:          base.vib,
    pressure:           base.pres,
    rpm:                base.rpm,
    current:            base.cur,
    degradationLevel:   0,       // 0 = new, 100 = failed
    degradationRate:    Math.random() * 0.003 + 0.001,
    faultActive:        false,
    faultType:          null,
    faultIntensity:     0,
    operatingHours:     Math.floor(Math.random() * 5000),
    lastAlertTime:      0,
    equipmentType,
  };

  return equipmentState[equipmentId];
}

/**
 * Inject random fault for realistic failure scenarios
 */
function maybeInjectFault(state) {
  // 10% chance per tick to start a fault -> realistic behavior as requested
  if (!state.faultActive && Math.random() < 0.1) {
    const faults = ['bearing_wear', 'overheating', 'pressure_leak', 'electrical_fault', 'imbalance'];
    state.faultType      = faults[Math.floor(Math.random() * faults.length)];
    state.faultActive    = true;
    state.faultIntensity = 0;
  }

  // Escalate active fault
  if (state.faultActive) {
    state.faultIntensity = Math.min(100, state.faultIntensity + Math.random() * 2);
    // 1% chance fault self-resolves
    if (Math.random() < 0.01) {
      state.faultActive    = false;
      state.faultType      = null;
      state.faultIntensity = 0;
    }
  }
}

/**
 * Generate next sensor reading for an equipment item
 */
async function generateReading(equipmentId, equipmentType, userId) {
  if (!equipmentState[equipmentId]) {
    initEquipmentState(equipmentId, equipmentType);
  }

  const state = equipmentState[equipmentId];
  maybeInjectFault(state);

  // Gradual degradation
  state.degradationLevel = Math.min(100, state.degradationLevel + state.degradationRate);
  state.operatingHours  += 3 / 3600; // 3 seconds per tick

  const deg = state.degradationLevel / 100; // 0-1 factor

  // Time-of-day variation (simulates load cycles)
  const hour       = new Date().getHours();
  const loadFactor = 0.85 + 0.15 * Math.sin((hour / 24) * 2 * Math.PI);

  // Base sensor values with degradation drift
  let temperature = gaussianNoise(state.temperature + deg * 25 * loadFactor, 1.5);
  let vibration   = gaussianNoise(state.vibration   + deg * 7  * loadFactor, 0.3);
  let pressure    = gaussianNoise(state.pressure    + deg * 20 * loadFactor, 3.0);
  let rpm         = gaussianNoise(state.rpm         - deg * 300 * loadFactor, 20);
  let current     = gaussianNoise(state.current     + deg * 15 * loadFactor, 1.5);

  // Apply fault effects
  if (state.faultActive) {
    const fi = state.faultIntensity / 100;
    switch (state.faultType) {
      case 'overheating':
        temperature += fi * 30;
        current     += fi * 10;
        break;
      case 'bearing_wear':
        vibration += fi * 8;
        temperature += fi * 10;
        break;
      case 'pressure_leak':
        pressure -= fi * 40;
        break;
      case 'electrical_fault':
        current += fi * 20;
        rpm     -= fi * 500;
        break;
      case 'imbalance':
        vibration += fi * 6;
        rpm       -= fi * 200;
        break;
    }
  }

  // Clamp to realistic ranges
  temperature = clamp(temperature, 20,  200);
  vibration   = clamp(vibration,   0.1, 25);
  pressure    = clamp(pressure,    10,  200);
  rpm         = clamp(rpm,         100, 5000);
  current     = clamp(current,     5,   80);
  const humidity   = clamp(gaussianNoise(55, 5), 20, 95);
  const noiseLevel = clamp(gaussianNoise(65, 8), 40, 120);

  const reading = { temperature, vibration, pressure, rpm, current, humidity, noiseLevel };

  // Run ML analysis remotely (Flask Python API)
  const analysis = await mlEngine.analyzeReading(reading, equipmentType);

  if (analysis.isAnomaly) {
    console.log(`🧠 Anomaly detected (confidence: ${(analysis.anomalyScore * 100).toFixed(0)}%)`);
  }

  return {
    equipmentId,
    userId,
    timestamp: new Date(),
    ...reading,
    anomalyScore:       analysis.anomalyScore,
    isAnomaly:          analysis.isAnomaly,
    healthScore:        analysis.healthScore,
    failureProbability: analysis.failureProbability,
    predictedFailureIn: analysis.predictedFailureIn,
    sensorFlags:        analysis.sensorFlags,
    _analysis:          analysis, // internal use only
  };
}

/**
 * Check if an alert should be fired (rate-limit: 1 per equipment per 2 min)
 */
async function maybeFireAlert(equipmentId, reading, analysis, userId) {
  const now = Date.now();
  const state = equipmentState[equipmentId];

  if (now - state.lastAlertTime < 120000) return; // 2-min cooldown

  let severity = null;
  let type     = 'threshold';
  let message  = '';

  if (analysis.healthScore < 30) {
    severity = 'critical';
    message  = `CRITICAL: Health score dropped to ${analysis.healthScore}%. Immediate action required!`;
    type     = 'degradation';
  } else if (analysis.healthScore < 55) {
    severity = 'warning';
    message  = `WARNING: Health score at ${analysis.healthScore}%. Schedule maintenance soon.`;
    type     = 'degradation';
  } else if (analysis.isAnomaly && analysis.anomalyScore > 0.6) {
    severity = 'warning';
    message  = `ANOMALY DETECTED: Unusual sensor pattern (score: ${(analysis.anomalyScore * 100).toFixed(0)}%).`;
    type     = 'anomaly';
  } else if (reading.temperature > 85) {
    severity = 'warning';
    message  = `High temperature alert: ${reading.temperature.toFixed(1)}°C detected.`;
    type     = 'threshold';
  } else if (reading.vibration > 8) {
    severity = 'warning';
    message  = `Excessive vibration alert: ${reading.vibration.toFixed(2)} mm/s detected.`;
    type     = 'threshold';
  }

  if (severity) {
    state.lastAlertTime = now;
    const alert = new Alert({
      equipmentId,
      userId,
      severity,
      type,
      message,
      sensorValues: {
        temperature: reading.temperature,
        vibration:   reading.vibration,
        pressure:    reading.pressure,
        rpm:         reading.rpm,
        current:     reading.current,
      },
      anomalyScore: analysis.anomalyScore,
      healthScore:  analysis.healthScore,
    });
    await alert.save();
    return alert;
  }
  return null;
}

/**
 * Start the real-time simulation loop
 * Emits 'sensorData' and 'alert' events via socket.io
 */
async function startSimulation(io) {
  console.log('🚀 Starting sensor data simulation...');

  const simulationLoop = async () => {
    try {
      const equipment = await Equipment.find({ isActive: true });
      if (equipment.length === 0) return;

      const readings = [];
      const updates  = [];
      const newAlerts = [];

      for (const equip of equipment) {
        const reading = await generateReading(equip._id.toString(), equip.type, equip.userId);
        const { _analysis } = reading;
        delete reading._analysis;

        readings.push(reading);

        // Update equipment status + health in DB
        updates.push(
          Equipment.findByIdAndUpdate(equip._id, {
            healthScore:        _analysis.healthScore,
            failureProbability: _analysis.failureProbability,
            predictedFailureIn: _analysis.predictedFailureIn,
            status:             _analysis.status,
          })
        );

        // Check & fire alerts
        const alert = await maybeFireAlert(equip._id.toString(), reading, _analysis, equip.userId);
        if (alert) {
          newAlerts.push({ ...alert.toObject(), equipmentName: equip.name });
        }

        // Emit live reading to clients
        io.emit('sensorData', {
          equipmentId:   equip._id,
          equipmentName: equip.name,
          equipmentType: equip.type,
          location:      equip.location,
          ...reading,
          healthScore:        _analysis.healthScore,
          failureProbability: _analysis.failureProbability,
          predictedFailureIn: _analysis.predictedFailureIn,
          status:             _analysis.status,
          recommendations:    _analysis.recommendations,
        });
      }

      // Bulk insert sensor readings
      await SensorReading.insertMany(readings);
      await Promise.all(updates);

      // Emit alerts
      for (const alert of newAlerts) {
        io.emit('newAlert', alert);
      }

      // Emit fleet summary
      const healthScores = equipment.map(e => e.healthScore || 100);
      const avgHealth    = healthScores.reduce((a, b) => a + b, 0) / healthScores.length;
      const criticalCount = equipment.filter(e => e.status === 'critical').length;

      io.emit('fleetSummary', {
        totalEquipment: equipment.length,
        avgHealthScore: Math.round(avgHealth),
        criticalCount,
        timestamp: new Date(),
      });

    } catch (error) {
      console.error('Simulation error:', error.message);
    }
  };

  // Run immediately then every 10 seconds
  await simulationLoop();
  return setInterval(simulationLoop, 10000);
}

module.exports = { startSimulation, generateReading, initEquipmentState };
