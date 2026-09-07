import { describe, it, expect, vi } from "vitest";
import { buildValidationRules } from "../../FormField";

describe("buildValidationRules", () => {
  it("marks required fields", () => {
    const rules = buildValidationRules({
      name: "fullName",
      type: "text",
      validation: { required: true },
    });
    expect(rules.required).toBe("This field is required");
  });

  it("leaves optional fields unrequired", () => {
    const rules = buildValidationRules({ name: "notes", type: "text" });
    expect(rules.required).toBe(false);
    expect(rules.minLength).toBeUndefined();
    expect(rules.maxLength).toBeUndefined();
  });

  it("adds min/max length messages", () => {
    const rules = buildValidationRules({
      name: "summary",
      type: "text",
      validation: { minLength: 5, maxLength: 100 },
    });
    expect(rules.minLength).toEqual({
      value: 5,
      message: "Use at least 5 characters",
    });
    expect(rules.maxLength).toEqual({
      value: 100,
      message: "Use no more than 100 characters",
    });
  });

  it("compiles a valid pattern", () => {
    const rules = buildValidationRules({
      name: "email",
      type: "text",
      validation: { pattern: "^[^@]+@[^@]+$" },
    });
    expect(rules.pattern.value).toBeInstanceOf(RegExp);
    expect(rules.pattern.value.test("a@b")).toBe(true);
    expect(rules.pattern.value.test("nope")).toBe(false);
  });

  it("skips an invalid regex pattern instead of throwing", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => { });
    const rules = buildValidationRules({
      name: "bad",
      type: "text",
      validation: { pattern: "[unclosed" },
    });
    expect(rules.pattern).toBeUndefined();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
