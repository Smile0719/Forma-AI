const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const aiRoutes = require('./routes/aiRoutes');
const DynamicForm = require('./models/FormSchema');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors());

// Express Routes
app.use('/api/ai', aiRoutes);

// Get Form Schema by ID
app.get('/api/schemas/:id', async (req, res) => {
  try {
    const schema = await DynamicForm.findById(req.params.id);
    if (!schema) return res.status(404).json({ message: 'Schema not found' });
    res.json(schema);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Seed endpoint for testing dynamic schemas
app.post('/api/schemas/seed', async (req, res) => {
  try {
    const seedSchema = {
      title: "Insurance Claim Intake",
      description: "Submit details about your recent vehicle or property incident.",
      fields: [
        {
          name: "incidentType",
          label: "What type of incident occurred?",
          type: "select",
          options: [
            { label: "Vehicle Collision", value: "collision" },
            { label: "Property Damage", value: "property" }
          ],
          validation: { required: true }
        },
        {
          name: "vehicleMake",
          label: "Vehicle Make / Model",
          type: "text",
          placeholder: "e.g., Honda Accord",
          validation: { required: true },
          showIf: { field: "incidentType", equals: "collision" }
        },
        {
          name: "damageDescription",
          label: "Primary Damage Area",
          type: "text",
          placeholder: "e.g., Shattered windshield",
          validation: { required: true }
        },
        {
          name: "hasInjuries",
          label: "Were there any injuries reported?",
          type: "checkbox"
        }
      ]
    };

    const created = await DynamicForm.create(seedSchema);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Database Connection & Server Startup
mongoose
  .connect(process.env.MONGO_URI || 'mongodb://localhost:27017/forma_ai')
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
  })
  .catch((err) => console.error('MongoDB connection error:', err));