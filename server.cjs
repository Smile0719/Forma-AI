const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const mockDB = require('./mockDB.cjs');

let DynamicForm = require('./models.cjs');
let Draft = require('./drafts.cjs');
let isMongoConnected = false;

const { extractFormData } = require('./llmService.cjs');

const app = express();
const PORT = process.env.PORT || 5000;
const upload = multer({
  dest: path.join(__dirname, 'tmp-uploads'),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    const allowed = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
    callback(null, allowed.includes(file.mimetype));
  }
});

app.use(express.json());
app.use(cors());

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    database: isMongoConnected ? 'connected' : 'using mock data',
    frontend: 'ready'
  });
});

app.get('/api/schemas/:id', async (req, res) => {
  try {
    let schema;
    if (isMongoConnected) {
      schema = await DynamicForm.findById(req.params.id);
    } else {
      schema = await mockDB.findFormById(req.params.id);
    }

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
    let current;
    if (isMongoConnected) {
      current = await DynamicForm.findById(req.params.id);
    } else {
      current = await mockDB.findFormById(req.params.id);
    }
    
    if (!current) return res.status(404).json({ error: 'Schema not found.' });

    const nextVersion = (current.version || 1) + 1;
    const snapshot = { title: req.body.title, description: req.body.description, fields: req.body.fields };
    if (!current.revisions) current.revisions = [];
    current.revisions.push({ version: nextVersion, label: req.body.revisionLabel || 'Admin update', snapshot });
    current.title = snapshot.title;
    current.description = snapshot.description;
    current.fields = snapshot.fields;
    current.version = nextVersion;
    
    let updated;
    if (isMongoConnected) {
      await current.save();
      updated = current;
    } else {
      updated = await mockDB.updateForm(req.params.id, current);
    }
    return res.json(updated);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

app.get('/api/schemas/:id/revisions', async (req, res) => {
  try {
    let schema;
    if (isMongoConnected) {
      schema = await DynamicForm.findById(req.params.id).select('version revisions');
    } else {
      schema = await mockDB.findFormById(req.params.id);
    }
    if (!schema) return res.status(404).json({ error: 'Schema not found.' });
    return res.json({ currentVersion: schema.version, revisions: schema.revisions || [] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/schemas/:id/draft', async (req, res) => {
  try {
    let draft;
    if (isMongoConnected) {
      draft = await Draft.findOne({ schemaId: req.params.id });
    } else {
      draft = await mockDB.findDraft(req.params.id);
    }
    return res.json(draft || { values: {}, savedAt: null });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/schemas/:id/draft', async (req, res) => {
  try {
    let draft;
    if (isMongoConnected) {
      draft = await Draft.findOneAndUpdate(
        { schemaId: req.params.id },
        { values: req.body.values || {}, savedAt: new Date() },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    } else {
      draft = await mockDB.upsertDraft(req.params.id, req.body.values || {});
    }
    return res.json(draft);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/documents/extract', upload.single('document'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Upload a PDF or image document.' });

  try {
    let text = '';
    if (req.file.mimetype === 'application/pdf') {
      const pdfParse = require('pdf-parse');
      const parsed = await pdfParse(fs.readFileSync(req.file.path));
      text = parsed.text;
    } else {
      const { createWorker } = require('tesseract.js');
      const worker = await createWorker('eng');
      const result = await worker.recognize(req.file.path);
      text = result.data.text;
      await worker.terminate();
    }
    return res.json({ success: true, fileName: req.file.originalname, text: text.trim() });
  } catch (err) {
    return res.status(422).json({ error: 'The document could not be parsed.' });
  } finally {
    fs.promises.unlink(req.file.path).catch(() => {});
  }
});

app.post('/api/schemas/seed', async (req, res) => {
  try {
    const seedData = {
      title: 'Insurance Claim Intake',
      description: 'Enter your policy, contact, and incident details so the claim can be verified accurately.',
      version: 1,
      revisions: [],
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
          placeholder: 'Enter the name on the policy',
          validation: { required: true, minLength: 2 }
        },
        {
          name: 'contactEmail',
          label: 'Contact email',
          type: 'text',
          placeholder: 'you@example.com',
          validation: {
            required: true,
            pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$'
          }
        },
        {
          name: 'contactPhone',
          label: 'Contact phone number',
          type: 'text',
          placeholder: 'e.g., +1 555 123 4567',
          validation: { required: true, minLength: 7 }
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
          placeholder: 'e.g., 2026-09-07',
          validation: { required: true, pattern: '^\\d{4}-\\d{2}-\\d{2}$' }
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
        }
      ]
    };

    let created;
    if (isMongoConnected) {
      created = await DynamicForm.create(seedData);
    } else {
      created = await mockDB.createForm(seedData);
    }

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

// Start server regardless of MongoDB connection for development
app.listen(PORT, () => {
  console.log(`✓ Server listening on port ${PORT}`);
  console.log(`✓ Frontend: http://localhost:5175/`);
  console.log(`✓ API: http://localhost:${PORT}/`);
});

// Try to connect to MongoDB in the background
mongoose
  .connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/forma_ai', {
    connectTimeoutMS: 3000,
    socketTimeoutMS: 3000
  })
  .then(() => {
    console.log('✓ Connected to MongoDB');
    isMongoConnected = true;
  })
  .catch((err) => {
    console.log('ℹ MongoDB unavailable - using in-memory mock database');
    console.log('  Database features will persist only during this session');
    isMongoConnected = false;
  });
