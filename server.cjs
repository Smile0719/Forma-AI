const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const DynamicForm = require('./models.cjs');
const { extractFormData } = require('./llmService.cjs');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

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

app.post('/api/schemas/seed', async (req, res) => {
  try {
    const created = await DynamicForm.create({
      title: 'Insurance Claim Intake',
      description: 'Submit details about your recent incident.',
      fields: [
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
          name: 'vehicleMake',
          label: 'Vehicle Make',
          type: 'text',
          validation: { required: true },
          showIf: { field: 'incidentType', equals: 'collision' }
        },
        {
          name: 'hasInjuries',
          label: 'Were there any injuries?',
          type: 'checkbox'
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
