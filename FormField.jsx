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
    min: field.type === "number" && field.validation?.minimum !== undefined
      ? { value: field.validation.minimum, message: `Use at least ${field.validation.minimum}` }
      : undefined,
    max: field.type === "number" && field.validation?.maximum !== undefined
      ? { value: field.validation.maximum, message: `Use no more than ${field.validation.maximum}` }
      : undefined,
  };

  if (field.type === "email") {
    rules.pattern = {
      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: "Enter a valid email address",
    };
  }
  if (field.type === "date") {
    rules.pattern = {
      value: /^\d{4}-\d{2}-\d{2}$/,
      message: "Enter a valid date",
    };
  }
  if (field.type === "select" || field.type === "radio") {
    rules.validate = (value) =>
      !value || field.options?.some((option) => option.value === value) ||
      "Choose one of the available options";
  }

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
    case "textarea":
      return (
        <textarea
          id={field.name}
          placeholder={field.placeholder || ""}
          {...register(field.name, withEdit(validationRules))}
        />
      );
    case "email":
    case "date":
      return (
        <input
          type={field.type}
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
          {...register(field.name, {
            ...withEdit(validationRules),
            setValueAs: (value) => value === "" ? undefined : Number(value),
          })}
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
    case "radio":
      return (
        <fieldset className="radio-options" aria-label={field.label}>
          {field.options?.map((option) => (
            <label key={option.value}>
              <input
                type="radio"
                value={option.value}
                {...register(field.name, withEdit(validationRules))}
              />
              {option.label}
            </label>
          ))}
        </fieldset>
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
