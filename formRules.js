const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

export function evaluateCondition(condition, values = {}, fields, seen = new Set()) {
  if (!condition) return true;
  if (Array.isArray(condition)) {
    return condition.every((item) => evaluateCondition(item, values, fields, seen));
  }
  if (!isObject(condition)) return false;

  if (Array.isArray(condition.conditions)) {
    const evaluate = (item) => evaluateCondition(item, values, fields, seen);
    return condition.operator === "any"
      ? condition.conditions.some(evaluate)
      : condition.conditions.every(evaluate);
  }

  if (typeof condition.field !== "string" || seen.has(condition.field)) return false;
  const controller = fields?.find((field) => field.name === condition.field);
  if (fields && !controller) return false;
  if (controller && !evaluateCondition(
    controller.showIf,
    values,
    fields,
    new Set([...seen, condition.field]),
  )) return false;
  return values[condition.field] === condition.equals;
}

export function isFieldVisible(field, values = {}, fields) {
  return evaluateCondition(field.showIf, values, fields, new Set([field.name]));
}

const isEmpty = (value) =>
  value === undefined || value === null || value === "" ||
  (Array.isArray(value) && value.length === 0);

export function validateSchemaDefinition(fields) {
  if (!Array.isArray(fields)) return ["Fields must be an array."];
  const errors = [];
  const names = new Set();
  const supportedTypes = new Set(["text", "textarea", "email", "date", "number", "select", "radio", "checkbox"]);

  for (const [index, field] of fields.entries()) {
    if (!isObject(field) || typeof field.name !== "string" || !/^[A-Za-z][A-Za-z0-9_]*$/.test(field.name)) {
      errors.push(`Field ${index + 1} must have a valid name.`);
      continue;
    }
    if (names.has(field.name)) errors.push(`Field name "${field.name}" is duplicated.`);
    names.add(field.name);
    if (!supportedTypes.has(field.type)) errors.push(`Field "${field.name}" has an unsupported type.`);
    if (["select", "radio"].includes(field.type)) {
      if (!Array.isArray(field.options) || !field.options.length) {
        errors.push(`Field "${field.name}" needs at least one option.`);
      } else {
        const optionValues = field.options.map((option) => option?.value);
        if (field.options.some((option) => !isObject(option) || typeof option.label !== "string" || !option.label.trim()) ||
          optionValues.some((value) => typeof value !== "string" || !value) ||
          new Set(optionValues).size !== optionValues.length) {
          errors.push(`Field "${field.name}" has invalid or duplicate option values.`);
        }
      }
    }
    const rules = field.validation || {};
    for (const key of ["minLength", "maxLength", "minimum", "maximum"]) {
      if (rules[key] !== undefined && (!Number.isFinite(rules[key]) || rules[key] < 0)) {
        errors.push(`Field "${field.name}" has an invalid ${key} rule.`);
      }
    }
    for (const key of ["minLength", "maxLength"]) {
      if (rules[key] !== undefined && !Number.isInteger(rules[key])) {
        errors.push(`Field "${field.name}" has a non-integer ${key} rule.`);
      }
    }
    if (rules.minLength !== undefined && rules.maxLength !== undefined && rules.minLength > rules.maxLength) {
      errors.push(`Field "${field.name}" has a minimum length above its maximum.`);
    }
    if (rules.minimum !== undefined && rules.maximum !== undefined && rules.minimum > rules.maximum) {
      errors.push(`Field "${field.name}" has a minimum above its maximum.`);
    }
    if (rules.pattern) {
      try {
        new RegExp(rules.pattern);
      } catch {
        errors.push(`Field "${field.name}" has an invalid regular expression.`);
      }
    }
  }

  const dependencies = new Map(fields.filter(isObject).map((field) => [field.name, []]));
  const inspectCondition = (condition, dependentName) => {
    if (!condition) return;
    if (Array.isArray(condition)) {
      condition.forEach((item) => inspectCondition(item, dependentName));
      return;
    }
    if (!isObject(condition)) {
      errors.push(`Field "${dependentName}" has an invalid visibility condition.`);
      return;
    }
    if (Array.isArray(condition.conditions)) {
      if (!["all", "any"].includes(condition.operator) || !condition.conditions.length) {
        errors.push(`Field "${dependentName}" has an invalid condition group.`);
      }
      condition.conditions.forEach((item) => inspectCondition(item, dependentName));
      return;
    }
    if (typeof condition.field !== "string" || !names.has(condition.field)) {
      errors.push(`Field "${dependentName}" depends on a field that does not exist.`);
      return;
    }
    if (!Object.prototype.hasOwnProperty.call(condition, "equals")) {
      errors.push(`Field "${dependentName}" is missing the comparison value for its visibility condition.`);
      return;
    }
    if (condition.field === dependentName) {
      errors.push(`Field "${dependentName}" cannot depend on itself.`);
      return;
    }
    dependencies.get(dependentName)?.push(condition.field);
  };

  for (const field of fields) {
    if (isObject(field) && typeof field.name === "string") inspectCondition(field.showIf, field.name);
  }

  const visiting = new Set();
  const visited = new Set();
  const hasCycle = (name) => {
    if (visiting.has(name)) return true;
    if (visited.has(name)) return false;
    visiting.add(name);
    for (const dependency of dependencies.get(name) || []) {
      if (hasCycle(dependency)) return true;
    }
    visiting.delete(name);
    visited.add(name);
    return false;
  };
  for (const name of dependencies.keys()) {
    if (hasCycle(name)) {
      errors.push("Visibility conditions cannot contain circular dependencies.");
      break;
    }
  }
  return [...new Set(errors)];
}

function validateFieldValue(field, value) {
  const rules = field.validation || {};
  if (field.type === "checkbox") {
    if (rules.required && value !== true) return "must be checked";
    return null;
  }

  if (isEmpty(value)) return rules.required ? "is required" : null;

  if (field.type === "number") {
    const number = Number(value);
    if (!Number.isFinite(number)) return "must be a number";
    if (rules.minimum !== undefined && number < rules.minimum) return `must be at least ${rules.minimum}`;
    if (rules.maximum !== undefined && number > rules.maximum) return `must be no more than ${rules.maximum}`;
    return null;
  }

  if (typeof value !== "string") return "must be text";
  if (rules.minLength !== undefined && value.length < rules.minLength) return `must be at least ${rules.minLength} characters`;
  if (rules.maxLength !== undefined && value.length > rules.maxLength) return `must be no more than ${rules.maxLength} characters`;
  if (rules.pattern) {
    let pattern;
    try {
      pattern = new RegExp(rules.pattern);
    } catch {
      return "has an invalid schema validation pattern";
    }
    if (!pattern.test(value)) return "has an invalid format";
  }
  if (field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "must be a valid email";
  if (field.type === "date") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "must be a date in YYYY-MM-DD format";
    const [year, month, day] = value.split("-").map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
      return "must be a valid calendar date";
    }
  }
  if (field.type === "select" || field.type === "radio") {
    if (!field.options?.some((option) => option.value === value)) return "must be one of the available options";
  }
  return null;
}

export function validateSubmission(fields, inputValues) {
  const allowedNames = new Set(fields.map((field) => field.name));
  const unknownFields = Object.keys(inputValues).filter((name) => !allowedNames.has(name));
  if (unknownFields.length) {
    return { errors: unknownFields.map((name) => `${name} is not a field in this form.`) };
  }

  const values = {};
  const errors = [];
  for (const field of fields) {
    if (!isFieldVisible(field, inputValues, fields)) continue;
    const value = inputValues[field.name];
    const error = validateFieldValue(field, value);
    if (error) errors.push(`${field.name} ${error}.`);
    if (value !== undefined) {
      values[field.name] = field.type === "number" && value !== "" ? Number(value) : value;
    }
  }
  return { values, errors };
}
