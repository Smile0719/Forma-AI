import React from "react";
import "./types.js";

/**
 * Build react-hook-form validation rules from a schema field definition.
 * Invalid regex patterns are skipped with a warning instead of crashing.
 * @param {import("./types").Field} field
 * @returns {object} rules for register()
 */
export function buildValidationRules(field) {
  const rules = {
    required: field.validation?.required ? "This field is required" : false,
    minLength: field.validation?.minLength
      ? {
          value: field.validation.minLength,
          message: `Use at least ${field.validation.minLength} characters`,
        }
      : undefined,
    maxLength: field.validation?.maxLength
      ? {
          value: field.validation.maxLength,
          message: `Use no more than ${field.validation.maxLength} characters`,
        }
      : undefined,
  };

  if (field.validation?.pattern) {
    try {
      rules.pattern = {
        value: new RegExp(field.validation.pattern),
        message: "Use the requested format",
      };
    } catch (err) {
      console.warn(
        `Invalid validation pattern for field "${field.name}" skipped:`,
        err.message,
      );
    }
  }

  return rules;
}

/**
 * Render the input control for a field, keyed by field.type.
 * @param {import("./types").Field} field
 * @param {Function} register
 * @param {object} validationRules
 */
function renderControl(field, register, validationRules, onManualEdit) {
  const withEdit = (rules) => ({
    ...rules,
    onChange: (event) => {
      onManualEdit?.();
      rules.onChange?.(event);
    },
  });

  switch (field.type) {
    case "text":
      return (
        <input
          type="text"
          id={field.name}
          placeholder={field.placeholder || ""}
          {...register(field.name, withEdit(validationRules))}
        />
      );
    case "number":
      return (
        <input
          type="number"
          id={field.name}
          placeholder={field.placeholder || ""}
          {...register(field.name, withEdit(validationRules))}
        />
      );
    case "select":
      return (
        <select
          id={field.name}
          {...register(field.name, withEdit(validationRules))}
        >
          <option value="">-- Select Option --</option>
          {field.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    case "checkbox":
      return (
        <input
          id={field.name}
          type="checkbox"
          {...register(field.name, withEdit(validationRules))}
        />
      );
    default:
      return null;
  }
}

/**
 * A single schema-driven form field with label, confidence indicator and error.
 * @param {{ field: import("./types").Field, register: Function, errors: object, confidence: (number|undefined) }} props
 */
export default function FormField({ field, register, errors, confidence, onManualEdit }) {
  const validationRules = buildValidationRules(field);
  const confidenceLevel =
    confidence === undefined
      ? ""
      : confidence < 40
        ? "low"
        : confidence < 70
          ? "medium"
          : "high";

  return (
    <div
      key={field.name}
      className={`form-field field-${field.type} ${confidenceLevel ? `confidence-${confidenceLevel}` : ""}`}
    >
      <div className="field-label-row">
        <label htmlFor={field.name}>{field.label}</label>
        {confidence !== undefined && (
          <span
            className="confidence-score"
            aria-label={`${confidence}% confidence`}
          >
            {confidence}% confidence
          </span>
        )}
      </div>

      {confidence !== undefined && confidence < 70 && (
        <p className="confidence-warning" role="status">
          Please verify this AI-filled value.
        </p>
      )}

      {renderControl(field, register, validationRules, onManualEdit)}

      {errors[field.name] && (
        <span className="field-error">{errors[field.name].message}</span>
      )}
    </div>
  );
}
