/**
 * @typedef {Object} Option
 * @property {string} value - Value submitted for this option.
 * @property {string} label - Label shown to the user.
 */

/**
 * @typedef {Object} Validation
 * @property {boolean} [required]
 * @property {number} [minLength]
 * @property {number} [maxLength]
 * @property {string} [pattern] - Regular expression source string.
 */

/**
 * @typedef {Object} ShowIf
 * @property {string} field - Name of the dependent field.
 * @property {boolean|string|number} equals - Value that makes this field visible.
 */

/**
 * @typedef {Object} Field
 * @property {string} name - Unique field key.
 * @property {string} label
 * @property {"text"|"textarea"|"email"|"date"|"number"|"select"|"radio"|"checkbox"} type
 * @property {string} [placeholder]
 * @property {Option[]} [options] - Required for select fields.
 * @property {Validation} [validation]
 * @property {ShowIf|ConditionGroup} [showIf] - Conditional visibility rule.
 */

/**
 * @typedef {Object} ConditionGroup
 * @property {"all"|"any"} operator
 * @property {(ShowIf|ConditionGroup)[]} conditions
 */

/**
 * @typedef {Object} Schema
 * @property {string} _id - MongoDB id.
 * @property {string} title
 * @property {string} [description]
 * @property {number} [version]
 * @property {Field[]} fields
 */

/**
 * @typedef {Object} ConfidenceScore
 * @property {number} [fieldName] - 0-100 AI confidence for the named field.
 */

export { };
