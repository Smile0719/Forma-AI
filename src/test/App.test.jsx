import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";

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

import App, { getPostLoginPath } from "../../App";

describe("App", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    window.history.replaceState({}, "", "/");
  });

  it("renders schema fields after loading", async () => {
    mockFetchSchemas(true);
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText("Claim Form")).toBeInTheDocument();
    });
    expect(screen.getByText("Full name")).toBeInTheDocument();
    expect(screen.getByText("Age")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open admin builder" })).toHaveAttribute(
      "href",
      "/admin/dashboard",
    );
  });

  it("only seeds a schema once when React StrictMode repeats the loading effect", async () => {
    global.fetch = vi.fn((url) => {
      if (String(url).includes("/api/schemas/latest")) {
        return Promise.resolve({
          ok: false,
          status: 404,
          json: () => Promise.resolve({}),
        });
      }
      if (String(url).includes("/api/schemas/seed")) {
        return Promise.resolve({
          ok: true,
          status: 201,
          json: () => Promise.resolve(seedSchema),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      });
    });

    render(
      <StrictMode>
        <App />
      </StrictMode>,
    );

    expect(await screen.findByText("Claim Form")).toBeInTheDocument();
    expect(global.fetch.mock.calls.filter(([url]) =>
      String(url).includes("/api/schemas/seed"),
    )).toHaveLength(1);
  });

  it("shows language, mode, and sign-in navigation in the header", async () => {
    mockFetchSchemas(true);
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByLabelText("Language")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Night mode" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login.html");
    await user.click(screen.getByRole("button", { name: "Night mode" }));
    expect(screen.getByRole("button", { name: "Day mode" })).toBeInTheDocument();
  });

  it("renders the dedicated login page and submits to the authentication API", async () => {
    mockFetchSchemas(true);
    window.history.replaceState({}, "", "/login.html");
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByRole("heading", { name: "Sign in to your workspace" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "#login-card");
    await user.selectOptions(screen.getByLabelText("Language"), "es");
    expect(await screen.findByRole("heading", { name: "Inicia sesión en tu espacio de trabajo" })).toBeInTheDocument();
    await user.type(screen.getByLabelText("Correo electrónico"), "user@example.com");
    await user.type(screen.getByLabelText("Contraseña (8+ caracteres)"), "password123");
    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/auth/login",
        expect.objectContaining({ method: "POST" }),
      );
    });
    expect(await screen.findByText("Authentication failed.")).toBeInTheDocument();
    expect(global.fetch.mock.calls.some(([url]) => String(url).includes("/api/schemas"))).toBe(false);
  });

  it("lets the login form choose an admin or claimer account type", async () => {
    mockFetchSchemas(true);
    window.history.replaceState({}, "", "/login.html");
    const user = userEvent.setup();
    render(<App />);

    const role = await screen.findByLabelText("Sign in as");
    expect(role).toHaveValue("claimer");
    await user.selectOptions(role, "admin");
    await user.type(screen.getByLabelText("Email"), "admin@example.com");
    await user.type(screen.getByLabelText("Password (8+ characters)"), "adminpassword");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      const authCall = global.fetch.mock.calls.find(([url]) =>
        String(url).includes("/api/auth/login"),
      );
      expect(JSON.parse(authCall[1].body)).toMatchObject({ role: "admin" });
    });
    expect(screen.queryByRole("button", { name: "Need an account?" })).not.toBeInTheDocument();
  });

  it("routes admin logins to the dashboard and claimers to the form", () => {
    expect(getPostLoginPath("admin")).toBe("/admin/dashboard");
    expect(getPostLoginPath("user")).toBe("/");
    expect(getPostLoginPath(undefined)).toBe("/");
  });

  it("always submits new account registrations as claimers", async () => {
    mockFetchSchemas(true);
    window.history.replaceState({}, "", "/login.html");
    const user = userEvent.setup();
    render(<App />);

    await screen.findByLabelText("Sign in as");
    await user.click(screen.getByRole("button", { name: "Need an account?" }));
    await user.type(screen.getByLabelText("Email"), "new-claimer@example.com");
    await user.type(screen.getByLabelText("Password (8+ characters)"), "claimer-pass-123");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => {
      const registerCall = global.fetch.mock.calls.find(([url]) =>
        String(url).includes("/api/auth/register"),
      );
      expect(registerCall).toBeDefined();
      expect(JSON.parse(registerCall[1].body)).toMatchObject({ role: "claimer" });
    });
  });

  it("submits browser-autofilled username and password values", async () => {
    mockFetchSchemas(true);
    window.history.replaceState({}, "", "/login.html");
    render(<App />);

    const email = await screen.findByLabelText("Email");
    const password = screen.getByLabelText("Password (8+ characters)");
    expect(email).toHaveAttribute("name", "email");
    expect(email).toHaveAttribute("autocomplete", "username");
    expect(password).toHaveAttribute("name", "password");
    expect(password).toHaveAttribute("autocomplete", "current-password");

    email.value = "autofilled@example.com";
    password.value = "autofilled-secret";
    fireEvent.submit(email.closest("form"));

    await waitFor(() => {
      const authCall = global.fetch.mock.calls.find(([url]) =>
        String(url).includes("/api/auth/login"),
      );
      expect(authCall).toBeDefined();
      expect(JSON.parse(authCall[1].body)).toEqual({
        email: "autofilled@example.com",
        password: "autofilled-secret",
        role: "claimer",
      });
    });
  });

  it("clears a stored token rejected by the auth service", async () => {
    const payload = btoa(JSON.stringify({
      exp: Math.floor(Date.now() / 1000) + 300,
      email: "stale@example.com",
      role: "admin",
    }));
    window.localStorage.setItem("forma-ai-token", `header.${payload}.signature`);
    global.fetch = vi.fn((url) => {
      if (String(url).includes("/api/auth/me")) {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ error: "Authentication required." }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(seedSchema),
      });
    });

    render(<App />);

    await waitFor(() => {
      expect(window.localStorage.getItem("forma-ai-token")).toBeNull();
    });
    expect(await screen.findByRole("link", { name: "Sign in" })).toBeInTheDocument();
  });

  it("includes the admin token when seeding a schema from the dashboard route", async () => {
    const payload = btoa(JSON.stringify({
      exp: Math.floor(Date.now() / 1000) + 300,
      email: "admin@example.com",
      role: "admin",
    }));
    const token = `header.${payload}.signature`;
    window.localStorage.setItem("forma-ai-token", token);
    window.history.replaceState({}, "", "/admin/dashboard");
    global.fetch = vi.fn((url, options = {}) => {
      const address = String(url);
      if (address.includes("/api/schemas/latest")) {
        return Promise.resolve({
          ok: false,
          status: 404,
          json: () => Promise.resolve({}),
        });
      }
      if (address.includes("/api/schemas/seed")) {
        return Promise.resolve({
          ok: true,
          status: 201,
          json: () => Promise.resolve(seedSchema),
        });
      }
      if (address.includes("/api/auth/me")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ email: "admin@example.com", role: "admin" }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      });
    });

    render(<App />);

    await waitFor(() => {
      const seedCall = global.fetch.mock.calls.find(([url]) =>
        String(url).includes("/api/schemas/seed"),
      );
      expect(seedCall).toBeDefined();
      expect(seedCall[1].headers.Authorization).toBe(`Bearer ${token}`);
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
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
