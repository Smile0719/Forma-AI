const mongoose = require('mongoose');

// Schema for individual dynamic fields
const FieldSchema = new mongoose.Schema({
  name: { type: String, required: true },
  label: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['text', 'number', 'select', 'checkbox'], 
    required: true 
  },
  placeholder: { type: String },
  options: [{ label: String, value: String }], // Used for select dropdowns
  validation: {
    required: { type: Boolean, default: false },
    pattern: { type: String }, // Regex string pattern
    minLength: { type: Number },
    maxLength: { type: Number }
  },
  // "Show If" conditional logic
  showIf: {
    field: { type: String }, // Target field name to evaluate
    equals: { type: mongoose.Schema.Types.Mixed } // Required target value
  }
});

// Root Dynamic Form Schema
const DynamicFormSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  version: { type: Number, default: 1 },
  fields: [FieldSchema]
}, { timestamps: true });

module.exports = mongoose.model('DynamicForm', DynamicFormSchema);