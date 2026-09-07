import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const seedSchema = {
  _id: "s1",
  title: "Claim Form",
  version: 1,
  description: "Test",
  fields: [
    {
      name: "fullName",
      label: "Full name",
      type: "text",
      validation: { required: true },
    },
    { name: "age", label: "Age", type: "number" },
    {
      name: "spouse",
      label: "Spouse name",
      type: "text",
      showIf: { field: "married", equals: true },
    },
    {
      name: "married",
      label: "Married",
      type: "checkbox",
    },
  ],
};

vi.mock("react-hook-form", () => {
  const values = {};
  const errors = {};
  return {
    useForm: () => ({
      register: (name) => ({ name }),
      handleSubmit: (fn) => (e) => {
        e?.preventDefault?.();
        fn(values);
      },
      setValue: vi.fn(),
      watch: () => values,
      reset: vi.fn(),
      formState: { errors },
    }),
  };
});

function mockFetchSchemas(ok = true) {
  global.fetch = vi.fn((url) => {
    if (String(url).includes("/api/schemas/latest")) {
      return Promise.resolve(
        ok
          ? { ok: true, status: 200, json: () => Promise.resolve(seedSchema) }
          : { ok: false, status: 500, json: () => Promise.resolve({}) },
      );
    }
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });
  });
}

vi.mock("../../MagicInput", () => ({ MagicInput: () => null }));
vi.mock("../../AdminDashboard", () => ({ default: () => null }));

import App from "../../App";

describe("App", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it("renders schema fields after loading", async () => {
    mockFetchSchemas(true);
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText("Claim Form")).toBeInTheDocument();
    });
    expect(screen.getByText("Full name")).toBeInTheDocument();
    expect(screen.getByText("Age")).toBeInTheDocument();
  });

  it("shows the error panel with a retry button when the schema fails to load", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetchSchemas(false);
    render(<App />);
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    expect(
      screen.getByText(/Could not load/i) || screen.getByText("Try again"),
    ).toBeDefined();
    expect(screen.getByText("Try again")).toBeInTheDocument();
    errorSpy.mockRestore();
  });

  it("submits and shows the success message", async () => {
    mockFetchSchemas(true);
    render(<App />);
    await userEvent.click(await screen.findByText(/Submit data/));
    expect(
      screen.getByText("Your response has been captured successfully."),
    ).toBeInTheDocument();
  });
});
