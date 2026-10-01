import { describe, expect, it } from "vitest";
import {
  evaluateCondition,
  isFieldVisible,
  validateSchemaDefinition,
  validateSubmission,
} from "../../formRules.js";

describe("conditional form rules", () => {
  const fields = [
    { name: "incidentType" },
    { name: "atFault", showIf: { field: "incidentType", equals: "collision" } },
    { name: "policeReport", showIf: { field: "atFault", equals: true } },
    { name: "policeReportFiled" },
  ];

  it("evaluates visibility through three levels of dependent fields", () => {
    expect(isFieldVisible(fields[2], { incidentType: "collision", atFault: true }, fields)).toBe(true);
    expect(isFieldVisible(fields[2], { atFault: true }, fields)).toBe(false);
  });

  it("supports nested all/any condition groups", () => {
    const condition = {
      operator: "all",
      conditions: [
        { field: "incidentType", equals: "collision" },
        {
          operator: "any",
          conditions: [
            { field: "atFault", equals: true },
            { field: "policeReportFiled", equals: true },
          ],
        },
      ],
    };
    expect(evaluateCondition(condition, { incidentType: "collision", atFault: false, policeReportFiled: true }, fields)).toBe(true);
    expect(evaluateCondition(condition, { incidentType: "property", atFault: true }, fields)).toBe(false);
  });
});

describe("schema validation", () => {
  it("allows chained and nested visibility rules", () => {
    expect(validateSchemaDefinition([
      { name: "kind", type: "select", options: [{ label: "Auto", value: "auto" }] },
      { name: "vehicle", type: "text", showIf: { field: "kind", equals: "auto" } },
      {
        name: "registration",
        type: "text",
        showIf: {
          operator: "all",
          conditions: [
            { field: "kind", equals: "auto" },
            { field: "vehicle", equals: "Honda" },
          ],
        },
      },
    ])).toEqual([]);
  });

  it("rejects missing condition targets and circular dependencies", () => {
    const errors = validateSchemaDefinition([
      { name: "a", type: "text", showIf: { field: "b", equals: "yes" } },
      { name: "b", type: "text", showIf: { field: "a", equals: "yes" } },
      { name: "c", type: "text", showIf: { field: "missing", equals: true } },
    ]);
    expect(errors).toContain("Visibility conditions cannot contain circular dependencies.");
    expect(errors).toContain('Field "c" depends on a field that does not exist.');
  });
});

describe("server submission validation", () => {
  const fields = [
    { name: "contactEmail", type: "email", validation: { required: true } },
    { name: "eventDate", type: "date", validation: { required: true } },
    { name: "amount", type: "number", validation: { minimum: 1, maximum: 10 } },
    { name: "incidentType", type: "select", options: [{ value: "collision" }, { value: "property" }] },
    { name: "details", type: "text", validation: { required: true }, showIf: { field: "incidentType", equals: "collision" } },
  ];

  it("returns clean typed values when the submission is valid", () => {
    expect(validateSubmission(fields, {
      contactEmail: "person@example.com",
      eventDate: "2026-09-29",
      amount: "5",
      incidentType: "property",
    })).toEqual({
      values: {
        contactEmail: "person@example.com",
        eventDate: "2026-09-29",
        amount: 5,
        incidentType: "property",
      },
      errors: [],
    });
  });

  it("rejects invalid values and missing required fields", () => {
    const result = validateSubmission(fields, {
      contactEmail: "bad-email",
      eventDate: "2026-02-30",
      amount: "50",
      incidentType: "unknown",
      details: "not applicable",
    });
    expect(result.errors).toHaveLength(4);
    expect(result.values).not.toHaveProperty("details");
  });

  it("rejects values for keys absent from the schema", () => {
    expect(validateSubmission(fields, { unexpected: true }).errors).toContain("unexpected is not a field in this form.");
  });
});
