import { useEffect, useState } from "react";

import Landing from "./pages/Landing.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Invoices from "./pages/Invoices.jsx";
import Checkout from "./pages/Checkout.jsx";
import Customers from "./pages/Customers.jsx";
import Payments from "./pages/Payments.jsx";
import Settings from "./pages/Settings.jsx";
import WalletButton from "./components/WalletButton.jsx";

export default function App() {
  const [merchant, setMerchant] = useState(null);
  const [invoiceCustomerId, setInvoiceCustomerId] = useState("");
  const [activeSection, setActiveSection] = useState(() => {
    const path = window.location.pathname;

    if (path === "/invoices") return "invoices";
    if (path === "/payments") return "payments";
    if (path === "/customers") return "customers";
    if (path === "/settings") return "settings";

    return "dashboard";
  });

  const [currentPage, setCurrentPage] = useState(() => {
    const path = window.location.pathname;

    if (path.startsWith("/pay/")) return "checkout";
    if (path === "/dashboard") return "dashboard";
    if (path === "/invoices") return "invoices";
    if (path === "/payments") return "payments";
    if (path === "/customers") return "customers";
    if (path === "/settings") return "settings";

    return "landing";
  });

  const [checkoutToken] = useState(() => {
    const path = window.location.pathname;

    if (path.startsWith("/pay/")) {
      return path.slice("/pay/".length);
    }

    return "";
  });

  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("payquick_theme") === "dark";
  });

  const [isMobile, setIsMobile] = useState(
    () => window.innerWidth < 768
  );

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 768);
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "payquick_theme",
      darkMode ? "dark" : "light"
    );
  }, [darkMode]);

  function navigate(page) {
    setCurrentPage(page);

    if (page === "landing") {
      window.history.pushState({}, "", "/");
      return;
    }

    setActiveSection(page);
    window.history.pushState({}, "", `/${page}`);
  }

  useEffect(() => {
    function handlePopState() {
      const path = window.location.pathname;

      if (path === "/") {
        setCurrentPage("landing");
        return;
      }

      if (path === "/dashboard") {
        setCurrentPage("dashboard");
        setActiveSection("dashboard");
        return;
      }

      if (path === "/invoices") {
        setCurrentPage("invoices");
        setActiveSection("invoices");
        return;
      }

      if (path === "/payments") {
        setCurrentPage("payments");
        setActiveSection("payments");
        return;
      }

      if (path === "/customers") {
        setCurrentPage("customers");
        setActiveSection("customers");
        return;
      }

      if (path === "/settings") {
        setCurrentPage("settings");
        setActiveSection("settings");
        return;
      }

      if (path.startsWith("/pay/")) {
        setCurrentPage("checkout");
        return;
      }
    }

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  if (currentPage === "checkout") {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: darkMode ? "#0a0e1a" : "#f8fafc",
          color: darkMode ? "#f8fafc" : "#0f172a"
        }}
      >
        <Checkout checkoutToken={checkoutToken} darkMode={darkMode} />
      </main>
    );
  }

  if (currentPage === "landing") {
    return (
      <Landing
        onGetStarted={() => navigate("dashboard")}
      />
    );
  }

  const theme = darkMode
    ? {
        background: "#080c14",
        sidebar: "#0c111c",
        surface: "#101722",
        surfaceHover: "#151e2c",
        text: "#f8fafc",
        muted: "#8d99aa",
        border: "#1d2735",
        primary: "#3b82f6",
        primaryHover: "#2563eb",
        active: "#17243a",
        danger: "#ef4444"
      }
    : {
        background: "#f6f8fb",
        sidebar: "#ffffff",
        surface: "#ffffff",
        surfaceHover: "#f1f5f9",
        text: "#0f172a",
        muted: "#64748b",
        border: "#e2e8f0",
        primary: "#2563eb",
        primaryHover: "#1d4ed8",
        active: "#eff6ff",
        danger: "#dc2626"
      };

  const navigation = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: "▦"
    },
    {
      id: "invoices",
      label: "Invoices",
      icon: "▤"
    },
    {
      id: "customers",
      label: "Customers",
      icon: "♙"
    },
    {
      id: "payments",
      label: "Payments",
      icon: "↗"
    },
    {
      id: "webhooks",
      label: "Webhooks",
      icon: "◇"
    },
    {
      id: "settings",
      label: "Settings",
      icon: "⚙"
    }
  ];

  function handleNavigation(section) {
    if (section === "webhooks") {
  return;
    }

    setActiveSection(section);
    setCurrentPage(section);

    window.history.pushState(
      {},
      "",
      `/${section}`
    );
  }

  function renderSection() {
  switch (activeSection) {
    case "invoices":
      return (
        <Invoices
          merchant={merchant}
          darkMode={darkMode}
          presetCustomerId={invoiceCustomerId}
          onPresetUsed={() => setInvoiceCustomerId("")}
        />
      );

    case "payments":
      return (
        <Payments
          merchant={merchant}
          darkMode={darkMode}
        />
      );

    case "customers":
      return (
        <Customers
          merchant={merchant}
          darkMode={darkMode}
          onCreateInvoice={(id) => {
            setInvoiceCustomerId(id);
            handleNavigation("invoices");
          }}
        />
      );

    case "settings":
  return (
    <Settings
      merchant={merchant}
      darkMode={darkMode}
      setDarkMode={setDarkMode}
    />
  );

    case "dashboard":
    default:
      return (
        <Dashboard
          merchant={merchant}
          darkMode={darkMode}
          onNavigate={handleNavigation}
        />
      );
  }
}

const activeLabel =
  navigation.find(
    (item) => item.id === activeSection
  )?.label || "Dashboard";
  return (
    <main
      style={{
        minHeight: "100vh",
        background: theme.background,
        color: theme.text,
        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        transition:
          "background 0.2s ease, color 0.2s ease"
      }}
    >
      <aside
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          width: "240px",
          background: theme.sidebar,
          borderRight: `1px solid ${theme.border}`,
          padding: "24px 16px",
          boxSizing: "border-box",
          zIndex: 200,
          display: isMobile ? "none" : "flex",
          flexDirection: "column"
        }}
      >
        <button
          type="button"
          onClick={() => navigate("dashboard")}
          style={{
            border: "none",
            background: "transparent",
            color: theme.text,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "11px",
            padding: "3px 9px",
            marginBottom: "38px",
            textAlign: "left"
          }}
        >
          <span
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: theme.primary,
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "800",
              fontSize: "18px",
              boxShadow: darkMode
                ? "0 6px 20px rgba(59, 130, 246, 0.20)"
                : "0 5px 14px rgba(37, 99, 235, 0.18)"
            }}
          >
            P
          </span>

          <span
            style={{
              fontSize: "19px",
              fontWeight: "800",
              letterSpacing: "-0.5px"
            }}
          >
            PayQuick
          </span>
        </button>

        <div
          style={{
            padding: "0 10px",
            marginBottom: "10px",
            fontSize: "10px",
            fontWeight: "700",
            letterSpacing: "1px",
            textTransform: "uppercase",
            color: theme.muted
          }}
        >
          Workspace
        </div>

        <nav
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "4px"
          }}
        >
          {navigation.map((item) => {
            const active =
              activeSection === item.id;

            const disabled =
  item.id === "webhooks";

            return (
              <button
                key={item.id}
                type="button"
                disabled={disabled}
                onClick={() =>
                  handleNavigation(item.id)
                }
                style={{
                  width: "100%",
                  border: active
                    ? `1px solid ${
                        darkMode
                          ? "#263a59"
                          : "#dbeafe"
                      }`
                    : "1px solid transparent",
                  borderRadius: "9px",
                  padding: "11px 12px",
                  background: active
                    ? theme.active
                    : "transparent",
                  color: active
                    ? theme.primary
                    : disabled
                    ? theme.muted
                    : theme.muted,
                  cursor: disabled
                    ? "default"
                    : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  textAlign: "left",
                  fontSize: "14px",
                  fontWeight: active
                    ? "650"
                    : "500",
                  opacity: disabled ? 0.48 : 1,
                  transition:
                    "background 0.15s ease, border 0.15s ease, color 0.15s ease"
                }}
              >
                <span
                  style={{
                    width: "22px",
                    height: "22px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "6px",
                    background: active
                      ? darkMode
                        ? "#203554"
                        : "#dbeafe"
                      : "transparent",
                    fontSize: "16px"
                  }}
                >
                  {item.icon}
                </span>

                <span>{item.label}</span>

                {disabled && (
                  <span
                    style={{
                      marginLeft: "auto",
                      fontSize: "8px",
                      fontWeight: "700",
                      textTransform: "uppercase",
                      letterSpacing: "0.7px",
                      color: theme.muted
                    }}
                  >
                    Soon
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div
          style={{
            marginTop: "auto"
          }}
        >
          <div
            style={{
              borderTop: `1px solid ${theme.border}`,
              paddingTop: "16px"
            }}
          >
            <button
              type="button"
              onClick={() =>
                setDarkMode(
                  (current) => !current
                )
              }
              style={{
                width: "100%",
                border: `1px solid ${theme.border}`,
                background: theme.surface,
                color: theme.text,
                borderRadius: "9px",
                padding: "10px 12px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: "12px",
                fontWeight: "500"
              }}
            >
              <span>
                {darkMode
                  ? "☀️ Light mode"
                  : "🌙 Dark mode"}
              </span>

              <span
                style={{
                  color: theme.muted,
                  fontSize: "11px"
                }}
              >
                {darkMode ? "On" : "Off"}
              </span>
            </button>
          </div>
        </div>
      </aside>

      <div
        style={{
          marginLeft: isMobile ? 0 : "240px",
          minHeight: "100vh",
          paddingBottom: isMobile ? "64px" : 0
        }}
      >
        <header
          style={{
            minHeight: "72px",
            background: theme.surface,
            borderBottom: `1px solid ${theme.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
            padding: isMobile ? "10px 14px" : "0 30px",
            boxSizing: "border-box",
            position: "sticky",
            top: 0,
            zIndex: 100
          }}
        >
          <div style={{ minWidth: 0, flexShrink: 1 }}>
            <div
              style={{
                fontSize: isMobile ? "15px" : "18px",
                fontWeight: "700",
                letterSpacing: "-0.3px",
                color: theme.text
              }}
            >
              {activeLabel}
            </div>

            <div
              style={{
                marginTop: "2px",
                fontSize: "11px",
                color: theme.muted
              }}
            >
              Manage your payments and invoices
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              flexShrink: 0
            }}
          >
            <WalletButton
              onAuthenticated={setMerchant}
              isMobile={isMobile}
              darkMode={darkMode}
            />
          </div>
        </header>

        <div
          style={{
            maxWidth: "1240px",
            margin: "0 auto",
            padding: isMobile ? "16px 12px 24px" : "28px 30px 48px",
            boxSizing: "border-box"
          }}
        >
          {renderSection()}
        </div>

        {isMobile && (
          <nav
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              height: "60px",
              background: theme.sidebar,
              borderTop: `1px solid ${theme.border}`,
              display: "flex",
              zIndex: 200
            }}
          >
            {navigation.map((item) => {
              const active = activeSection === item.id;
              const disabled = item.id === "webhooks";

              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleNavigation(item.id)}
                  style={{
                    flex: 1,
                    border: "none",
                    background: "transparent",
                    color: active ? theme.primary : theme.muted,
                    opacity: disabled ? 0.4 : 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "2px",
                    fontSize: "9px",
                    fontWeight: active ? "700" : "500"
                  }}
                >
                  <span style={{ fontSize: "17px" }}>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        )}
      </div>
    </main>
  );
}
