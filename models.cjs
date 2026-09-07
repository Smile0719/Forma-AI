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

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['admin', 'reviewer', 'user'], default: 'user' }
}, { timestamps: true });

const AuditLogSchema = new mongoose.Schema({
  schemaId: { type: mongoose.Schema.Types.ObjectId, ref: 'DynamicForm' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userEmail: { type: String },
  clientId: { type: String },
  action: { type: String, enum: ['fill', 'edit', 'submit', 'restore'], required: true },
  fieldName: { type: String },
  source: { type: String, enum: ['ai', 'human', 'system'], required: true },
  confidence: { type: Number, min: 0, max: 100 },
  meta: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

// Immutable log: block updates and deletes at the driver level
AuditLogSchema.pre('findOneAndUpdate', function () {
  throw new Error('Audit log entries are immutable.');
});

module.exports.DynamicForm = mongoose.model('DynamicForm', DynamicFormSchema);
module.exports.FormRevision = mongoose.model('FormRevision', FormRevisionSchema);
module.exports.FormDraft = mongoose.model('FormDraft', FormDraftSchema);
module.exports.User = mongoose.model('User', UserSchema);
module.exports.AuditLog = mongoose.model('AuditLog', AuditLogSchema);
