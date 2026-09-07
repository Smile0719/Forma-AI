import { describe, it, expect } from "vitest";

/**
 * Mirror of the showIf visibility filter used in App.jsx.
 * Kept in sync via FormField rendering; tested here as pure logic.
 */
function filterVisibleFields(fields, formValues) {
  return (
    fields.filter(
      (field) =>
        !field.showIf ||
        formValues[field.showIf.field] === field.showIf.equals,
    ) || []
  );
}

const fields = [
  { name: "name", type: "text" },
  { name: "spouse", type: "text", showIf: { field: "married", equals: true } },
  {
    name: "witness",
    type: "text",
    showIf: { field: "married", equals: false },
  },
];

describe("showIf visibility filter", () => {
  it("shows unconditional fields always", () => {
    expect(filterVisibleFields(fields, {})).toEqual([fields[0]]);
  });

  it("shows the matching conditional field", () => {
    const visible = filterVisibleFields(fields, { married: true });
    expect(visible.map((f) => f.name)).toEqual(["name", "spouse"]);
  });

  it("swaps the conditional field when the dependent value flips", () => {
    const visible = filterVisibleFields(fields, { married: false });
    expect(visible.map((f) => f.name)).toEqual(["name", "witness"]);
  });
});
