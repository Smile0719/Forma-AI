import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

export const DynamicFormRenderer = ({ schemaId }) => {
  const [schema, setSchema] = useState(null);
  const [loading, setLoading] = useState(true);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm({ mode: 'onChange' });

  const formValues = watch();

  useEffect(() => {
    const loadSchema = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/schemas/${schemaId}`);

        if (!response.ok) {
          throw new Error(`Schema load failed (${response.status}).`);
        }

        const data = await response.json();
        setSchema(data);
      } catch (err) {
        console.error('Error loading schema:', err);
      } finally {
        setLoading(false);
      }
    };

    if (schemaId) {
      loadSchema();
    }
  }, [schemaId]);

  if (loading) return <div>Loading Form Schema...</div>;
  if (!schema) return <div>Schema failed to load.</div>;

  const onSubmit = (data) => {
    console.log('Submitted Form Data:', data);
  };

  const formFields = schema?.fields ?? [];

  return (
    <form onSubmit={handleSubmit(onSubmit)} style={{ maxWidth: '500px', margin: '0 auto' }}>
      <h2>{schema.title}</h2>
      {schema.description && <p>{schema.description}</p>}

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
          <div key={field.name} style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px' }}>{field.label}</label>

            {field.type === 'text' && (
              <input
                type="text"
                placeholder={field.placeholder || ''}
                {...register(field.name, validationRules)}
              />
            )}

            {field.type === 'select' && (
              <select {...register(field.name, validationRules)}>
                <option value="">Select option...</option>
                {field.options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            )}

            {field.type === 'checkbox' && (
              <input type="checkbox" {...register(field.name, validationRules)} />
            )}

            {errors[field.name] && (
              <span style={{ color: 'red', fontSize: '12px', display: 'block' }}>
                {errors[field.name].message}
              </span>
            )}
          </div>
        );
      })}

      <button type="submit">Submit Form</button>
    </form>
  );
};