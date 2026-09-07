const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { PDFParse } = require('pdf-parse');
const Tesseract = require('tesseract.js');
require('dotenv').config();

const { DynamicForm, FormRevision, FormDraft } = require('./models.cjs');
const { extractFormData } = require('./llmService.cjs');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: mongoose.connection.readyState === 1 ? 'connected' : 'connecting' });
});

app.get('/api/schemas/:id', async (req, res) => {
  try {
    const schema = await DynamicForm.findById(req.params.id);

    if (!schema) {
      return res.status(404).json({ message: 'Schema not found' });
    }

    return res.json(schema);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/schemas/:id', async (req, res) => {
  try {
    const current = await DynamicForm.findById(req.params.id);
    if (!current) return res.status(404).json({ error: 'Schema not found.' });

    const nextVersion = (current.version || 1) + 1;
    const updated = await DynamicForm.findByIdAndUpdate(
      req.params.id,
      { title: req.body.title, description: req.body.description, fields: req.body.fields, version: nextVersion },
      { new: true, runValidators: true }
    );
    await FormRevision.create({ schemaId: updated._id, version: nextVersion, snapshot: updated.toObject() });
    return res.json(updated);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

app.get('/api/schemas/:id/revisions', async (req, res) => {
  const revisions = await FormRevision.find({ schemaId: req.params.id }).sort({ version: -1 }).limit(30);
  return res.json(revisions);
});

app.post('/api/schemas/:id/restore/:revisionId', async (req, res) => {
  try {
    const revision = await FormRevision.findOne({ _id: req.params.revisionId, schemaId: req.params.id });
    if (!revision) return res.status(404).json({ error: 'Revision not found.' });
    const current = await DynamicForm.findById(req.params.id);
    const nextVersion = (current.version || 1) + 1;
    const restored = await DynamicForm.findByIdAndUpdate(req.params.id, {
      title: revision.snapshot.title,
      description: revision.snapshot.description,
      fields: revision.snapshot.fields,
      version: nextVersion
    }, { new: true, runValidators: true });
    await FormRevision.create({ schemaId: restored._id, version: nextVersion, snapshot: restored.toObject(), source: 'system' });
    return res.json(restored);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

app.post('/api/drafts', async (req, res) => {
  const { schemaId, clientId, values } = req.body;
  if (!schemaId || !clientId || !values || typeof values !== 'object') {
    return res.status(400).json({ error: 'schemaId, clientId, and values are required.' });
  }
  const draft = await FormDraft.findOneAndUpdate(
    { schemaId, clientId },
    { values, savedAt: new Date() },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return res.json({ savedAt: draft.savedAt });
});

const extractDocumentText = async (file) => {
  const extension = path.extname(file.originalname).toLowerCase();
  if (extension === '.pdf' || file.mimetype === 'application/pdf') {
    const parser = new PDFParse({ data: file.buffer });
    const result = await parser.getText();
    await parser.destroy();
    return result.text;
  }

  const result = await Tesseract.recognize(file.buffer, 'eng');
  return result.data.text;
};

app.post('/api/schemas/seed', async (req, res) => {
  try {
    const created = await DynamicForm.create({
      title: 'Insurance Claim Intake',
      description: 'Enter your policy, contact, and incident details so the claim can be verified accurately.',
      fields: [
        {
          name: 'policyNumber',
          label: 'Insurance policy number',
          type: 'text',
          placeholder: 'e.g., POL-48291-AX',
          validation: { required: true, minLength: 5 }
        },
        {
          name: 'policyholderName',
          label: 'Policyholder full name',
          type: 'text',
          placeholder: 'Name shown on the insurance policy',
          validation: { required: true, minLength: 2 }
        },
        {
          name: 'contactEmail',
          label: 'Contact email',
          type: 'text',
          placeholder: 'you@example.com',
          validation: { required: true, pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$' }
        },
        {
          name: 'contactPhone',
          label: 'Contact phone number',
          type: 'text',
          placeholder: 'e.g., +1 555 123 4567',
          validation: { required: true, minLength: 7 }
        },
        {
          name: 'claimantAddress',
          label: 'Claimant mailing address',
          type: 'text',
          placeholder: 'Street, city, state, and ZIP code',
          validation: { required: true, minLength: 10 }
        },
        {
          name: 'incidentType',
          label: 'What type of incident occurred?',
          type: 'select',
          options: [
            { label: 'Vehicle Collision', value: 'collision' },
            { label: 'Property Damage', value: 'property' }
          ],
          validation: { required: true }
        },
        {
          name: 'incidentDate',
          label: 'Date of incident',
          type: 'text',
          placeholder: 'YYYY-MM-DD',
          validation: { required: true, pattern: '^\\d{4}-\\d{2}-\\d{2}$' }
        },
        {
          name: 'incidentTime',
          label: 'Approximate time of incident',
          type: 'text',
          placeholder: 'e.g., 4:30 PM',
          validation: { required: true }
        },
        {
          name: 'incidentLocation',
          label: 'Where did the incident happen?',
          type: 'text',
          placeholder: 'Street, city, and state',
          validation: { required: true, minLength: 5 }
        },
        {
          name: 'vehicleMake',
          label: 'Vehicle make and model',
          type: 'text',
          placeholder: 'e.g., Honda Accord',
          validation: { required: true },
          showIf: { field: 'incidentType', equals: 'collision' }
        },
        {
          name: 'vehicleRegistration',
          label: 'Vehicle registration or plate number',
          type: 'text',
          placeholder: 'e.g., ABC-1234',
          validation: { required: true },
          showIf: { field: 'incidentType', equals: 'collision' }
        },
        {
          name: 'otherPartyDetails',
          label: 'Other person or property involved',
          type: 'text',
          placeholder: 'Name, vehicle, property, or contact details',
          validation: { required: true, minLength: 5 }
        },
        {
          name: 'damageDescription',
          label: 'Describe the damage',
          type: 'text',
          placeholder: 'What was damaged and how?',
          validation: { required: true, minLength: 10 }
        },
        {
          name: 'estimatedDamage',
          label: 'Estimated damage amount',
          type: 'number',
          placeholder: 'e.g., 2500',
          validation: { required: true }
        },
        {
          name: 'hasInjuries',
          label: 'Were there any injuries?',
          type: 'checkbox'
        },
        {
          name: 'injuryDetails',
          label: 'Describe the injuries and treatment received',
          type: 'text',
          placeholder: 'Include who was injured and whether medical care was needed',
          validation: { required: true, minLength: 10 },
          showIf: { field: 'hasInjuries', equals: true }
        },
        {
          name: 'policeReportFiled',
          label: 'Was a police report filed?',
          type: 'checkbox'
        },
        {
          name: 'policeReportNumber',
          label: 'Police report number',
          type: 'text',
          placeholder: 'Enter the report number',
          validation: { required: true },
          showIf: { field: 'policeReportFiled', equals: true }
        },
        {
          name: 'witnessDetails',
          label: 'Witness names and contact details',
          type: 'text',
          placeholder: 'Optional witness information',
          validation: { maxLength: 500 }
        },
        {
          name: 'additionalNotes',
          label: 'Additional claim notes',
          type: 'text',
          placeholder: 'Anything else the insurance reviewer should know?',
          validation: { maxLength: 1000 }
        }
      ]
    });

    return res.status(201).json(created);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/ai/extract', async (req, res) => {
  const { schemaId, narrative } = req.body;

  if (!schemaId || typeof narrative !== 'string' || !narrative.trim()) {
    return res.status(400).json({ error: 'A schema ID and narrative are required.' });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({ error: 'AI extraction is not configured. Add OPENAI_API_KEY to your environment.' });
  }

  try {
    const schema = await DynamicForm.findById(schemaId);
    if (!schema) return res.status(404).json({ error: 'Schema not found.' });

    const extraction = await extractFormData(narrative.trim(), schema);
    res.json({
      success: true,
      extractedData: extraction.values,
      confidence: extraction.confidence
    });
  } catch (err) {
    console.error('AI extraction error:', err.message);
    res.status(500).json({ error: 'The narrative could not be processed right now.' });
  }
});

app.post('/api/ai/upload', upload.single('document'), async (req, res) => {
  const { schemaId } = req.body;
  if (!schemaId || !req.file) {
    return res.status(400).json({ error: 'A schema ID and document are required.' });
  }
  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({ error: 'AI extraction is not configured. Add OPENAI_API_KEY to your environment.' });
  }

  try {
    const schema = await DynamicForm.findById(schemaId);
    if (!schema) return res.status(404).json({ error: 'Schema not found.' });
    const documentText = await extractDocumentText(req.file);
    if (!documentText.trim()) return res.status(422).json({ error: 'No readable text was found in this document.' });
    const extraction = await extractFormData(documentText.slice(0, 12000), schema);
    return res.json({
      success: true,
      fileName: req.file.originalname,
      extractedData: extraction.values,
      confidence: extraction.confidence
    });
  } catch (err) {
    console.error('Document extraction error:', err.message);
    return res.status(500).json({ error: 'The document could not be read right now.' });
  }
});

mongoose
  .connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/forma_ai')
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exitCode = 1;
  });