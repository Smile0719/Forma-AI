const mongoose = require('mongoose');
const mockDb = require('./mockDB.cjs');

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

AuditLogSchema.pre('findOneAndUpdate', function () {
  throw new Error('Audit log entries are immutable.');
});

const mongoModels = {
  DynamicForm: mongoose.model('DynamicForm', DynamicFormSchema),
  FormRevision: mongoose.model('FormRevision', FormRevisionSchema),
  FormDraft: mongoose.model('FormDraft', FormDraftSchema),
  User: mongoose.model('User', UserSchema),
  AuditLog: mongoose.model('AuditLog', AuditLogSchema)
};

const createAdapter = (collectionName, model) => ({
  create: async (doc) => (mongoose.connection.readyState === 1 ? model.create(doc) : mockDb.create(collectionName, doc)),
  countDocuments: async (query = {}) => (mongoose.connection.readyState === 1 ? model.countDocuments(query) : mockDb.countDocuments(collectionName, query)),
  findOne: (query = {}) => (mongoose.connection.readyState === 1 ? model.findOne(query) : mockDb.findOne(collectionName, query)),
  find: (query = {}) => (mongoose.connection.readyState === 1 ? model.find(query) : mockDb.find(collectionName, query)),
  findById: async (id) => (mongoose.connection.readyState === 1 ? model.findById(id) : mockDb.findById(collectionName, id)),
  findByIdAndUpdate: async (id, update, options) => (mongoose.connection.readyState === 1 ? model.findByIdAndUpdate(id, update, options) : mockDb.findByIdAndUpdate(collectionName, id, update, options)),
  findOneAndUpdate: async (query, update, options) => (mongoose.connection.readyState === 1 ? model.findOneAndUpdate(query, update, options) : mockDb.findOneAndUpdate(collectionName, query, update, options)),
  insertMany: async (docs) => (mongoose.connection.readyState === 1 ? model.insertMany(docs) : mockDb.insertMany(collectionName, docs)),
});

const exportedModels = {
  DynamicForm: createAdapter('dynamicforms', mongoModels.DynamicForm),
  FormRevision: createAdapter('revisions', mongoModels.FormRevision),
  FormDraft: createAdapter('drafts', mongoModels.FormDraft),
  User: createAdapter('users', mongoModels.User),
  AuditLog: createAdapter('auditlogs', mongoModels.AuditLog)
};

module.exports = exportedModels;
module.exports.DynamicForm = exportedModels.DynamicForm;
module.exports.FormRevision = exportedModels.FormRevision;
module.exports.FormDraft = exportedModels.FormDraft;
module.exports.User = exportedModels.User;
module.exports.AuditLog = exportedModels.AuditLog;
