import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { MagicInput } from "./MagicInput";
import AdminDashboard from "./AdminDashboard";
import FormField from "./FormField";
import brandLogo from "./logo.jpeg";
import { isFieldVisible } from "./formRules.js";
import "./styles.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
export const getPostLoginPath = (role) =>
  role === "admin" ? "/admin/dashboard" : "/";

/** Minimal JWT login/register panel used for role-based access control. */
function AuthPanel({ user, apiBaseUrl, onAuthenticated, onSignOut, labels, allowRoleChoice = false }) {
  const [mode, setMode] = useState("login");
  const [accountType, setAccountType] = useState("claimer");
  const [error, setError] = useState("");

  if (user) {
    return (
      <div className="auth-panel auth-panel--signed-in">
        <span>
          {labels.signedInAs} <strong>{user.email}</strong> ({user.role})
        </span>
        <button type="button" className="text-button" onClick={onSignOut}>
          {labels.signOut}
        </button>
      </div>
    );
  }

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const credentials = new FormData(event.currentTarget);
      const response = await fetch(`${apiBaseUrl}/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(credentials.get("email") || "").trim(),
          password: String(credentials.get("password") || ""),
          role: mode === "login" ? accountType : "claimer",
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.token) {
        throw new Error(data.error || "Authentication failed.");
      }
      onAuthenticated(data.token, data.user);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form className="auth-panel" onSubmit={submit} autoComplete="on">
      <input
        id="auth-email"
        name="email"
        type="email"
        placeholder={labels.email}
        aria-label={labels.email}
        autoComplete="username"
        required
      />
      <input
        id="auth-password"
        name="password"
        type="password"
        placeholder={labels.password}
        aria-label={labels.password}
        autoComplete={mode === "login" ? "current-password" : "new-password"}
        minLength={8}
        required
      />
      {allowRoleChoice && mode === "login" && (
        <label className="auth-role-choice" htmlFor="auth-role">
          {labels.loginType}
          <select
            id="auth-role"
            name="role"
            value={accountType}
            onChange={(event) => setAccountType(event.target.value)}
          >
            <option value="claimer">{labels.claimerRole}</option>
            <option value="admin">{labels.adminRole}</option>
          </select>
        </label>
      )}
      <button type="submit" className="secondary-button">
        {mode === "login" ? labels.signIn : labels.createAccount}
      </button>
      {(!allowRoleChoice || accountType === "claimer" || mode === "register") && (
        <button
          type="button"
          className="text-button"
          onClick={() => {
            setError("");
            setMode(mode === "login" ? "register" : "login");
            setAccountType("claimer");
          }}
        >
          {mode === "login" ? labels.needAccount : labels.haveAccount}
        </button>
      )}
      {error && <span className="field-error">{error}</span>}
    </form>
  );
}

const translations = {
  en: {
    workspace: 'Adaptive intake workspace',
    title: 'Forma AI Engine',
    intro: 'Turn a quick description into a complete, validated form.',
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
    openAdminBuilder: 'Open admin builder',
    loading: 'Loading your workspace...',
    email: 'Email',
    password: 'Password (8+ characters)',
    signedInAs: 'Signed in as',
    signOut: 'Sign out',
    needAccount: 'Need an account?',
    haveAccount: 'Have an account?',
    loginWelcome: 'Welcome to Forma AI',
    loginHeading: 'Sign in to your workspace',
    loginIntro: 'Access your forms and continue where you left off.',
    loginSecurity: 'Your account keeps your workspace secure.',
    loginType: 'Sign in as',
    adminRole: 'Administrator',
    claimerRole: 'Claimer'
  },
  es: {
    workspace: 'Espacio de ingreso adaptativo',
    title: 'Motor Forma AI',
    intro: 'Convierte una descripción breve en un formulario completo y validado.',
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
    openAdminBuilder: 'Abrir constructor de administración',
    loading: 'Cargando tu espacio de trabajo...',
    email: 'Correo electrónico',
    password: 'Contraseña (8+ caracteres)',
    signedInAs: 'Sesión iniciada como',
    signOut: 'Cerrar sesión',
    needAccount: '¿Necesitas una cuenta?',
    haveAccount: '¿Ya tienes una cuenta?',
    loginWelcome: 'Te damos la bienvenida a Forma AI',
    loginHeading: 'Inicia sesión en tu espacio de trabajo',
    loginIntro: 'Accede a tus formularios y continúa donde lo dejaste.',
    loginSecurity: 'Tu cuenta mantiene seguro tu espacio de trabajo.',
    loginType: 'Iniciar sesión como',
    adminRole: 'Administrador',
    claimerRole: 'Solicitante'
  },
  fr: {
    workspace: 'Espace d’intégration adaptatif',
    title: 'Forma AI Engine',
    intro: 'Transformez une description rapide en un formulaire complet et validé.',
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
    openAdminBuilder: 'Ouvrir le constructeur administrateur',
    loading: 'Chargement de votre espace...',
    email: 'E-mail',
    password: 'Mot de passe (8+ caractères)',
    signedInAs: 'Connecté en tant que',
    signOut: 'Se déconnecter',
    needAccount: 'Besoin d’un compte ?',
    haveAccount: 'Vous avez déjà un compte ?',
    loginWelcome: 'Bienvenue sur Forma AI',
    loginHeading: 'Connectez-vous à votre espace',
    loginIntro: 'Accédez à vos formulaires et reprenez là où vous en étiez.',
    loginSecurity: 'Votre compte protège votre espace de travail.',
    loginType: 'Se connecter en tant que',
    adminRole: 'Administrateur',
    claimerRole: 'Demandeur'
  },
  hi: {
    workspace: 'अनुकूल इनटेक कार्यक्षेत्र',
    title: 'फॉर्मा AI इंजन',
    intro: 'एक छोटी विवरण को पूरा और सत्यापित फॉर्म में बदलें।',
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
    openAdminBuilder: 'एडमिन बिल्डर खोलें',
    loading: 'आपका कार्यक्षेत्र लोड हो रहा है...',
    email: 'ईमेल',
    password: 'पासवर्ड (8+ अक्षर)',
    signedInAs: 'इस रूप में साइन इन',
    signOut: 'साइन आउट',
    needAccount: 'खाता चाहिए?',
    haveAccount: 'पहले से खाता है?',
    loginWelcome: 'Forma AI में आपका स्वागत है',
    loginHeading: 'अपने कार्यक्षेत्र में साइन इन करें',
    loginIntro: 'अपने फ़ॉर्म देखें और वहीं से जारी रखें जहाँ आपने छोड़ा था।',
    loginSecurity: 'आपका खाता आपके कार्यक्षेत्र को सुरक्षित रखता है।',
    loginType: 'इस रूप में साइन इन करें',
    adminRole: 'व्यवस्थापक',
    claimerRole: 'दावेदार'
  },
  de: {
    workspace: 'Adaptiver Eingabe-Bereich',
    title: 'Forma AI Engine',
    intro: 'Verwandle eine kurze Beschreibung in ein vollständiges, validiertes Formular.',
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
    openAdminBuilder: 'Admin-Builder öffnen',
    loading: 'Arbeitsbereich wird geladen...',
    email: 'E-Mail',
    password: 'Passwort (mindestens 8 Zeichen)',
    signedInAs: 'Angemeldet als',
    signOut: 'Abmelden',
    needAccount: 'Noch kein Konto?',
    haveAccount: 'Sie haben bereits ein Konto?',
    loginWelcome: 'Willkommen bei Forma AI',
    loginHeading: 'Melden Sie sich in Ihrem Arbeitsbereich an',
    loginIntro: 'Greifen Sie auf Ihre Formulare zu und machen Sie dort weiter, wo Sie aufgehört haben.',
    loginSecurity: 'Ihr Konto schützt Ihren Arbeitsbereich.',
    loginType: 'Anmelden als',
    adminRole: 'Administrator',
    claimerRole: 'Antragsteller'
  }
};

export default function App() {
  const [schemaId, setSchemaId] = useState(null);
  const [schema, setSchema] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  const [confidenceScores, setConfidenceScores] = useState({});
  const initialPath = window.location.pathname;
  const isLoginPage = initialPath === '/login.html' || initialPath === '/login';
  const routeSchemaId = initialPath.startsWith('/form/') ? initialPath.split('/form/')[1] : null;
  const [showAdmin, setShowAdmin] = useState(
    initialPath === '/admin/dashboard' || initialPath === '/admin.html',
  );
  const [showAuth, setShowAuth] = useState(
    initialPath === '/admin/dashboard' || initialPath === '/admin.html',
  );
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
    let cancelled = false;
    if (!authToken) {
      setUser(null);
      return undefined;
    }

    const clearInvalidSession = () => {
      if (cancelled) return;
      window.localStorage.removeItem("forma-ai-token");
      setAuthToken(null);
      setUser(null);
    };

    try {
      const payload = JSON.parse(atob(authToken.split(".")[1]));
      if (payload.exp * 1000 < Date.now()) {
        clearInvalidSession();
        return undefined;
      }
      setUser({ email: payload.email, role: payload.role });
      fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${authToken}` },
      }).then(async (response) => {
        if (response.status === 401 || response.status === 403) {
          clearInvalidSession();
          return;
        }
        if (!response.ok) throw new Error(`Session verification failed (${response.status}).`);
        const account = await response.json();
        if (!account.email || !account.role) {
          throw new Error("The session endpoint returned an invalid account.");
        }
        if (!cancelled) setUser({ email: account.email, role: account.role });
      }).catch((error) => {
        if (!cancelled) console.warn("Session verification unavailable:", error.message);
      });
    } catch (error) {
      if (!cancelled) clearInvalidSession();
    }

    return () => { cancelled = true; };
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
    schema?.fields.filter((field) => isFieldVisible(field, formValues, schema.fields)) || [];
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
  const schemaLoadPromiseRef = useRef(null);
  useEffect(() => {
    if (isLoginPage) {
      setLoading(false);
      return undefined;
    }
    if (schemaLoadPromiseRef.current) return undefined;

    const fetchOrCreateSchema = async () => {
      setLoading(true);
      setLoadError("");
      try {
        let response = routeSchemaId
          ? await fetch(`${API_BASE_URL}/api/schemas/${routeSchemaId}`)
          : await fetch(`${API_BASE_URL}/api/schemas/latest`);
        if (!routeSchemaId && response.status === 404) {
          // No schema exists yet — seed an initial one
          response = await fetch(`${API_BASE_URL}/api/schemas/seed`, {
            method: "POST",
            headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
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

    const request = fetchOrCreateSchema();
    schemaLoadPromiseRef.current = request;
    request.finally(() => {
      if (schemaLoadPromiseRef.current === request) {
        schemaLoadPromiseRef.current = null;
      }
    });
  }, [authToken, isLoginPage, schemaLoadAttempt, routeSchemaId]);

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
    if (!schemaId) return;
    let cancelled = false;
    const recoverDraft = async () => {
      try {
        const response = await authFetch(
          `${API_BASE_URL}/api/drafts/${schemaId}?clientId=${encodeURIComponent(clientId)}`,
        );
        if (response.status === 404) return;
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Saved draft could not be loaded.");
        if (cancelled || Object.keys(formValuesRef.current).length) return;

        const cached = draftKey ? window.localStorage.getItem(draftKey) : null;
        const localDraft = cached ? JSON.parse(cached) : null;
        if (localDraft?.savedAt && new Date(localDraft.savedAt) >= new Date(data.savedAt)) return;
        reset(data.values || {});
        setDraftSavedAt(data.savedAt || null);
        setHasDraft(true);
        if (draftKey) window.localStorage.setItem(draftKey, JSON.stringify(data));
      } catch (err) {
        console.warn("Server draft recovery unavailable:", err.message);
      }
    };
    recoverDraft();
    return () => { cancelled = true; };
  }, [API_BASE_URL, authToken, clientId, draftKey, reset, schemaId]);

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
      authFetch(`${API_BASE_URL}/api/drafts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schemaId, clientId, values }),
      }).catch((err) => console.warn("Draft sync unavailable:", err.message));
    };
    const interval = window.setInterval(syncDraft, 10000);
    return () => window.clearInterval(interval);
  }, [API_BASE_URL, authToken, clientId, schemaId]);

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
    setSubmitted(false);
    setSubmissionError("");
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
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.details?.join(" ") || result.error || "Submission could not be recorded.");
      }
      setSubmitted(true);
    } catch (err) {
      setSubmissionError(err.message);
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

  const headerControls = (
    <>
      <div className="site-header-actions">
        <label className="header-language" htmlFor="ui-language">
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
        {!isLoginPage && !showAdmin && (
          <a className="site-login-toggle" href="/admin/dashboard">
            {t.openAdminBuilder}
          </a>
        )}
        {isLoginPage ? (
          <a className="site-login-toggle" href="#login-card" aria-current="page">{t.signIn}</a>
        ) : user ? (
          <button
            type="button"
            className="site-login-toggle"
            aria-expanded={showAuth}
            onClick={() => setShowAuth((visible) => !visible)}
          >
            Account
          </button>
        ) : (
          <a className="site-login-toggle" href="/login.html">{t.signIn}</a>
        )}
      </div>
      {showAuth && !isLoginPage && (
        <AuthPanel
          user={user}
          apiBaseUrl={API_BASE_URL}
          labels={t}
          onAuthenticated={(token) => {
            window.localStorage.setItem("forma-ai-token", token);
            setAuthToken(token);
          }}
          onSignOut={() => {
            window.localStorage.removeItem("forma-ai-token");
            setAuthToken(null);
            setShowAuth(false);
          }}
        />
      )}
    </>
  );
  const headerControlsTarget = document.getElementById('site-header-controls');
  const headerPortal = headerControlsTarget
    ? createPortal(headerControls, headerControlsTarget)
    : headerControls;

  if (isLoginPage) {
    return (
      <>
        {headerPortal}
        <div className="app-shell login-page">
          <section className="login-card" id="login-card">
            <div className="login-card-heading">
              <img className="login-card-icon" src={brandLogo} alt="Forma AI logo" />
              <p className="eyebrow">{t.loginWelcome}</p>
              <h1>{t.loginHeading}</h1>
              <p>{t.loginIntro}</p>
            </div>
            <AuthPanel
              user={user}
              apiBaseUrl={API_BASE_URL}
              labels={t}
              allowRoleChoice
              onAuthenticated={(token, account) => {
                window.localStorage.setItem("forma-ai-token", token);
                setAuthToken(token);
                window.location.assign(getPostLoginPath(account?.role));
              }}
              onSignOut={() => {
                window.localStorage.removeItem("forma-ai-token");
                setAuthToken(null);
              }}
            />
            <p className="login-card-note">{t.loginSecurity}</p>
          </section>
        </div>
      </>
    );
  }

  const saveDraft = async () => {
    if (!schemaId) return;
    const values = formValuesRef.current;
    const savedAt = new Date().toISOString();
    window.localStorage.setItem(draftKey, JSON.stringify({ values, savedAt }));
    setDraftSavedAt(savedAt);
    setHasDraft(true);
    try {
      await authFetch(`${API_BASE_URL}/api/drafts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schemaId, clientId, values })
      });
    } catch (err) {
      console.warn('Draft save unavailable:', err.message);
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
      <>
        {headerPortal}
        <div className="app-shell app-shell--centered">
          <div className="loading-state" role="status">
            <span className="loading-spinner" aria-hidden="true" />
            <span>{t.loading}</span>
          </div>
        </div>
      </>
    );
  }

  if (loadError) {
    return (
      <>
        {headerPortal}
        <div className="app-shell app-shell--centered">
          <section className="state-panel" role="alert">
            <span className="state-icon" aria-hidden="true">!</span>
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
        </div>
      </>
    );
  }

  return (
    <>
      {headerPortal}
      <div className={`app-shell${showAdmin ? ' app-shell--admin' : ''}`}>
      <header className="app-header">
        <p className="eyebrow">{t.workspace}</p>
        <h1>{t.title}</h1>
        <p className="app-intro">{t.intro}</p>
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

      {showAdmin && user?.role !== 'admin' && (
        <section className="admin-access-note" role="status">
          <p className="eyebrow">Administrator access</p>
          <h2>Sign in with an admin account</h2>
          <p>The dashboard is available to administrators only. Sign in above to manage forms and review submissions.</p>
        </section>
      )}

      {showAdmin && schema && user?.role === 'admin' && (
        <AdminDashboard
          schema={schema}
          apiBaseUrl={API_BASE_URL}
          authToken={authToken}
          onClose={() => {
            setShowAdmin(false);
            window.history.pushState({}, '', '/');
            setSchemaLoadAttempt((attempt) => attempt + 1);
          }}
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
            <button type="button" className="secondary-button" onClick={saveDraft}>
              Save draft
            </button>
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
          {submissionError && <p className="magic-error" role="alert">{submissionError}</p>}
        </form>
      )}
      </div>
    </>
  );
}
