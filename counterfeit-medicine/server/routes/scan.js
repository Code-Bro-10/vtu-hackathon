const express = require('express');
const router = express.Router();
const ScanLog = require('../models/ScanLog');
const Medicine = require('../models/Medicine');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const CryptoJS = require('crypto-js');

const barcodeMap = {
  "8901234567890": "paracetamol",
  "8901234567891": "ibuprofen",
  "8901234567892": "aspirin",
  "8901234567893": "cetirizine",
  "8901234567894": "amoxicillin",
  "8901234567895": "metformin",
  "8901234567896": "omeprazole",
  "8901234567897": "dolo 650",
  "8901234567898": "crocin",
  "8901234567899": "azithromycin"
};

// POST /api/scan
router.post('/', auth, async (req, res) => {
  try {
    const { qrId } = req.body;
    const userId = req.user._id;

    let medicine = await Medicine.findOne({ qrId });
    
    // Check barcodeMap if not found in DB
    if (!medicine && barcodeMap[qrId]) {
      const mappedName = barcodeMap[qrId];
      medicine = {
        name: mappedName.charAt(0).toUpperCase() + mappedName.slice(1),
        batchNumber: "DEMO-BATCH-" + qrId.slice(-4),
        manufacturer: "Certified Demo Pharma",
        expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 2)),
        qrId: qrId
      };
    }

    const result = medicine ? 'Genuine' : 'Fake';

    // Blockchain simulation: Hash the scan details
    const timestamp = new Date().toISOString();
    const dataToHash = `${userId}-${qrId}-${result}-${timestamp}`;
    const hash = CryptoJS.SHA256(dataToHash).toString();

    const scanLog = new ScanLog({
      userId,
      qrId,
      result,
      timestamp,
      hash
    });

    await scanLog.save();

    res.json({
      result,
      medicine: medicine || null,
      log: scanLog
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/scan/logs (Admin view all logs)
router.get('/logs', [auth, admin], async (req, res) => {
  try {
    const logs = await ScanLog.find().populate('userId', 'name email').sort({ timestamp: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/scan/logs/user (User view own logs)
router.get('/logs/user', auth, async (req, res) => {
  try {
    const logs = await ScanLog.find({ userId: req.user._id }).sort({ timestamp: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/scan/stats
router.get('/stats', [auth, admin], async (req, res) => {
    try {
        const totalScans = await ScanLog.countDocuments();
        const fakeScans = await ScanLog.countDocuments({ result: 'Fake' });
        const genuineScans = await ScanLog.countDocuments({ result: 'Genuine' });
        res.json({ totalScans, fakeScans, genuineScans });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;
