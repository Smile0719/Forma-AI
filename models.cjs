const mongoose = require('mongoose');

const FieldSchema = new mongoose.Schema({
  name: { type: String, required: true },
  label: { type: String, required: true },
  type: {
    type: String,
    enum: ['text', 'number', 'select', 'checkbox'],
    required: true
  },
  placeholder: { type: String },
  options: [{ label: String, value: String }],
  validation: {
    required: { type: Boolean, default: false },
    pattern: { type: String },
    minLength: { type: Number },
    maxLength: { type: Number }
  },
  showIf: {
    field: { type: String },
    equals: { type: mongoose.Schema.Types.Mixed }
  }
});

const DynamicFormSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  version: { type: Number, default: 1 },
  fields: [FieldSchema],
  revisions: [{
    version: Number,
    savedAt: { type: Date, default: Date.now },
    label: String,
    snapshot: mongoose.Schema.Types.Mixed
  }]
}, { timestamps: true });

module.exports = mongoose.model('DynamicForm', DynamicFormSchema);
