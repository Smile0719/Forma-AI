import React, { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { MagicInput } from "./MagicInput";
import AdminDashboard from "./AdminDashboard";
import FormField from "./FormField";
import "./styles.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

/** Minimal JWT login/register panel used for role-based access control. */
function AuthPanel({ user, apiBaseUrl, onAuthenticated, onSignOut }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  if (user) {
    return (
      <div className="auth-panel auth-panel--signed-in">
        <span>
          Signed in as <strong>{user.email}</strong> ({user.role})
        </span>
        <button type="button" className="text-button" onClick={onSignOut}>
          Sign out
        </button>
      </div>
    );
  }

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.token) {
        throw new Error(data.error || "Authentication failed.");
      }
      onAuthenticated(data.token);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form className="auth-panel" onSubmit={submit}>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Password (8+ characters)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        minLength={8}
        required
      />
      <button type="submit" className="secondary-button">
        {mode === "login" ? "Sign in" : "Create account"}
      </button>
      <button
        type="button"
        className="text-button"
        onClick={() => setMode(mode === "login" ? "register" : "login")}
      >
        {mode === "login" ? "Need an account?" : "Have an account?"}
      </button>
      {error && <span className="field-error">{error}</span>}
    </form>
  );
}

const translations = {
  en: {
    workspace: 'Adaptive intake workspace',
    title: 'Forma AI Engine',
    intro: 'Turn a quick description into a complete, validated form.',
    admin: 'Open admin builder',
    adminReturn: 'Return to claim',
    audit: 'Audit log',
    hideAudit: 'Hide audit log',
    loadError: 'We could not connect to the form service. Check that the backend is running and try again.',
    retry: 'Try again',
    signIn: 'Sign in',
    createAccount: 'Create account',
    startOver: 'Start over',
    undo: 'Undo AI fill',
    submit: 'Submit data',
    submitted: 'Your response has been captured successfully.',
    moodDay: 'Day mode',
    moodNight: 'Night mode',
    language: 'Language',
    loading: 'Loading your workspace...'
  },
  es: {
    workspace: 'Espacio de ingreso adaptativo',
    title: 'Motor Forma AI',
    intro: 'Convierte una descripción breve en un formulario completo y validado.',
    admin: 'Abrir creador',
    adminReturn: 'Volver al formulario',
    audit: 'Registro de auditoría',
    hideAudit: 'Ocultar registro',
    loadError: 'No pudimos conectarnos al servicio del formulario. Comprueba que el backend esté activo y vuelve a intentarlo.',
    retry: 'Reintentar',
    signIn: 'Iniciar sesión',
    createAccount: 'Crear cuenta',
    startOver: 'Empezar de nuevo',
    undo: 'Deshacer relleno IA',
    submit: 'Enviar datos',
    submitted: 'Tu respuesta ha sido capturada correctamente.',
    moodDay: 'Modo día',
    moodNight: 'Modo noche',
    language: 'Idioma',
    loading: 'Cargando tu espacio de trabajo...'
  },
  fr: {
    workspace: 'Espace d’intégration adaptatif',
    title: 'Forma AI Engine',
    intro: 'Transformez une description rapide en un formulaire complet et validé.',
    admin: 'Ouvrir le builder',
    adminReturn: 'Retour au formulaire',
    audit: 'Journal d’audit',
    hideAudit: 'Masquer le journal',
    loadError: 'Nous n’avons pas pu nous connecter au service de formulaire. Vérifiez que le backend fonctionne puis réessayez.',
    retry: 'Réessayer',
    signIn: 'Se connecter',
    createAccount: 'Créer un compte',
    startOver: 'Recommencer',
    undo: 'Annuler le remplissage IA',
    submit: 'Soumettre les données',
    submitted: 'Votre réponse a bien été enregistrée.',
    moodDay: 'Mode jour',
    moodNight: 'Mode nuit',
    language: 'Langue',
    loading: 'Chargement de votre espace...'
  },
  hi: {
    workspace: 'अनुकूल इनटेक कार्यक्षेत्र',
    title: 'फॉर्मा AI इंजन',
    intro: 'एक छोटी विवरण को पूरा और सत्यापित फॉर्म में बदलें।',
    admin: 'एडमिन बिल्डर खोलें',
    adminReturn: 'फॉर्म पर वापस जाएँ',
    audit: 'ऑडिट लॉग',
    hideAudit: 'लॉग छिपाएँ',
    loadError: 'फॉर्म सेवा से कनेक्ट नहीं हो पाया। बैकएंड चल रहा है या नहीं देखें और फिर से प्रयास करें।',
    retry: 'फिर से प्रयास करें',
    signIn: 'साइन इन',
    createAccount: 'खाता बनाएं',
    startOver: 'शुरू से करें',
    undo: 'AI भराव को पूर्ववत करें',
    submit: 'डेटा जमा करें',
    submitted: 'आपका उत्तर सफलतापूर्वक दर्ज हो गया है।',
    moodDay: 'डे मोड',
    moodNight: 'नाइट मोड',
    language: 'भाषा',
    loading: 'आपका कार्यक्षेत्र लोड हो रहा है...'
  },
  de: {
    workspace: 'Adaptiver Eingabe-Bereich',
    title: 'Forma AI Engine',
    intro: 'Verwandle eine kurze Beschreibung in ein vollständiges, validiertes Formular.',
    admin: 'Admin-Builder öffnen',
    adminReturn: 'Zurück zum Formular',
    audit: 'Audit-Log',
    hideAudit: 'Log ausblenden',
    loadError: 'Die Formular-API konnte nicht erreicht werden. Prüfen Sie den Backend-Status und versuchen Sie es erneut.',
    retry: 'Erneut versuchen',
    signIn: 'Anmelden',
    createAccount: 'Konto erstellen',
    startOver: 'Neu starten',
    undo: 'KI-Füllung rückgängig',
    submit: 'Daten senden',
    submitted: 'Ihre Antwort wurde erfolgreich erfasst.',
    moodDay: 'Tagesmodus',
    moodNight: 'Nachtmodus',
    language: 'Sprache',
    loading: 'Arbeitsbereich wird geladen...'
  }
};

export default function App() {
  const [schemaId, setSchemaId] = useState(null);
  const [schema, setSchema] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [confidenceScores, setConfidenceScores] = useState({});
  const [showAdmin, setShowAdmin] = useState(false);
  const [undoValues, setUndoValues] = useState(null);
  const [user, setUser] = useState(null);
  const [showAudit, setShowAudit] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [provider, setProvider] = useState("");
  const [uiLanguage, setUiLanguage] = useState(() => {
    const saved = localStorage.getItem('forma-ai-language');
    return saved || 'en';
  });
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('forma-ai-theme');
    return saved || 'day';
  });
  // Tracks which fields were populated by AI so submissions can be audited
  const provenanceRef = useRef({});
  const [authToken, setAuthToken] = useState(() =>
    window.localStorage.getItem("forma-ai-token"),
  );
  const [clientId] = useState(() => {
    const stored = window.localStorage.getItem("forma-ai-client-id");
    if (stored) return stored;
    const created = crypto.randomUUID();
    window.localStorage.setItem("forma-ai-client-id", created);
    return created;
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm({ mode: "onChange", shouldUnregister: true });

  const t = translations[uiLanguage] || translations.en;

  useEffect(() => {
    document.body.dataset.theme = theme;
    document.documentElement.lang = uiLanguage;
    localStorage.setItem('forma-ai-theme', theme);
    localStorage.setItem('forma-ai-language', uiLanguage);
  }, [theme, uiLanguage]);

  // Decode stored token on mount to restore the session
  useEffect(() => {
    if (!authToken) return setUser(null);
    try {
      const payload = JSON.parse(atob(authToken.split(".")[1]));
      if (payload.exp * 1000 < Date.now()) {
        window.localStorage.removeItem("forma-ai-token");
        return setUser(null);
      }
      setUser({ email: payload.email, role: payload.role });
    } catch {
      setUser(null);
    }
  }, [authToken]);

  const authFetch = (url, options = {}) => {
    const headers = { ...(options.headers || {}) };
    if (authToken) headers.Authorization = `Bearer ${authToken}`;
    return fetch(url, { ...options, headers });
  };

  // Watch form inputs in real time to evaluate conditional showIf expressions
  const formValues = watch();
  const formValuesRef = useRef(formValues);
  const serializedFormValues = JSON.stringify(formValues);
  const [draftSavedAt, setDraftSavedAt] = useState(null);
  const [hasDraft, setHasDraft] = useState(false);

  const draftKey = useMemo(
    () =>
      schema ? `forma-ai-draft-${schema.title}-${schema.version || 1}` : "",
    [schema],
  );

  const visibleFields =
    schema?.fields.filter(
      (field) =>
        !field.showIf || formValues[field.showIf.field] === field.showIf.equals,
    ) || [];
  const completedFields = visibleFields.filter((field) => {
    const value = formValues[field.name];
    return field.type === "checkbox"
      ? value === true
      : value !== undefined && value !== "";
  }).length;
  const completionPercent = visibleFields.length
    ? Math.round((completedFields / visibleFields.length) * 100)
    : 0;

  // Load the latest schema; only seed a default one when none exists yet
  const [schemaLoadAttempt, setSchemaLoadAttempt] = useState(0);
  useEffect(() => {
    const fetchOrCreateSchema = async () => {
      setLoading(true);
      setLoadError("");
      try {
        let response = await fetch(`${API_BASE_URL}/api/schemas/latest`);
        if (response.status === 404) {
          // No schema exists yet — seed an initial one
          response = await fetch(`${API_BASE_URL}/api/schemas/seed`, {
            method: "POST",
          });
        }
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data._id) {
          throw new Error(
            data.error || "The form service returned an invalid schema.",
          );
        }
        setSchemaId(data._id);
        setSchema(data);
      } catch (err) {
        console.error("Failed to initialize schema:", err);
        setLoadError(t.loadError);
      } finally {
        setLoading(false);
      }
    };

    fetchOrCreateSchema();
  }, [schemaLoadAttempt]);

  useEffect(() => {
    if (!draftKey) return;

    const savedDraft = window.localStorage.getItem(draftKey);
    if (!savedDraft) return;

    try {
      const parsedDraft = JSON.parse(savedDraft);
      reset(parsedDraft.values || {});
      setDraftSavedAt(parsedDraft.savedAt || null);
      setHasDraft(true);
    } catch (err) {
      console.error("Saved draft could not be restored:", err);
      window.localStorage.removeItem(draftKey);
    }
  }, [draftKey, reset]);

  useEffect(() => {
    if (!draftKey || !schema || !Object.keys(formValues).length) return;

    const savedAt = new Date().toISOString();
    window.localStorage.setItem(
      draftKey,
      JSON.stringify({ values: JSON.parse(serializedFormValues), savedAt }),
    );
    setDraftSavedAt(savedAt);
  }, [draftKey, schema, serializedFormValues]);

  useEffect(() => {
    formValuesRef.current = formValues;
  }, [formValues]);

  // Sync the draft on a fixed interval that does not restart on every keystroke;
  // values are read from a ref so the timer stays stable.
  useEffect(() => {
    if (!schemaId) return undefined;
    const syncDraft = () => {
      const values = formValuesRef.current;
      if (!Object.keys(values).length) return;
      fetch(`${API_BASE_URL}/api/drafts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schemaId, clientId, values }),
      }).catch((err) => console.warn("Draft sync unavailable:", err.message));
    };
    const interval = window.setInterval(syncDraft, 10000);
    return () => window.clearInterval(interval);
  }, [API_BASE_URL, clientId, schemaId]);

  // Hydrate extracted AI data into React Hook Form state
  const handleExtractionComplete = (extractedData, confidence = {}) => {
    setUndoValues(formValues);
    Object.keys(extractedData).forEach((key) => {
      setValue(key, extractedData[key], {
        shouldValidate: true,
        shouldDirty: true,
      });
      provenanceRef.current[key] = "ai";
    });
    provenanceRef.current.confidence = confidence;
    setConfidenceScores(confidence);
  };

  // Mark a field as human-edited the moment the user changes it after an AI fill
  const handleManualEdit = (fieldName) => {
    if (provenanceRef.current[fieldName] === "ai") {
      provenanceRef.current[fieldName] = "human";
    }
  };

  const onSubmit = async (data) => {
    console.log("Final Form Submission:", data);
    setSubmitted(true);
    try {
      const response = await authFetch(`${API_BASE_URL}/api/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schemaId,
          values: data,
          provenance: provenanceRef.current,
          clientId,
        }),
      });
      if (!response.ok) console.warn("Submission audit could not be recorded.");
    } catch (err) {
      console.warn("Submission sync failed:", err.message);
    }
  };

  const loadAuditLog = async () => {
    try {
      const response = await authFetch(
        `${API_BASE_URL}/api/audit?schemaId=${schemaId}`,
      );
      const data = await response.json();
      if (Array.isArray(data)) setAuditLogs(data);
    } catch (err) {
      console.warn("Audit log unavailable:", err.message);
    }
  };

  const clearDraft = () => {
    reset({});
    setConfidenceScores({});
    setSubmitted(false);
    setHasDraft(false);
    setDraftSavedAt(null);
    setUndoValues(null);
    if (draftKey) window.localStorage.removeItem(draftKey);
  };

  if (loading) {
    return (
      <main className="app-shell app-shell--centered">
        <div className="loading-state" role="status">
          <span className="loading-spinner" aria-hidden="true" />
          <span>{t.loading}</span>
        </div>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="app-shell app-shell--centered">
        <section className="state-panel" role="alert">
          <span className="state-icon" aria-hidden="true">
            !
          </span>
          <p className="eyebrow">Connection issue</p>
          <h1>We could not load the form</h1>
          <p>{loadError}</p>
          <button
            type="button"
            className="secondary-button"
            onClick={() => setSchemaLoadAttempt((n) => n + 1)}
          >
            {t.retry}
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="header-controls">
          <label className="theme-switch" htmlFor="ui-language">
            <span>{t.language}</span>
            <select
              id="ui-language"
              value={uiLanguage}
              onChange={(event) => setUiLanguage(event.target.value)}
            >
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
              <option value="hi">हिन्दी</option>
              <option value="de">Deutsch</option>
            </select>
          </label>
          <button
            type="button"
            className="theme-toggle"
            onClick={() => setTheme((current) => (current === 'day' ? 'night' : 'day'))}
            aria-label={theme === 'day' ? t.moodNight : t.moodDay}
          >
            {theme === 'day' ? '☾' : '☀'} {theme === 'day' ? t.moodNight : t.moodDay}
          </button>
        </div>
        <p className="eyebrow">{t.workspace}</p>
        <h1>{t.title}</h1>
        <p className="app-intro">{t.intro}</p>
        <button
          type="button"
          className="admin-toggle"
          disabled={!user || user.role !== "admin"}
          title={
            user?.role === "admin"
              ? undefined
              : "Only admins can open the form builder"
          }
          onClick={() => setShowAdmin((current) => !current)}
        >
          {showAdmin ? t.adminReturn : t.admin}
        </button>
        {user?.role === "admin" || user?.role === "reviewer" ? (
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setShowAudit((v) => !v);
              loadAuditLog();
            }}
          >
            {showAudit ? t.hideAudit : t.audit}
          </button>
        ) : null}
      </header>

      <AuthPanel
        user={user}
        apiBaseUrl={API_BASE_URL}
        onAuthenticated={(token) => {
          window.localStorage.setItem("forma-ai-token", token);
          setAuthToken(token);
        }}
        onSignOut={() => {
          window.localStorage.removeItem("forma-ai-token");
          setAuthToken(null);
        }}
      />

      {showAudit && (
        <section className="audit-panel">
          <h3>Immutable audit log</h3>
          {auditLogs.length === 0 && <p>No audit entries yet.</p>}
          {auditLogs.map((log) => (
            <div key={log._id} className={`audit-row audit-row--${log.source}`}>
              <span>{new Date(log.createdAt).toLocaleString()}</span>
              <span className={`audit-source audit-source--${log.source}`}>
                {log.source.toUpperCase()}
              </span>
              <span>{log.action}</span>
              <span>{log.fieldName || "—"}</span>
              <span>{log.userEmail || log.clientId || "anonymous"}</span>
              {log.confidence !== undefined && (
                <span>{log.confidence}% confidence</span>
              )}
            </div>
          ))}
        </section>
      )}

      {showAdmin && schema && (
        <AdminDashboard
          schema={schema}
          apiBaseUrl={API_BASE_URL}
          authToken={authToken}
          onClose={() => setShowAdmin(false)}
          onSaved={(updatedSchema) => {
            setSchema(updatedSchema);
            setSchemaId(updatedSchema._id);
          }}
        />
      )}

      {!showAdmin && schemaId && (
        <MagicInput
          schemaId={schemaId}
          apiBaseUrl={API_BASE_URL}
          authFetch={authFetch}
          onProvider={(name) => setProvider(name)}
          onExtractionComplete={handleExtractionComplete}
        />
      )}
      {!showAdmin && provider && (
        <p className="provider-badge">
          Extracted via <strong>{provider}</strong>
        </p>
      )}

      {!showAdmin && schema && (
        <form onSubmit={handleSubmit(onSubmit)} className="dynamic-form">
          <div className="form-toolbar">
            <div>
              <strong>{completionPercent}% complete</strong>
              <span>
                {completedFields} of {visibleFields.length} fields filled
              </span>
            </div>
            <button type="button" className="text-button" onClick={clearDraft}>
              {t.startOver}
            </button>
            {undoValues && (
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  reset(undoValues);
                  setUndoValues(null);
                }}
              >
                {t.undo}
              </button>
            )}
          </div>
          <div
            className="progress-track"
            aria-label={`${completionPercent}% complete`}
          >
            <span style={{ width: `${completionPercent}%` }} />
          </div>
          {hasDraft && draftSavedAt && (
            <p className="draft-status" role="status">
              Draft restored. Saved{" "}
              {new Date(draftSavedAt).toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
              })}
              .
            </p>
          )}
          <div className="form-heading">
            <span className="form-step">01 / Details</span>
            <h2>{schema.title}</h2>
            {schema.description && <p>{schema.description}</p>}
          </div>

          {visibleFields.map((field) => (
            <FormField
              key={field.name}
              field={field}
              register={register}
              errors={errors}
              confidence={confidenceScores[field.name]}
              onManualEdit={() => handleManualEdit(field.name)}
            />
          ))}

          <button type="submit" className="submit-button">
            {t.submit} <span aria-hidden="true">-&gt;</span>
          </button>
          {submitted && (
            <p className="success-message" role="status">
              {t.submitted}
            </p>
          )}
        </form>
      )}
    </main>
  );
}
