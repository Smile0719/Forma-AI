const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const DynamicForm = require('./models/FormSchema');

const app = express();
app.use(express.json());
app.use(cors());

// Fetch dynamic form schema by ID
app.get('/api/schemas/:id', async (req, res) => {
  try {
    const schema = await DynamicForm.findById(req.params.id);
    if (!schema) return res.status(404).json({ message: 'Schema not found' });
    res.json(schema);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Seed endpoint for testing a branching dynamic schema
app.post('/api/schemas/seed', async (req, res) => {
  const seedSchema = {
    title: "Insurance Claim Intake",
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
        label: "Vehicle Make",
        type: "text",
        validation: { required: true },
        showIf: { field: "incidentType", equals: "collision" } // Dynamic branch
      },
      {
        name: "hasInjuries",
        label: "Were there any injuries?",
        type: "checkbox"
      }
    ]
  };
  
  const created = await DynamicForm.create(seedSchema);
  res.status(201).json(created);
});

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/forma_ai')
  .then(() => app.listen(5000, () => console.log('Server running on port 5000')));