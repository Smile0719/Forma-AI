const mongoose = require('mongoose');

const DraftSchema = new mongoose.Schema({
  schemaId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true, ref: 'DynamicForm' },
  values: { type: mongoose.Schema.Types.Mixed, default: {} },
  savedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Draft', DraftSchema);