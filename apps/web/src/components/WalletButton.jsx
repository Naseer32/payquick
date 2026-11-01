import { useEffect, useRef, useState } from "react";
import { ACTIVE_NETWORK_NAME } from "../services/blockchain.js";
import {
  authenticateWallet,
  restoreSession,
  logout
} from "../services/auth.js";
import {
  ThemeScope,
  Button,
  CopyButton,
  shortAddress,
  addressUrl,
  friendlyError
} from "./ui.jsx";

export default function WalletButton({
  onAuthenticated,
  isMobile = false,
  darkMode = false
}) {
  const [account, setAccount] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    async function restore() {
      if (!localStorage.getItem("payquick_session")) {
        return;
      }

      setLoading(true);

      try {
        const result = await restoreSession();

        if (!mounted || !result) return;

        setAccount(result.walletAddress);
        onAuthenticated?.(result.merchant);
      } catch (err) {
        if (mounted) setError(friendlyError(err));
      } finally {
        if (mounted) setLoading(false);
      }
    }

    restore();

    return () => {
      mounted = false;
    };
  }, [onAuthenticated]);

  useEffect(() => {
    if (!open && !error) return;

    function onPointerDown(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
        setError("");
      }
    }

    function onKeyDown(event) {
      if (event.key === "Escape") {
        setOpen(false);
        setError("");
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, error]);

  async function handleConnect() {
    setError("");
    setLoading(true);

    try {
      const result = await authenticateWallet();

      setAccount(result.walletAddress);
      onAuthenticated?.(result.merchant);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    logout();
    setAccount("");
    setOpen(false);
    onAuthenticated?.(null);
  }

  return (
    <ThemeScope dark={darkMode} bare>
      <div className="pq-wallet" ref={rootRef}>
        {account ? (
          <button
            type="button"
            className="pq-chip"
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            <i aria-hidden="true" />
            <span className="pq-num">{shortAddress(account)}</span>
          </button>
        ) : (
          <Button size="sm" loading={loading} onClick={handleConnect}>
            {loading ? "Connecting…" : isMobile ? "Connect" : "Connect wallet"}
          </Button>
        )}

        {open && account && (
          <div className="pq-pop">
            <div className="pq-menu" role="menu">
              <div style={{ padding: "6px 10px 8px" }}>
                <div style={{ fontSize: 12, color: "var(--pq-muted)" }}>
                  Connected to {ACTIVE_NETWORK_NAME}
                </div>
                <div
                  className="pq-num"
                  style={{ fontSize: 13, overflowWrap: "anywhere", marginTop: 2 }}
                >
                  {account}
                </div>
              </div>

              <div style={{ padding: "0 4px 6px" }}>
                <CopyButton value={account} label="Copy address" block />
              </div>

              <a
                role="menuitem"
                href={addressUrl(account)}
                target="_blank"
                rel="noopener noreferrer"
              >
                View on Arcscan
              </a>

              <button
                type="button"
                role="menuitem"
                className="pq-danger"
                onClick={handleLogout}
              >
                Disconnect
              </button>
            </div>
          </div>
        )}

        {error && !open && (
          <div className="pq-pop" role="alert">
            <p style={{ margin: "6px 8px 10px", color: "var(--pq-danger)", lineHeight: 1.45 }}>
              {error}
            </p>
            <Button variant="secondary" size="sm" block onClick={handleConnect} loading={loading}>
              Try again
            </Button>
          </div>
        )}
      </div>
    </ThemeScope>
  );
}
