const express = require("express");
const multer = require("multer");
const XLSX = require("xlsx");
const axios = require("axios");
const Equipment = require("../models/Equipment");
const SensorReading = require("../models/SensorReading");
const Alert = require("../models/Alert");
const Dataset = require("../models/Dataset");
const { protect } = require("../middleware/auth");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const types = {
  extruder: "CNC Machine",
  pump: "Pump",
  motor: "Motor",
  turbine: "Turbine",
  generator: "Generator",
  conveyor: "Conveyor",
  boiler: "Boiler",
};

const number = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const normalize = (row) =>
  Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key.toLowerCase().replace(/[^a-z0-9]/g, ""),
      value,
    ]),
  );

function parse(file) {
  const workbook = XLSX.read(file.buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  if (!rows.length) throw new Error("The file contains no data rows");
  return rows;
}

function equipmentType(value) {
  return types[String(value || "").toLowerCase()] || "Compressor";
}

function payload(row) {
  const r = normalize(row);
  return {
    temperature: number(r.temperature || r.airtemperaturek),
    vibration: number(r.vibration || r.processtemperaturek),
    pressure: number(r.pressure),
    rpm: number(r.rpm || r.rotationalspeedrpm),
    current: number(r.current || r.torquenm),
    humidity: number(r.humidity),
    noiseLevel: number(r.noiselevel) || 60,
  };
}

// Keep this for future manual prediction feature
async function predict(sensorData) {
  const url = process.env.ML_SERVICE_URL || "http://localhost:5001/predict";
  try {
    return (await axios.post(url, sensorData, { timeout: 5000 })).data;
  } catch (error) {
    console.warn(`ML prediction unavailable: ${error.message}`);
    return null;
  }
}

router.use(protect);

router.post("/preview", upload.single("file"), (req, res, next) => {
  try {
    if (!req.file)
      return res
        .status(400)
        .json({ success: false, error: "A CSV or Excel file is required" });
    const rows = parse(req.file);
    return res.json({
      success: true,
      data: {
        rows: rows.slice(0, 20),
        total: rows.length,
        columns: Object.keys(rows[0]),
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/equipment", upload.single("file"), async (req, res, next) => {
  const startTime = Date.now();

  try {
    if (!req.file)
      return res
        .status(400)
        .json({ success: false, error: "A CSV or Excel file is required" });

    // Extract factory information from request body
    const { factoryName, location, description } = req.body;
    
    if (!factoryName || !location) {
      return res.status(400).json({ 
        success: false, 
        error: "Factory name and location are required" 
      });
    }

    const rows = parse(req.file);
    const importKey = `${req.user._id}-${req.file.originalname}`;

    // Create Dataset record
    const dataset = await Dataset.create({
      userId: req.user._id,
      factoryName,
      location,
      description: description || '',
      originalFileName: req.file.originalname,
      fileSize: req.file.size,
      status: 'processing',
      machineCount: 0,
      sensorCount: 0,
      alertCount: 0,
      maintenanceCount: 0,
    });

    // Create/Update Equipment with datasetId
    const equipmentBySerial = new Map();
    rows.forEach((row, index) => {
      const r = normalize(row);
      const uid =
        r.productid ||
        r.udi ||
        r.machineid ||
        r.uid ||
        r.id ||
        `machine-${index}`;

      const serial = `IMPORT-${importKey}-${String(uid)}`.slice(0, 180);

      if (!equipmentBySerial.has(serial)) {
        equipmentBySerial.set(serial, {
          serial,
          name: `${r.productid || r.type || "Imported machine"} #${uid}`,
          type: equipmentType(r.producttype || r.type),
        });
      }
    });

    const operations = [...equipmentBySerial.values()].map((item) => ({
      updateOne: {
        filter: { userId: req.user._id, serialNumber: item.serial },
        update: {
          $setOnInsert: {
            userId: req.user._id,
            datasetId: dataset._id,
            serialNumber: item.serial,
            name: item.name,
            type: item.type,
            location: location,
            manufacturer: "Imported",
            isActive: true,
          },
        },
        upsert: true,
      },
    }));

    const write = await Equipment.bulkWrite(operations, { ordered: false });

    const equipment = await Equipment.find({
      userId: req.user._id,
      serialNumber: { $in: [...equipmentBySerial.keys()] },
    })
      .select("_id serialNumber")
      .lean();

    const ids = new Map(equipment.map((item) => [item.serialNumber, item._id]));

    // Create Sensor Readings with datasetId
    const readings = rows.map((row, index) => {
      const r = normalize(row);
      const uid =
        r.productid ||
        r.udi ||
        r.machineid ||
        r.uid ||
        r.id ||
        `machine-${index}`;

      const serial = `IMPORT-${importKey}-${String(uid)}`.slice(0, 180);

      const sensorData = payload(row);

      return {
        userId: req.user._id,
        datasetId: dataset._id,
        equipmentId: ids.get(serial),
        timestamp: new Date(),
        ...sensorData,
        rawData: row,
        healthScore: 100,
        anomalyScore: 0,
        isAnomaly: false,
        failureProbability: 0,
        predictedFailureIn: null,
      };
    });

    // Batch Insert Readings
    const BATCH_SIZE = 1000;
    for (let i = 0; i < readings.length; i += BATCH_SIZE) {
      await SensorReading.insertMany(readings.slice(i, i + BATCH_SIZE), {
        ordered: false,
      });
    }

    // Safe Bulk Update for Equipment
    const bulkEquipmentUpdates = [
      ...new Set(
        readings
          .map((r) => r.equipmentId)
          .filter(Boolean)
          .map(String),
      ),
    ].map((id) => ({
      updateOne: {
        filter: {
          _id: id,
          userId: req.user._id,
        },
        update: {
          $set: {
            healthScore: 100,
            failureProbability: 0,
            predictedFailureIn: null,
            status: "healthy",
          },
        },
      },
    }));

    if (bulkEquipmentUpdates.length > 0) {
      await Equipment.bulkWrite(bulkEquipmentUpdates, { ordered: false });
    }

    // Update Dataset statistics
    const machineCount = write.upsertedCount || 0;
    const sensorCount = readings.length;
    
    // Calculate average health score
    const equipmentWithHealth = await Equipment.find({ 
      datasetId: dataset._id, 
      isActive: true 
    }).select('healthScore');
    
    const avgHealth = equipmentWithHealth.length > 0 
      ? Math.round(equipmentWithHealth.reduce((sum, eq) => sum + (eq.healthScore || 100), 0) / equipmentWithHealth.length)
      : 100;

    await Dataset.findByIdAndUpdate(dataset._id, {
      machineCount,
      sensorCount,
      healthScore: avgHealth,
      status: 'active',
      lastUpdated: new Date()
    });

    const duration = Date.now() - startTime;

    return res.status(201).json({
      success: true,
      data: {
        datasetId: dataset._id,
        dataset,
        equipmentCreated: write.upsertedCount || 0,
        equipmentUpdated: write.modifiedCount || 0,
        sensorReadingsImported: readings.length,
        totalRows: rows.length,
        alertsCreated: 0,
        duration: `${duration} ms`,
        mlPrediction: false,
        predictionStatus: "Skipped",
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/reading", async (req, res, next) => {
  try {
    const equipment = await Equipment.findOne({
      _id: req.body.equipmentId,
      userId: req.user._id,
    });
    if (!equipment)
      return res
        .status(404)
        .json({ success: false, error: "Equipment not found" });

    const sensorData = payload(req.body);
    const prediction = await predict(sensorData);
    const probability = Number(
      prediction?.failureProbability ?? prediction?.probability ?? 0,
    );

    const reading = await SensorReading.create({
      userId: req.user._id,
      datasetId: equipment.datasetId,
      equipmentId: equipment._id,
      ...sensorData,
      rawData: req.body,
      healthScore: Number(prediction?.healthScore ?? 100 - probability),
      anomalyScore: Number(prediction?.anomalyScore ?? probability / 100),
      isAnomaly: Boolean(prediction?.isAnomaly ?? prediction?.anomaly),
      failureProbability: probability,
      predictedFailureIn: prediction?.predictedFailureIn ?? null,
    });

    await Equipment.updateOne(
      { _id: equipment._id },
      {
        $set: {
          healthScore: reading.healthScore,
          failureProbability: reading.failureProbability,
          predictedFailureIn: reading.predictedFailureIn,
          status: reading.isAnomaly ? "warning" : "healthy",
        },
      },
    );

    return res
      .status(201)
      .json({ success: true, data: { reading, prediction } });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
