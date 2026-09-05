import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { MagicInput } from './MagicInput';
import './styles.css';

export default function App() {
  const [schemaId, setSchemaId] = useState(null);
  const [schema, setSchema] = useState(null);
  const [loading, setLoading] = useState(true);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm({ mode: 'onChange' });

  // Watch form inputs in real time to evaluate conditional showIf expressions
  const formValues = watch();

  // Load or seed a default schema on initial load
  useEffect(() => {
    const fetchOrCreateSchema = async () => {
      try {
        // Automatically seed an initial schema if necessary
        const seedRes = await fetch('http://localhost:5000/api/schemas/seed', { method: 'POST' });
        const seededData = await seedRes.json();
        setSchemaId(seededData._id);
        setSchema(seededData);
      } catch (err) {
        console.error('Failed to initialize schema:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrCreateSchema();
  }, []);

  // Hydrate extracted AI data into React Hook Form state
  const handleExtractionComplete = (extractedData) => {
    Object.keys(extractedData).forEach((key) => {
      setValue(key, extractedData[key], { shouldValidate: true, shouldDirty: true });
    });
  };

  const onSubmit = (data) => {
    console.log('Final Form Submission:', data);
    alert('Form submitted successfully! Check console output for payload.');
  };

  if (loading) return <div className="loading-state">Loading Dynamic Schema...</div>;

  return (
    <main className="app-shell">
      <header className="app-header">
        <p className="eyebrow">Adaptive intake workspace</p>
        <h1>Forma AI Engine</h1>
        <p className="app-intro">Turn a quick description into a complete, validated form.</p>
      </header>
      
      {/* Week 2: AI Unstructured Input Module */}
      {schemaId && (
        <MagicInput
          schemaId={schemaId}
          onExtractionComplete={handleExtractionComplete}
        />
      )}

      {/* Week 1: Dynamic Form Renderer Module */}
      {schema && (
        <form onSubmit={handleSubmit(onSubmit)} className="dynamic-form">
          <div className="form-heading">
            <span className="form-step">01 / Details</span>
            <h2>{schema.title}</h2>
            {schema.description && <p>{schema.description}</p>}
          </div>

          {schema.fields.map((field) => {
            // Dynamic rule check: evaluates showIf conditional visibility logic
            if (field.showIf) {
              const dependentValue = formValues[field.showIf.field];
              if (dependentValue !== field.showIf.equals) {
                return null;
              }
            }

            const validationRules = {
              required: field.validation?.required ? 'This field is required' : false
            };

            return (
              <div key={field.name} className={`form-field field-${field.type}`}>
                <label htmlFor={field.name}>
                  {field.label}
                </label>

                {field.type === 'text' && (
                  <input
                    type="text"
                    id={field.name}
                    placeholder={field.placeholder || ''}
                    {...register(field.name, validationRules)}
                  />
                )}

                {field.type === 'select' && (
                  <select
                    id={field.name}
                    {...register(field.name, validationRules)}
                  >
                    <option value="">-- Select Option --</option>
                    {field.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                )}

                {field.type === 'checkbox' && (
                  <input id={field.name} type="checkbox" {...register(field.name, validationRules)} />
                )}

                {errors[field.name] && (
                  <span className="field-error">
                    {errors[field.name].message}
                  </span>
                )}
              </div>
            );
          })}

          <button type="submit" className="submit-button">Submit Data <span aria-hidden="true">-&gt;</span></button>
        </form>
      )}
    </main>
  );
}