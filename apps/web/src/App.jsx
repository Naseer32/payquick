import {
  Component,
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";

import WalletButton from "./components/WalletButton.jsx";

// Each page loads when it's first opened, so the app starts fast and only the pages
// that need the wallet library (checkout, settings) download it.
const Landing = lazy(() => import("./pages/Landing.jsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.jsx"));
const Invoices = lazy(() => import("./pages/Invoices.jsx"));
const Checkout = lazy(() => import("./pages/Checkout.jsx"));
const Customers = lazy(() => import("./pages/Customers.jsx"));
const Payments = lazy(() => import("./pages/Payments.jsx"));
const Settings = lazy(() => import("./pages/Settings.jsx"));
import { ThemeScope } from "./components/ui.jsx";
import { getTheme } from "./theme.js";

const APP_PAGES = ["dashboard", "invoices", "customers", "payments", "settings"];

const NAVIGATION = [
  { id: "dashboard", label: "Dashboard" },
  { id: "invoices", label: "Invoices" },
  { id: "customers", label: "Customers" },
  { id: "payments", label: "Payments" },
  { id: "webhooks", label: "Webhooks", soon: true },
  { id: "settings", label: "Settings" }
];

const TITLES = {
  landing: "PayQuick",
  checkout: "Pay invoice · PayQuick",
  dashboard: "Dashboard · PayQuick",
  invoices: "Invoices · PayQuick",
  customers: "Customers · PayQuick",
  payments: "Payments · PayQuick",
  settings: "Settings · PayQuick"
};

const ICONS = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  invoices: (
    <>
      <path d="M6 3h8l5 5v13H6z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h7M9 17h7" />
    </>
  ),
  customers: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M17 14c2.5 0 4.5 1.8 4.5 4.5" />
    </>
  ),
  payments: (
    <>
      <path d="M7 17L17 7" />
      <path d="M8 7h9v9" />
    </>
  ),
  webhooks: (
    <>
      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
      <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
    </>
  ),
  settings: (
    <>
      <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="8" cy="17" r="2" />
    </>
  )
};

function Icon({ name }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  );
}

// Catches a page that fails to load (for example after a new deploy, or with no connection).
class PageBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <div role="alert" style={{ maxWidth: 420, margin: "64px auto", padding: 24, textAlign: "center", fontFamily: "system-ui, sans-serif" }}>
        <h1 style={{ fontSize: 20, margin: "0 0 8px" }}>This page didn't load</h1>
        <p style={{ margin: "0 0 18px", lineHeight: 1.5, opacity: 0.8 }}>
          Check your connection, then reload. If PayQuick was just updated, reloading
          fetches the latest version.
        </p>
        <button
          type="button"
          style={{ minHeight: 46, padding: "0 20px", border: 0, borderRadius: 10, background: "#1B55E8", color: "#fff", font: "inherit", fontWeight: 650, cursor: "pointer" }}
          onClick={() => window.location.reload()}
        >
          Reload
        </button>
      </div>
    );
  }
}

function Screen({ children, inShell = false }) {
  return (
    <PageBoundary>
      <Suspense
        fallback={
          inShell ? (
            <div className="pq-skel" aria-busy="true" aria-label="Loading page" style={{ height: 240, borderRadius: 16 }} />
          ) : (
            <div role="status" style={{ padding: 40, textAlign: "center", fontFamily: "system-ui, sans-serif", opacity: 0.7 }}>
              Loading…
            </div>
          )
        }
      >
        {children}
      </Suspense>
    </PageBoundary>
  );
}

function readRoute() {
  const path = window.location.pathname;

  if (path.startsWith("/pay/")) {
    return { page: "checkout", token: path.slice("/pay/".length) };
  }

  const clean = path.replace(/\/+$/, "") || "/";
  const key = clean.slice(1);

  return {
    page: clean !== "/" && APP_PAGES.includes(key) ? key : "landing",
    token: ""
  };
}

function readInitialDarkMode() {
  try {
    const stored = localStorage.getItem("payquick_theme");

    if (stored === "dark" || stored === "light") {
      return stored === "dark";
    }
  } catch {
    /* storage unavailable */
  }

  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

const SHELL_CSS = `
.pq-skip{position:absolute;left:-9999px;top:8px;background:var(--pq-primary);color:var(--pq-onPrimary);padding:10px 14px;border-radius:8px;z-index:1000;font-weight:650;text-decoration:none}
.pq-skip:focus{left:8px}

.pq-side{position:fixed;top:0;bottom:0;left:0;width:240px;background:var(--pq-surface);border-right:1px solid var(--pq-border);padding:20px 14px;display:flex;flex-direction:column;z-index:200}
.pq-brandbtn{display:flex;align-items:center;gap:11px;border:0;background:transparent;color:inherit;cursor:pointer;padding:4px 8px;margin-bottom:28px;font:inherit;border-radius:10px}
.pq-brandbtn b{font-size:19px;font-weight:800;letter-spacing:-.5px}
.pq-brandbtn:focus-visible{outline:3px solid var(--pq-focus);outline-offset:2px}
.pq-navlabel{padding:0 10px;margin-bottom:8px;font-size:11px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--pq-muted)}
.pq-nav{display:grid;gap:4px}
.pq-navitem{display:flex;align-items:center;gap:12px;width:100%;min-height:44px;padding:0 12px;border:0;border-radius:10px;background:transparent;color:var(--pq-muted);font:inherit;font-size:14px;font-weight:550;cursor:pointer;text-align:left}
.pq-navitem:hover:not(:disabled){background:var(--pq-sunken);color:var(--pq-text)}
.pq-navitem[aria-current="page"]{background:var(--pq-infoBg);color:var(--pq-info);font-weight:650}
.pq-navitem:disabled{opacity:.55;cursor:default}
.pq-navitem:focus-visible{outline:3px solid var(--pq-focus);outline-offset:-1px}
.pq-soon{margin-left:auto;font-size:10px;font-weight:700;letter-spacing:.6px;text-transform:uppercase}
.pq-sidefoot{margin-top:auto;border-top:1px solid var(--pq-border);padding-top:14px}
.pq-state{margin-left:auto;font-size:12px}

.pq-main{margin-left:240px;min-height:100vh}
.pq-top{position:sticky;top:0;z-index:100;min-height:64px;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 28px;background:var(--pq-surface);border-bottom:1px solid var(--pq-border)}
.pq-topleft{display:flex;align-items:center;gap:10px;min-width:0}
.pq-topmark{display:none}
.pq-net{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;background:var(--pq-infoBg);color:var(--pq-info);font-size:12px;font-weight:650;white-space:nowrap}
.pq-net::before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor}
.pq-content{max-width:1180px;margin:0 auto;padding:28px 28px 56px;outline:none}
.pq-bottom{display:none}

@media (max-width:767px){
  .pq-side{display:none}
  .pq-main{margin-left:0;padding-bottom:calc(64px + env(safe-area-inset-bottom,0px))}
  .pq-top{padding:8px 14px;padding-top:calc(8px + env(safe-area-inset-top,0px))}
  .pq-topmark{display:grid}
  .pq-content{padding:18px 14px 28px}
  .pq-bottom{display:flex;position:fixed;left:0;right:0;bottom:0;z-index:200;background:var(--pq-surface);border-top:1px solid var(--pq-border);padding-bottom:env(safe-area-inset-bottom,0px)}
  .pq-bottom button{flex:1;min-width:0;min-height:60px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;border:0;background:transparent;color:var(--pq-muted);font:inherit;font-size:11px;font-weight:550;cursor:pointer}
  .pq-bottom button[aria-current="page"]{color:var(--pq-primary);font-weight:700}
  .pq-bottom button:focus-visible{outline:3px solid var(--pq-focus);outline-offset:-3px}
}
`;

export default function App() {
  const [merchant, setMerchant] = useState(null);
  const [invoiceCustomerId, setInvoiceCustomerId] = useState("");
  const [route, setRoute] = useState(readRoute);
  const [darkMode, setDarkMode] = useState(readInitialDarkMode);
  const [isMobile, setIsMobile] = useState(
    () => window.matchMedia?.("(max-width: 767px)").matches ?? false
  );

  const mainRef = useRef(null);
  const firstRender = useRef(true);

  // Saves the choice only when the person changes it, so the first visit follows their device.
  const updateDarkMode = useCallback((next) => {
    setDarkMode((current) => {
      const value = typeof next === "function" ? next(current) : next;

      try {
        localStorage.setItem("payquick_theme", value ? "dark" : "light");
      } catch {
        /* storage unavailable */
      }

      return value;
    });
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");

    function onChange(event) {
      setIsMobile(event.matches);
    }

    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    function onPopState() {
      setRoute(readRoute());
    }

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    document.title = TITLES[route.page] || "PayQuick";
  }, [route.page]);

  useEffect(() => {
    document.documentElement.style.colorScheme = darkMode ? "dark" : "light";
    document.body.style.background = getTheme(darkMode).bg;
    document.body.style.margin = "0";
  }, [darkMode]);

  // After moving between pages, send keyboard and screen-reader focus to the new content.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    window.scrollTo(0, 0);
    mainRef.current?.focus({ preventScroll: true });
  }, [route.page]);

  const navigate = useCallback((page) => {
    if (page === "webhooks") return;

    const target = page === "landing" ? "/" : `/${page}`;

    if (window.location.pathname !== target) {
      window.history.pushState({}, "", target);
    }

    setRoute({ page, token: "" });
  }, []);

  if (route.page === "checkout") {
    return (
      <Screen>
        <Checkout checkoutToken={route.token} darkMode={darkMode} />
      </Screen>
    );
  }

  if (route.page === "landing") {
    return (
      <Screen>
        <Landing
          onGetStarted={() => navigate("dashboard")}
          darkMode={darkMode}
          onToggleTheme={() => updateDarkMode((current) => !current)}
        />
      </Screen>
    );
  }

  function renderPage() {
    switch (route.page) {
      case "invoices":
        return (
          <Invoices
            merchant={merchant}
            darkMode={darkMode}
            presetCustomerId={invoiceCustomerId}
            onPresetUsed={() => setInvoiceCustomerId("")}
          />
        );

      case "customers":
        return (
          <Customers
            merchant={merchant}
            darkMode={darkMode}
            onCreateInvoice={(id) => {
              setInvoiceCustomerId(id);
              navigate("invoices");
            }}
          />
        );

      case "payments":
        return <Payments merchant={merchant} darkMode={darkMode} />;

      case "settings":
        return (
          <Settings
            merchant={merchant}
            darkMode={darkMode}
            setDarkMode={updateDarkMode}
          />
        );

      case "dashboard":
      default:
        return (
          <Dashboard
            merchant={merchant}
            darkMode={darkMode}
            onNavigate={navigate}
          />
        );
    }
  }

  const mobileNavigation = NAVIGATION.filter((item) => !item.soon);

  return (
    <ThemeScope dark={darkMode}>
      <style>{SHELL_CSS}</style>

      <a
        href="#main"
        className="pq-skip"
        onClick={(event) => {
          event.preventDefault();
          mainRef.current?.focus();
        }}
      >
        Skip to content
      </a>

      <aside className="pq-side">
        <button type="button" className="pq-brandbtn" onClick={() => navigate("dashboard")}>
          <span className="pq-mark" aria-hidden="true">P</span>
          <b>PayQuick</b>
        </button>

        <div className="pq-navlabel">Workspace</div>

        <nav className="pq-nav" aria-label="Main">
          {NAVIGATION.map((item) => (
            <button
              key={item.id}
              type="button"
              className="pq-navitem"
              disabled={item.soon}
              aria-current={route.page === item.id ? "page" : undefined}
              onClick={() => navigate(item.id)}
            >
              <Icon name={item.id} />
              <span>{item.label}</span>
              {item.soon && <span className="pq-soon">Soon</span>}
            </button>
          ))}
        </nav>

        <div className="pq-sidefoot">
          <button
            type="button"
            className="pq-navitem"
            role="switch"
            aria-checked={darkMode}
            onClick={() => updateDarkMode((current) => !current)}
          >
            <span>Dark mode</span>
            <span className="pq-state">{darkMode ? "On" : "Off"}</span>
          </button>
        </div>
      </aside>

      <div className="pq-main">
        <header className="pq-top">
          <div className="pq-topleft">
            <span className="pq-mark pq-topmark" aria-hidden="true">P</span>
            <span className="pq-net">Arc Testnet</span>
          </div>

          <WalletButton
            onAuthenticated={setMerchant}
            isMobile={isMobile}
            darkMode={darkMode}
          />
        </header>

        <main id="main" className="pq-content" tabIndex={-1} ref={mainRef}>
          <Screen inShell>{renderPage()}</Screen>
        </main>

        <nav className="pq-bottom" aria-label="Primary">
          {mobileNavigation.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-current={route.page === item.id ? "page" : undefined}
              onClick={() => navigate(item.id)}
            >
              <Icon name={item.id} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </ThemeScope>
  );
}
