import { ThemeScope } from "./ui.jsx";

const CSS = `
.pq-page{color:var(--pq-text)}
.pq-page *{box-sizing:border-box}
.pq-head{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap;margin-bottom:20px}
.pq-h1{margin:0;font-size:26px;line-height:1.2;letter-spacing:-.6px;font-weight:750}
.pq-sub{margin:6px 0 0;color:var(--pq-muted);font-size:14px;line-height:1.5}
.pq-h2{margin:0;font-size:18px;font-weight:700;letter-spacing:-.2px}
.pq-panel{background:var(--pq-surface);border:1px solid var(--pq-border);border-radius:16px;padding:20px;margin-bottom:20px}

.pq-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin-bottom:20px}
.pq-stat{background:var(--pq-surface);border:1px solid var(--pq-border);border-radius:14px;padding:16px}
.pq-stat span{display:block;font-size:13px;color:var(--pq-muted)}
.pq-stat b{display:block;margin-top:6px;font-size:24px;letter-spacing:-.5px;font-variant-numeric:tabular-nums}
.pq-stat small{display:block;margin-top:2px;font-size:12px;color:var(--pq-muted)}

.pq-form-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px}
.pq-field{display:grid;gap:6px;font-size:13px;font-weight:600;align-content:start}
.pq-field small{font-weight:400;color:var(--pq-muted);font-size:12px;line-height:1.4}
.pq-input{width:100%;min-height:46px;border:1px solid var(--pq-border);border-radius:10px;padding:0 12px;background:var(--pq-surface);color:var(--pq-text);font:inherit;font-size:16px;font-weight:400}
textarea.pq-input{padding:12px;min-height:90px;resize:vertical;line-height:1.5}
.pq-input:focus-visible{outline:3px solid var(--pq-focus);outline-offset:1px;border-color:var(--pq-primary)}
.pq-input::placeholder{color:var(--pq-muted);opacity:.7}
.pq-unit{display:flex;align-items:stretch}
.pq-unit .pq-input{border-top-right-radius:0;border-bottom-right-radius:0;min-width:0}
.pq-unit span{display:grid;place-items:center;padding:0 14px;border:1px solid var(--pq-border);border-left:0;border-radius:0 10px 10px 0;background:var(--pq-sunken);color:var(--pq-muted);font-size:13px;font-weight:700}

.pq-seg{display:flex;gap:4px;overflow-x:auto;padding:4px;background:var(--pq-sunken);border-radius:12px}
.pq-seg button{flex:none;border:0;border-radius:9px;min-height:38px;padding:0 12px;background:transparent;color:var(--pq-muted);font:inherit;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap}
.pq-seg button[aria-pressed="true"]{background:var(--pq-surface);color:var(--pq-text);box-shadow:0 1px 2px rgba(0,0,0,.14)}
.pq-seg button:focus-visible{outline:3px solid var(--pq-focus);outline-offset:1px}

.pq-toolbar{display:grid;gap:10px;margin-bottom:14px}
@media (min-width:720px){.pq-toolbar{grid-template-columns:1fr minmax(220px,320px);align-items:center}}

.pq-empty{text-align:center;padding:44px 20px;background:var(--pq-surface);border:1px solid var(--pq-border);border-radius:16px}
.pq-empty h3{margin:0 0 6px;font-size:17px}
.pq-empty p{margin:0 auto;max-width:360px;color:var(--pq-muted);font-size:14px;line-height:1.5}
.pq-empty .pq-stack{justify-items:center}

.pq-list{display:grid;gap:10px}
.pq-item{background:var(--pq-surface);border:1px solid var(--pq-border);border-radius:14px;overflow:hidden}
.pq-item-head{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px 12px;align-items:center;width:100%;padding:14px 16px;border:0;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}
.pq-item-head:hover{background:var(--pq-sunken)}
.pq-item-head:focus-visible{outline:3px solid var(--pq-focus);outline-offset:-3px}
.pq-item-title{font-weight:700;font-size:15px;overflow-wrap:anywhere}
.pq-item-meta{color:var(--pq-muted);font-size:13px;overflow-wrap:anywhere}
.pq-item-amt{font-weight:750;font-size:16px;text-align:right;font-variant-numeric:tabular-nums}
.pq-item-body{border-top:1px solid var(--pq-border);padding:16px;display:grid;gap:16px}
.pq-kv{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;margin:0}
.pq-kv dt{font-size:12px;color:var(--pq-muted)}
.pq-kv dd{margin:2px 0 0;font-size:14px;font-weight:600;overflow-wrap:anywhere}
.pq-linkbox{background:var(--pq-sunken);border-radius:10px;padding:10px 12px;font-size:13px;overflow-wrap:anywhere}
.pq-linkbox small{display:block;color:var(--pq-muted);margin-bottom:2px;font-size:12px}
.pq-actions{display:flex;gap:8px;flex-wrap:wrap}
.pq-actions a.pq-btn{text-decoration:none}
.pq-qr{display:grid;justify-items:center;gap:10px;padding:6px 0}
.pq-qr-box{background:#fff;padding:14px;border-radius:12px;border:1px solid var(--pq-border);line-height:0}
@media (max-width:520px){.pq-h1{font-size:22px}.pq-panel{padding:16px}}
`;

export function PageScope({ dark = false, children }) {
  return (
    <ThemeScope dark={dark} bare>
      <style>{CSS}</style>
      <div className="pq-page">{children}</div>
    </ThemeScope>
  );
}

export function Field({ label, hint, children }) {
  return (
    <label className="pq-field">
      {label}
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function Segmented({ label, options, value, onChange }) {
  return (
    <div className="pq-seg" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
          {typeof option.count === "number" ? ` (${option.count})` : ""}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({ title, text, children }) {
  return (
    <div className="pq-empty">
      <h3>{title}</h3>
      <p>{text}</p>
      {children && <div className="pq-stack">{children}</div>}
    </div>
  );
}
