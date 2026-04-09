const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const XLSX     = require('xlsx');
const Equipment = require('../models/Equipment');
const SensorReading = require('../models/SensorReading');
const { protect } = require('../middleware/auth');
const axios = require('axios');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Map ProductType from sample data to Equipment type enum
const TYPE_MAP = {
  'extruder':          'CNC Machine',
  'pump':              'Pump',
  'coil oven':         'Boiler',
  'gauge machine':     'Compressor',
  'pressure control':  'Compressor',
  'pressure c':        'Compressor',
  'gauge ma':          'Compressor',
  'motor':             'Motor',
  'turbine':           'Turbine',
  'generator':         'Generator',
  'conveyor':          'Conveyor',
  'boiler':            'Boiler',
};

function mapType(raw) {
  if (!raw) return 'Compressor';
  const lower = raw.toLowerCase();
  for (const [key, val] of Object.entries(TYPE_MAP)) {
    if (lower.startsWith(key)) return val;
  }
  return 'Compressor';
}

// POST /api/import/preview  — parse and return rows without saving
router.post('/preview', protect, upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
    const wb   = XLSX.read(req.file.buffer, { type: 'buffer' });
    const ws   = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
    res.json({ success: true, rows: rows.slice(0, 20), total: rows.length });
  } catch (err) {
    res.status(400).json({ success: false, error: 'Invalid file: ' + err.message });
  }
});

// POST /api/import/equipment — parse + upsert equipment + readings
router.post('/equipment', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });

    const wb   = XLSX.read(req.file.buffer, { type: 'buffer' });
    const ws   = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

    if (!rows || rows.length === 0) return res.status(400).json({ success: false, error: 'Empty file' });

    const equipBulkOps = [];
    const equipmentDocs = [];
    const serialsMap = new Map();

    const genericDatasetId = `DS-${Math.random().toString(36).substr(2,6).toUpperCase()}`;
    const datasetName = req.file.originalname || 'Imported Dataset';

    // Compute basic stats for prediction of an anomaly on generic inputs
    const numCols = {};
    Object.keys(rows[0] || {}).forEach(k => {
       if (typeof rows[0][k] === 'number') numCols[k] = { sum: 0, sumSq: 0, count: 0 };
    });

    for (const row of rows) {
      for (const k in numCols) {
        if (typeof row[k] === 'number') {
           numCols[k].sum += row[k];
           numCols[k].sumSq += row[k] * row[k];
           numCols[k].count++;
        }
      }
    }
    const stats = {};
    for (const k in numCols) {
       if (numCols[k].count > 0) {
         stats[k] = { mean: numCols[k].sum / numCols[k].count };
         const variance = (numCols[k].sumSq / numCols[k].count) - (stats[k].mean * stats[k].mean);
         stats[k].std = variance > 0 ? Math.sqrt(variance) : 0;
       }
    }

    for (const row of rows) {
      // Normalize column names (case-insensitive)
      const r = {};
      for (const [k, v] of Object.entries(row)) r[k.toLowerCase().trim()] = v;

      let uid         = String(r['uid'] || r['id'] || '').trim();
      let productType = String(r['producttype'] || r['product type'] || r['type'] || '').trim();

      let serialNumber, equipType, equipName;
      
      const isGeneric = !uid && !productType;
      
      if (isGeneric) {
         serialNumber = genericDatasetId;
         equipType = 'Custom';
         equipName = `Dataset: ${datasetName}`;
      } else {
         serialNumber = `IMPORT-${uid || Math.random().toString(36).substr(2,6).toUpperCase()}`;
         equipType    = mapType(productType);
         equipName    = `${productType || 'Machine'} #${uid}`;
      }

      if (!serialsMap.has(serialNumber)) {
        equipBulkOps.push({
          updateOne: {
            filter: { serialNumber },
            update: {
              $setOnInsert: {
                name:         equipName,
                type:         equipType,
                location:     'Data Import',
                manufacturer: isGeneric ? 'Auto-Generated' : 'Imported',
                serialNumber,
              },
              $set: {
                userId:       req.user._id,
                productType:  productType || 'Dataset',
              }
            },
            upsert: true
          }
        });
        serialsMap.set(serialNumber, true);
      }

      // Compute quick anomaly prediction
      let maxZ = 0;
      for (const k in stats) {
        if (typeof row[k] === 'number' && stats[k].std > 0) {
           const z = Math.abs(row[k] - stats[k].mean) / stats[k].std;
           if (z > maxZ) maxZ = z;
        }
      }
      
      // Predict outcome heuristically: Z > 2.5 is anomaly
      const isAnomaly = maxZ > 2.5;
      const anomalyScore = Math.min(100, Math.round((maxZ / 3) * 100));
      const healthScore = Math.max(0, 100 - anomalyScore);

      equipmentDocs.push({
        serialNumber,
        originalData: row,
        temperature: parseFloat(r['temperature']) || 0,
        humidity:    parseFloat(r['humidity'])    || 0,
        vibration:   parseFloat(r['vibration'])   || 0,
        pressure:    parseFloat(r['pressure'])    || 0,
        rpm:         parseFloat(r['rpm'])         || 0,
        current:     parseFloat(r['current'])     || 0,
        mttf:        parseFloat(r['mttf'])        || null,
        isAnomaly,
        anomalyScore: anomalyScore / 100, // DB expects 0-1
        healthScore
      });
    }

    // Execute Bulk Write for Equipment
    let created = 0, updated = 0, readings = 0;
    
    if (equipBulkOps.length > 0) {
      const result = await Equipment.bulkWrite(equipBulkOps);
      created = result.upsertedCount || 0;
      updated = result.modifiedCount || 0;
    }

    // Map serialNumbers to Database _ids
    const serialsKeys = Array.from(serialsMap.keys());
    const allEquipments = await Equipment.find({ serialNumber: { $in: serialsKeys } }, { _id: 1, serialNumber: 1 });
    const idMap = new Map();
    allEquipments.forEach(e => idMap.set(e.serialNumber, e._id));

    // Prepare Sensor Readings
    const readingsToInsert = [];
    let nowTime = new Date().getTime();
    
    for (let i = 0; i < equipmentDocs.length; i++) {
      const doc = equipmentDocs[i];
      // Insert all rows as readings spaced by 1 second so charts look like timeseries
      readingsToInsert.push({
        userId:      req.user._id,
        equipmentId: idMap.get(doc.serialNumber),
        timestamp:   new Date(nowTime - ((equipmentDocs.length - i) * 1000)),
        temperature: doc.temperature,
        humidity:    doc.humidity,
        vibration:   doc.vibration,
        pressure:    doc.pressure,
        rpm:         doc.rpm,
        current:     doc.current,
        healthScore: doc.healthScore,
        anomalyScore: doc.anomalyScore,
        isAnomaly:    doc.isAnomaly,
        rawData:      doc.originalData // storing arbitrary generic columns here!
      });
    }

    // Insert Sensor Readings in chunks
    const CHUNK = 1000;
    for (let i = 0; i < readingsToInsert.length; i += CHUNK) {
      await SensorReading.insertMany(readingsToInsert.slice(i, i + CHUNK));
    }
    
    readings = readingsToInsert.length;
    
    // Trigger dynamic background training to maintain peak accuracy on this dataset
    const mlTrainUrl = (process.env.ML_SERVICE_URL ? process.env.ML_SERVICE_URL.replace('/predict', '') : 'http://localhost:5001') + '/train';
    axios.post(mlTrainUrl, { data: rows }).catch(err => {
      console.warn('Background ML training trigger failed:', err.message);
    });

    res.json({ success: true, message: `Data read & predictions processed`, created, updated, readings, total: rows.length });
  } catch (err) {
    console.error('Import error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
