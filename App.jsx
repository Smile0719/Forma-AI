import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { MagicInput } from './MagicInput';
import './styles.css';

const fallbackSchema = {
  _id: 'fallback-schema',
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
};

export default function App() {
  const [schemaId, setSchemaId] = useState('');
  const [schema, setSchema] = useState(null);
  const [loading, setLoading] = useState(true);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm({ mode: 'onChange' });

  const formValues = watch();

  useEffect(() => {
    const fetchOrCreateSchema = async () => {
      try {
        const seedRes = await fetch('http://localhost:5000/api/schemas/seed', { method: 'POST' });

        if (!seedRes.ok) {
          throw new Error(`Schema initialization failed (${seedRes.status}).`);
        }

        const seededData = await seedRes.json();
        setSchemaId(seededData?._id || seededData?.id || '');
        setSchema(seededData);
      } catch (err) {
        console.error('Failed to initialize schema:', err);
        setSchemaId(fallbackSchema._id);
        setSchema(fallbackSchema);
      } finally {
        setLoading(false);
      }
    };

    fetchOrCreateSchema();
  }, []);

  const handleExtractionComplete = (extractedData = {}) => {
    Object.entries(extractedData).forEach(([key, value]) => {
      setValue(key, value, { shouldValidate: true, shouldDirty: true });
    });
  };

  const onSubmit = (data) => {
    console.log('Final Form Submission:', data);
    alert('Form submitted successfully! Check console output for payload.');
  };

  if (loading) {
    return <div className="loading-state">Loading Dynamic Schema...</div>;
  }

  const formFields = schema?.fields ?? [];

  return (
    <main className="app-shell">
      <header className="app-header">
        <p className="eyebrow">Adaptive intake workspace</p>
        <h1>Forma AI Engine</h1>
        <p className="app-intro">Turn a quick description into a complete, validated form.</p>
      </header>

      {schemaId && (
        <MagicInput
          schemaId={schemaId}
          onExtractionComplete={handleExtractionComplete}
        />
      )}

      {schema && (
        <form onSubmit={handleSubmit(onSubmit)} className="dynamic-form">
          <div className="form-heading">
            <span className="form-step">01 / Details</span>
            <h2>{schema.title}</h2>
            {schema.description && <p>{schema.description}</p>}
          </div>

          {formFields.map((field) => {
            const showField = !field.showIf || formValues[field.showIf.field] === field.showIf.equals;

            if (!showField) {
              return null;
            }

            const validationRules = {
              required: field.validation?.required ? 'This field is required' : false,
              minLength: field.validation?.minLength ? {
                value: field.validation.minLength,
                message: `Minimum length is ${field.validation.minLength}`
              } : undefined,
              maxLength: field.validation?.maxLength ? {
                value: field.validation.maxLength,
                message: `Maximum length is ${field.validation.maxLength}`
              } : undefined,
              pattern: field.validation?.pattern ? {
                value: new RegExp(field.validation.pattern),
                message: 'Invalid input format'
              } : undefined
            };

            return (
              <div key={field.name} className={`form-field field-${field.type}`}>
                <label htmlFor={field.name}>{field.label}</label>

                {field.type === 'text' && (
                  <input
                    type="text"
                    id={field.name}
                    placeholder={field.placeholder || ''}
                    {...register(field.name, validationRules)}
                  />
                )}

                {field.type === 'select' && (
                  <select id={field.name} {...register(field.name, validationRules)}>
                    <option value="">-- Select Option --</option>
                    {field.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                )}

                {field.type === 'checkbox' && (
                  <input
                    id={field.name}
                    type="checkbox"
                    {...register(field.name, validationRules)}
                  />
                )}

                {errors[field.name] && (
                  <span className="field-error">{errors[field.name].message}</span>
                )}
              </div>
            );
          })}

          <button type="submit" className="submit-button">
            Submit Data <span aria-hidden="true">-&gt;</span>
          </button>
        </form>
      )}
    </main>
  );
}