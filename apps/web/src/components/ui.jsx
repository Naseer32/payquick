import { useState } from "react";
import { getTheme } from "../theme.js";
import { IS_MAINNET } from "../services/blockchain.js";

const EXPLORER = IS_MAINNET
  ? "https://explorer.arc.io"
  : "https://explorer.testnet.arc.io";

export const shortAddress = (a = "") =>
  a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "";
export const txUrl = (hash) => `${EXPLORER}/tx/${hash}`;
export const addressUrl = (addr) => `${EXPLORER}/address/${addr}`;

export function formatAmount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value ?? "");
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6
  });
}

// Turns wallet / ethers / API errors into one clear sentence the person can act on.
export function friendlyError(err) {
  const code = err?.code ?? err?.info?.error?.code;
  const msg = String(err?.shortMessage || err?.message || "");

  if (code === 4001 || code === "ACTION_REJECTED" || /user rejected|user denied/i.test(msg)) {
    return "You cancelled the request in your wallet. Nothing was sent.";
  }
  if (code === -32002) {
    return "Your wallet already has a pending request. Open your wallet and respond to it.";
  }
  if (/insufficient funds/i.test(msg)) {
    return "Your wallet doesn't have enough USDC to cover this payment plus the network fee.";
  }
  if (!msg) return "Something went wrong. Please try again.";
  return msg.length > 200 ? `${msg.slice(0, 200)}…` : msg;
}

const CSS = `
.pq-root{min-height:100vh;background:var(--pq-bg);color:var(--pq-text);font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;-webkit-font-smoothing:antialiased}
.pq-scope{display:contents}
.pq-root *,.pq-scope *{box-sizing:border-box}
.pq-num{font-variant-numeric:tabular-nums}

.pq-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:1px solid transparent;border-radius:10px;font:inherit;font-weight:650;cursor:pointer;white-space:nowrap;transition:background .15s,border-color .15s}
.pq-btn:active:not(:disabled){transform:translateY(1px)}
.pq-btn:disabled{opacity:.6;cursor:not-allowed}
.pq-md{min-height:46px;padding:0 18px;font-size:15px}
.pq-sm{min-height:38px;padding:0 14px;font-size:13px}
.pq-block{width:100%}
.pq-primary{background:var(--pq-primary);color:var(--pq-onPrimary)}
.pq-primary:hover:not(:disabled){background:var(--pq-primaryHover)}
.pq-secondary{background:var(--pq-surface);color:var(--pq-text);border-color:var(--pq-border)}
.pq-secondary:hover:not(:disabled){background:var(--pq-sunken)}
.pq-ghost{background:transparent;color:var(--pq-muted)}
.pq-ghost:hover:not(:disabled){background:var(--pq-sunken);color:var(--pq-text)}
.pq-btn:focus-visible,.pq-chip:focus-visible,.pq-menu button:focus-visible,.pq-menu a:focus-visible,.pq-link:focus-visible{outline:3px solid var(--pq-focus);outline-offset:2px}
.pq-link{color:var(--pq-primary);font-weight:600;text-underline-offset:3px}

.pq-spinner{width:16px;height:16px;border-radius:50%;border:2px solid currentColor;border-right-color:transparent;animation:pq-spin .7s linear infinite;flex:none}
@keyframes pq-spin{to{transform:rotate(360deg)}}
@keyframes pq-pulse{50%{opacity:.5}}
.pq-skel{border-radius:8px;background:var(--pq-sunken);animation:pq-pulse 1.4s ease-in-out infinite}
@media (prefers-reduced-motion:reduce){.pq-spinner,.pq-dot{animation-duration:2.4s!important}.pq-skel{animation:none}.pq-btn{transition:none}}

.pq-badge{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:650}
.pq-badge::before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor}
.pq-b-success{background:var(--pq-successBg);color:var(--pq-success)}
.pq-b-warning{background:var(--pq-warningBg);color:var(--pq-warning)}
.pq-b-danger{background:var(--pq-dangerBg);color:var(--pq-danger)}
.pq-b-neutral{background:var(--pq-sunken);color:var(--pq-muted)}

.pq-alert{border-radius:10px;padding:12px 14px;font-size:14px;line-height:1.5}
.pq-a-danger{background:var(--pq-dangerBg);color:var(--pq-danger)}
.pq-a-warning{background:var(--pq-warningBg);color:var(--pq-warning)}
.pq-a-info{background:var(--pq-infoBg);color:var(--pq-info)}
.pq-a-success{background:var(--pq-successBg);color:var(--pq-success)}

.pq-wrap{max-width:460px;margin:0 auto;padding:16px 16px 48px}
.pq-card{background:var(--pq-surface);border:1px solid var(--pq-border);border-radius:16px;padding:22px}
.pq-brand{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:8px 0 16px}
.pq-brand b{display:flex;align-items:center;gap:10px;font-weight:800;letter-spacing:-.3px}
.pq-mark{width:30px;height:30px;border-radius:9px;background:var(--pq-primary);color:var(--pq-onPrimary);display:grid;place-items:center;font-weight:800}
.pq-merchant{margin:0;font-size:14px;color:var(--pq-muted)}
.pq-amount{margin:6px 0 0;font-size:44px;line-height:1.05;font-weight:750;letter-spacing:-1.2px;overflow-wrap:anywhere}
.pq-cur{font-size:18px;font-weight:650;color:var(--pq-muted);margin-left:8px;letter-spacing:0}
.pq-rows{margin:18px 0 0;padding:0}
.pq-row{display:flex;justify-content:space-between;gap:16px;padding:11px 0;border-top:1px solid var(--pq-border);font-size:14px}
.pq-row dt{color:var(--pq-muted);flex:none}
.pq-row dd{margin:0;text-align:right;overflow-wrap:anywhere;font-weight:550}
.pq-steps{list-style:none;margin:18px 0 0;padding:14px;background:var(--pq-sunken);border-radius:12px;display:grid;gap:12px}
.pq-step{display:flex;align-items:center;gap:10px;font-size:14px;color:var(--pq-muted)}
.pq-dot{width:22px;height:22px;border-radius:50%;border:2px solid var(--pq-border);display:grid;place-items:center;font-size:12px;font-weight:800;flex:none}
.pq-step[data-state="done"]{color:var(--pq-text)}
.pq-step[data-state="done"] .pq-dot{background:var(--pq-success);border-color:var(--pq-success);color:var(--pq-surface)}
.pq-step[data-state="active"]{color:var(--pq-text);font-weight:600}
.pq-step[data-state="active"] .pq-dot{border-color:var(--pq-primary);border-top-color:transparent;animation:pq-spin .8s linear infinite}
.pq-stack{display:grid;gap:12px;margin-top:18px}
.pq-note{margin:14px 0 0;font-size:12px;color:var(--pq-muted);text-align:center;line-height:1.5}
.pq-check{width:56px;height:56px;border-radius:50%;background:var(--pq-successBg);color:var(--pq-success);display:grid;place-items:center;margin:0 0 14px}

.pq-wallet{position:relative}
.pq-chip{display:inline-flex;align-items:center;gap:8px;min-height:40px;padding:0 12px;border:1px solid var(--pq-border);background:var(--pq-surface);color:var(--pq-text);border-radius:10px;font:inherit;font-size:13px;font-weight:600;cursor:pointer}
.pq-chip i{width:8px;height:8px;border-radius:50%;background:var(--pq-success)}
.pq-pop{position:absolute;right:0;top:calc(100% + 8px);width:264px;max-width:calc(100vw - 24px);background:var(--pq-surface);color:var(--pq-text);border:1px solid var(--pq-border);border-radius:12px;padding:8px;box-shadow:0 12px 32px rgba(0,0,0,.18);z-index:300;font-size:14px}
.pq-menu{display:grid;gap:2px}
.pq-menu button,.pq-menu a{display:flex;align-items:center;min-height:42px;padding:0 10px;border:0;border-radius:8px;background:transparent;color:inherit;font:inherit;text-align:left;text-decoration:none;cursor:pointer}
.pq-menu button:hover,.pq-menu a:hover{background:var(--pq-sunken)}
.pq-menu .pq-danger{color:var(--pq-danger)}

@media print{.pq-noprint{display:none!important}.pq-card{border:0}}
`;

export function ThemeScope({ dark = false, bare = false, children }) {
  const vars = {};
  Object.entries(getTheme(dark)).forEach(([key, value]) => {
    vars[`--pq-${key}`] = value;
  });

  return (
    <div className={bare ? "pq-scope" : "pq-root"} style={vars}>
      <style>{CSS}</style>
      {children}
    </div>
  );
}

export function Spinner() {
  return <span className="pq-spinner" aria-hidden="true" />;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  block = false,
  disabled,
  className = "",
  children,
  ...rest
}) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`pq-btn pq-${variant} pq-${size}${block ? " pq-block" : ""} ${className}`}
    >
      {loading && <Spinner />}
      <span>{children}</span>
    </button>
  );
}

const STATUS = {
  paid: ["success", "Paid"],
  confirmed: ["success", "Paid"],
  pending: ["warning", "Awaiting payment"],
  expired: ["danger", "Expired"],
  failed: ["danger", "Failed"]
};

export function StatusBadge({ status }) {
  const key = String(status || "").toLowerCase();
  const [tone, label] = STATUS[key] || [
    "neutral",
    key ? key.charAt(0).toUpperCase() + key.slice(1) : "Unknown"
  ];
  return <span className={`pq-badge pq-b-${tone}`}>{label}</span>;
}

export function Alert({ tone = "info", children, ...rest }) {
  return (
    <div
      className={`pq-alert pq-a-${tone}`}
      role={tone === "danger" ? "alert" : "status"}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CopyButton({ value, label = "Copy", variant = "secondary", size = "sm", block = false }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const el = document.createElement("textarea");
      el.value = value;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <Button variant={variant} size={size} block={block} onClick={copy}>
      <span aria-live="polite">{copied ? "Copied" : label}</span>
    </Button>
  );
}
