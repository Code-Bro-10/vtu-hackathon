const mongoose = require('mongoose');

const scanLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  qrId: { type: String, required: true },
  result: { type: String, enum: ['Genuine', 'Fake'], required: true },
  timestamp: { type: Date, default: Date.now },
  hash: { type: String, required: true }
});

module.exports = mongoose.model('ScanLog', scanLogSchema);
