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
  fields: [FieldSchema]
}, { timestamps: true });

module.exports = mongoose.model('DynamicForm', DynamicFormSchema);

const FormRevisionSchema = new mongoose.Schema({
  schemaId: { type: mongoose.Schema.Types.ObjectId, ref: 'DynamicForm', required: true },
  version: { type: Number, required: true },
  snapshot: { type: mongoose.Schema.Types.Mixed, required: true },
  source: { type: String, enum: ['admin', 'system'], default: 'admin' }
}, { timestamps: true });

const FormDraftSchema = new mongoose.Schema({
  schemaId: { type: mongoose.Schema.Types.ObjectId, ref: 'DynamicForm', required: true },
  clientId: { type: String, required: true },
  values: { type: mongoose.Schema.Types.Mixed, required: true },
  savedAt: { type: Date, default: Date.now }
}, { timestamps: true });

FormDraftSchema.index({ schemaId: 1, clientId: 1 }, { unique: true });

module.exports.DynamicForm = mongoose.model('DynamicForm', DynamicFormSchema);
module.exports.FormRevision = mongoose.model('FormRevision', FormRevisionSchema);
module.exports.FormDraft = mongoose.model('FormDraft', FormDraftSchema);
