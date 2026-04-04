require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./db');
const Equipment = require('../models/Equipment');
const MaintenanceLog = require('../models/MaintenanceLog');
const Alert = require('../models/Alert');
const SensorReading = require('../models/SensorReading');
const User = require('../models/User');
const mlEngine = require('../services/mlEngine');

const EQUIPMENT_DATA = [
  { name: 'Compressor Alpha-01',   type: 'Compressor',  location: 'Plant A - Zone 1', manufacturer: 'Atlas Copco',   model: 'GA-110', serialNumber: 'SN-2024-001' },
  { name: 'Main Drive Motor M-02', type: 'Motor',        location: 'Plant A - Zone 2', manufacturer: 'Siemens',       model: '1LE1603', serialNumber: 'SN-2024-002' },
  { name: 'Coolant Pump P-03',     type: 'Pump',         location: 'Plant B - Zone 1', manufacturer: 'Grundfos',     model: 'NB-100',  serialNumber: 'SN-2024-003' },
  { name: 'Steam Turbine T-04',    type: 'Turbine',      location: 'Plant B - Zone 2', manufacturer: 'GE',           model: 'D-11',    serialNumber: 'SN-2024-004' },
  { name: 'Generator G-05',        type: 'Generator',    location: 'Plant C - Zone 1', manufacturer: 'Caterpillar', model: 'C18',     serialNumber: 'SN-2024-005' },
  { name: 'Conveyor Belt CB-06',   type: 'Conveyor',     location: 'Plant C - Zone 2', manufacturer: 'Flexlink',    model: 'XS-85',   serialNumber: 'SN-2024-006' },
  { name: 'CNC Mill CNC-07',       type: 'CNC Machine',  location: 'Plant A - Zone 3', manufacturer: 'Fanuc',       model: 'RoboDrill', serialNumber: 'SN-2024-007' },
  { name: 'Boiler Unit BU-08',     type: 'Boiler',       location: 'Plant B - Zone 3', manufacturer: 'Thermax',     model: 'RT-200', serialNumber: 'SN-2024-008' },
  { name: 'Air Compressor AC-09',  type: 'Compressor',  location: 'Plant D - Zone 1', manufacturer: 'Ingersoll',   model: 'R-Series', serialNumber: 'SN-2024-009' },
  { name: 'Feed Pump FP-10',       type: 'Pump',         location: 'Plant D - Zone 2', manufacturer: 'KSB',        model: 'Etanorm',  serialNumber: 'SN-2024-010' },
];

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function randomDate(daysAgo) {
  return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
}

async function seedDatabase() {
  try {
    await connectDB();
    console.log('\n🌱 Starting database seed...\n');

    // Clear existing data
    await Promise.all([
      Equipment.deleteMany({}),
      SensorReading.deleteMany({}),
      Alert.deleteMany({}),
      MaintenanceLog.deleteMany({}),
    ]);
    console.log('✅ Cleared existing data');

    // Seed admin user if not exists
    const adminExists = await User.findOne({ email: 'admin@factory.com' });
    if (!adminExists) {
      await User.create({ name: 'Admin', email: 'admin@factory.com', password: 'Admin@1234', role: 'admin' });
      console.log('✅ Created admin user: admin@factory.com / Admin@1234');
    }
    const opExists = await User.findOne({ email: 'operator@factory.com' });
    if (!opExists) {
      await User.create({ name: 'Operator', email: 'operator@factory.com', password: 'Op@1234', role: 'operator' });
      console.log('✅ Created operator user: operator@factory.com / Op@1234');
    }

    // Create equipment
    const equipment = await Equipment.insertMany(
      EQUIPMENT_DATA.map((e, i) => ({
        ...e,
        installDate:      randomDate(365 + i * 30),
        lastMaintenance:  randomDate(Math.floor(randomBetween(7, 120))),
        operatingHours:   Math.floor(randomBetween(1000, 15000)),
        healthScore:      Math.floor(randomBetween(45, 98)),
        status:           i < 2 ? 'warning' : i === 2 ? 'critical' : 'healthy',
      }))
    );
    console.log(`✅ Created ${equipment.length} equipment records`);

    // Seed historical sensor readings (30 days)
    const readings = [];
    const now = Date.now();
    const INTERVAL_MS = 5 * 60 * 1000; // 5-minute intervals
    const DAYS = 7; // keep seed manageable

    for (const equip of equipment) {
      const baseTemp = randomBetween(45, 75);
      const baseVib  = randomBetween(1.5, 4.5);
      const basePres = randomBetween(70, 130);
      const baseRpm  = randomBetween(800, 3200);
      const baseCur  = randomBetween(20, 52);

      const totalPoints = (DAYS * 24 * 60 * 60 * 1000) / INTERVAL_MS;

      for (let i = 0; i < totalPoints; i++) {
        const timestamp = new Date(now - (totalPoints - i) * INTERVAL_MS);
        const degradation = (i / totalPoints) * 0.15;
        const noise = () => randomBetween(-0.05, 0.05);

        const sensorData = {
          temperature: baseTemp * (1 + degradation) + baseTemp * noise(),
          vibration:   baseVib  * (1 + degradation) + baseVib * noise(),
          pressure:    basePres * (1 + degradation * 0.5) + basePres * noise(),
          rpm:         baseRpm  * (1 - degradation * 0.1) + baseRpm * noise(),
          current:     baseCur  * (1 + degradation * 0.8) + baseCur * noise(),
        };

        const analysis = await mlEngine.analyzeReading(sensorData, equip.type);

        readings.push({
          equipmentId:        equip._id,
          timestamp,
          ...sensorData,
          humidity:           randomBetween(40, 75),
          noiseLevel:         randomBetween(55, 85),
          anomalyScore:       analysis.anomalyScore,
          isAnomaly:          analysis.isAnomaly,
          healthScore:        analysis.healthScore,
          failureProbability: analysis.failureProbability,
          predictedFailureIn: analysis.predictedFailureIn,
          sensorFlags:        analysis.sensorFlags,
        });
      }
    }

    // Batch insert in chunks
    const CHUNK = 500;
    for (let i = 0; i < readings.length; i += CHUNK) {
      await SensorReading.insertMany(readings.slice(i, i + CHUNK));
    }
    console.log(`✅ Created ${readings.length} sensor readings`);

    // Seed alerts
    const alertMessages = [
      { severity: 'critical', type: 'degradation',  message: 'Critical: Health score below 30%. Immediate maintenance required.' },
      { severity: 'warning',  type: 'threshold',     message: 'High vibration detected: 9.2 mm/s exceeds threshold.' },
      { severity: 'warning',  type: 'anomaly',       message: 'Anomaly Detected: Unusual temperature spike pattern.' },
      { severity: 'info',     type: 'scheduled',     message: 'Scheduled maintenance due in 3 days.' },
      { severity: 'critical', type: 'prediction',    message: 'ML Prediction: Bearing failure expected within 48 hours.' },
    ];

    const alerts = alertMessages.map((a, i) => ({
      ...a,
      equipmentId: equipment[i % equipment.length]._id,
      acknowledged: i > 2,
      createdAt: randomDate(Math.floor(randomBetween(0, 5))),
    }));
    await Alert.insertMany(alerts);
    console.log(`✅ Created ${alerts.length} alerts`);

    // Seed maintenance logs
    const logs = equipment.slice(0, 6).map((e, i) => ({
      equipmentId:    e._id,
      type:           ['preventive', 'corrective', 'predictive', 'inspection', 'emergency'][i % 5],
      status:         i < 3 ? 'completed' : 'scheduled',
      priority:       ['low', 'medium', 'high', 'critical'][i % 4],
      technician:     ['John Smith', 'Maria Garcia', 'Ahmed Khan', 'Liu Wei', 'Sara Johnson', 'Raj Patel'][i],
      scheduledDate:  i < 3 ? randomDate(Math.floor(randomBetween(10, 30))) : randomDate(-Math.floor(randomBetween(1, 14))),
      completedDate:  i < 3 ? randomDate(Math.floor(randomBetween(5, 15))) : null,
      duration:       i < 3 ? Math.floor(randomBetween(60, 480)) : null,
      cost:           i < 3 ? Math.floor(randomBetween(500, 8000)) : 0,
      partsReplaced:  i < 3 ? ['Bearing Kit', 'Oil Filter'] : [],
      description:    `Routine ${['preventive', 'corrective', 'predictive', 'inspection', 'emergency'][i % 5]} maintenance for ${e.name}`,
      healthScoreBefore: i < 3 ? Math.floor(randomBetween(40, 65)) : null,
      healthScoreAfter:  i < 3 ? Math.floor(randomBetween(85, 98)) : null,
    }));
    await MaintenanceLog.insertMany(logs);
    console.log(`✅ Created ${logs.length} maintenance logs`);

    // Update equipment health scores from latest readings
    for (const e of equipment) {
      const latest = await SensorReading.findOne({ equipmentId: e._id }).sort({ timestamp: -1 });
      if (latest) {
        await Equipment.findByIdAndUpdate(e._id, {
          healthScore:        latest.healthScore,
          failureProbability: latest.failureProbability,
          predictedFailureIn: latest.predictedFailureIn,
        });
      }
    }

    console.log('\n✨ Database seeded successfully!\n');
    console.log(`   Equipment:    ${equipment.length}`);
    console.log(`   Readings:     ${readings.length}`);
    console.log(`   Alerts:       ${alerts.length}`);
    console.log(`   Maintenance:  ${logs.length}\n`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err);
    process.exit(1);
  }
}

seedDatabase();
