import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { MagicInput } from './MagicInput';
import './styles.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function App() {
  const [schemaId, setSchemaId] = useState(null);
  const [schema, setSchema] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm({ mode: 'onChange', shouldUnregister: true });

  // Watch form inputs in real time to evaluate conditional showIf expressions
  const formValues = watch();

  // Load or seed a default schema on initial load
  useEffect(() => {
    const fetchOrCreateSchema = async () => {
      try {
        // Automatically seed an initial schema if necessary
        const seedRes = await fetch(`${API_BASE_URL}/api/schemas/seed`, { method: 'POST' });
        const seededData = await seedRes.json().catch(() => ({}));
        if (!seedRes.ok || !seededData._id) {
          throw new Error(seededData.error || 'The form service returned an invalid schema.');
        }
        setSchemaId(seededData._id);
        setSchema(seededData);
      } catch (err) {
        console.error('Failed to initialize schema:', err);
        setLoadError('We could not connect to the form service. Check that the backend is running and try again.');
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
    setSubmitted(true);
  };

  if (loading) {
    return (
      <main className="app-shell app-shell--centered">
        <div className="loading-state" role="status">
          <span className="loading-spinner" aria-hidden="true" />
          <span>Loading your workspace...</span>
        </div>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="app-shell app-shell--centered">
        <section className="state-panel" role="alert">
          <span className="state-icon" aria-hidden="true">!</span>
          <p className="eyebrow">Connection issue</p>
          <h1>We could not load the form</h1>
          <p>{loadError}</p>
          <button type="button" className="secondary-button" onClick={() => window.location.reload()}>
            Try again
          </button>
        </section>
      </main>
    );
  }

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
          apiBaseUrl={API_BASE_URL}
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

          {schema.fields.map((field) => {
            if (field.showIf) {
              const dependentValue = formValues[field.showIf.field];
              if (dependentValue !== field.showIf.equals) {
                return null;
              }
            }

            const validationRules = {
              required: field.validation?.required ? 'This field is required' : false,
              minLength: field.validation?.minLength
                ? { value: field.validation.minLength, message: `Use at least ${field.validation.minLength} characters` }
                : undefined,
              maxLength: field.validation?.maxLength
                ? { value: field.validation.maxLength, message: `Use no more than ${field.validation.maxLength} characters` }
                : undefined
            };

            if (field.validation?.pattern) {
              validationRules.pattern = {
                value: new RegExp(field.validation.pattern),
                message: 'Use the requested format'
              };
            }

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

                {field.type === 'number' && (
                  <input
                    type="number"
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

          <button type="submit" className="submit-button">
            Submit data <span aria-hidden="true">-&gt;</span>
          </button>
          {submitted && (
            <p className="success-message" role="status">
              Your response has been captured successfully.
            </p>
          )}
        </form>
      )}
    </main>
  );
}