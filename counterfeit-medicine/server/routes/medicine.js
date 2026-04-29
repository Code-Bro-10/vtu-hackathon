const express = require('express');
const router = express.Router();
const Medicine = require('../models/Medicine');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const crypto = require('crypto');

// POST /api/medicine/add (Admin only)
router.post('/add', [auth, admin], async (req, res) => {
  try {
    const { name, batchNumber, manufacturer, expiryDate } = req.body;
    
    // Generate unique qrId
    const qrId = crypto.randomUUID();

    const medicine = new Medicine({
      name,
      batchNumber,
      manufacturer,
      expiryDate,
      qrId
    });

    await medicine.save();
    res.status(201).json({ message: 'Medicine added successfully', medicine });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/medicine
router.get('/', [auth, admin], async (req, res) => {
  try {
    const medicines = await Medicine.find().sort({ _id: -1 });
    res.json(medicines);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/medicine/:qrId
router.get('/:qrId', auth, async (req, res) => {
  try {
    const medicine = await Medicine.findOne({ qrId: req.params.qrId });
    if (!medicine) return res.status(404).json({ message: 'Medicine not found' });
    
    res.json(medicine);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
