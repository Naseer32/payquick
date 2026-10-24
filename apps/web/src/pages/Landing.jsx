import { ThemeScope } from "../components/ui.jsx";

const ICONS = {
  invoice: (
    <>
      <path d="M6 3h8l5 5v13H6z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h7M9 17h7" />
    </>
  ),
  link: (
    <>
      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
      <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
    </>
  ),
  pulse: <path d="M3 12h4l3-8 4 16 3-8h4" />,
  check: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l3 3 5-6" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M17 14c2.5 0 4.5 1.8 4.5 4.5" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20h16" />
      <path d="M7 20v-7M12 20V6M17 20v-10" />
    </>
  ),
  bolt: <path d="M13 2L4 14h7l-1 8 9-12h-7z" />,
  dollar: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M14.5 9.2c-.5-1-1.5-1.5-2.7-1.5-1.5 0-2.6.8-2.6 2 0 3 5.6 1.6 5.6 4.5 0 1.2-1.2 2-2.7 2-1.3 0-2.4-.6-2.9-1.7" />
      <path d="M12 6v1.7M12 16.3V18" />
    </>
  ),
  code: <path d="M8 8l-4 4 4 4M16 8l4 4-4 4" />,
  layers: (
    <>
      <path d="M12 3l9 5-9 5-9-5z" />
      <path d="M3 13l9 5 9-5" />
    </>
  ),
  moon: <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  )
};

function Ico({ name, size = 22 }) {
  return (
    <svg
      width={size}
      height={size}
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

const CSS = `
.pq-l{overflow-x:hidden}
.pq-l *{box-sizing:border-box}
.pq-l-wrap{max-width:1180px;margin:0 auto;padding:0 20px}
.pq-l section[id]{scroll-margin-top:76px}

.pq-l-head{position:sticky;top:0;z-index:50;background:var(--pq-bg);background:color-mix(in srgb,var(--pq-bg) 92%,transparent);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);border-bottom:1px solid var(--pq-border);padding-top:env(safe-area-inset-top,0px)}
.pq-l-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:64px}
.pq-l-brand{display:flex;align-items:center;gap:10px;border:0;background:transparent;color:inherit;font:inherit;font-size:20px;font-weight:800;letter-spacing:-.4px;cursor:pointer;padding:0;border-radius:8px}
.pq-l-nav{display:flex;align-items:center;gap:4px}
.pq-l-link{border:0;background:transparent;color:var(--pq-muted);font:inherit;font-size:14px;font-weight:600;padding:0 10px;min-height:44px;border-radius:8px;cursor:pointer;white-space:nowrap}
.pq-l-link:hover{color:var(--pq-text)}
.pq-l-icon{display:grid;place-items:center;width:44px;height:44px;border:0;background:transparent;color:var(--pq-muted);border-radius:10px;cursor:pointer}
.pq-l-icon:hover{background:var(--pq-sunken);color:var(--pq-text)}
.pq-l-brand:focus-visible,.pq-l-link:focus-visible,.pq-l-icon:focus-visible,.pq-l a:focus-visible{outline:3px solid var(--pq-focus);outline-offset:2px}
.pq-l-sections{display:contents}
@media (max-width:700px){.pq-l-sections{display:none}}

.pq-l-hero{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:48px;align-items:center;padding:clamp(44px,8vw,88px) 0 72px}
.pq-l-pill{display:inline-flex;align-items:center;gap:8px;padding:6px 12px;border-radius:999px;background:var(--pq-infoBg);color:var(--pq-info);font-size:13px;font-weight:700;margin-bottom:20px}
.pq-l h1{margin:0;max-width:720px;font-size:clamp(38px,7vw,70px);line-height:1;letter-spacing:-.04em}
.pq-l-lead{max-width:600px;margin:22px 0 0;color:var(--pq-muted);font-size:18px;line-height:1.65}
.pq-l-cta{display:flex;gap:12px;flex-wrap:wrap;margin-top:28px}
.pq-l-note{margin:16px 0 0;color:var(--pq-muted);font-size:13px}
.pq-l-sample{width:100%;max-width:440px;justify-self:center}
.pq-l-tag{display:block;margin:0 0 10px;color:var(--pq-muted);font-size:12px;font-weight:650;text-align:center}

.pq-l-section{padding:72px 0}
.pq-l-alt{background:var(--pq-sunken);border-block:1px solid var(--pq-border)}
.pq-l-band{background:#0F1A2B;color:#F1F5FA;border-block:1px solid var(--pq-border)}
.pq-l-eyebrow{margin:0;color:var(--pq-primary);font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}
.pq-l-band .pq-l-eyebrow{color:#8CB0FF}
.pq-l h2{max-width:720px;margin:12px 0 0;font-size:clamp(28px,5vw,46px);line-height:1.08;letter-spacing:-.03em}
.pq-l-grid{display:grid;gap:16px;margin-top:36px;grid-template-columns:repeat(auto-fit,minmax(min(100%,250px),1fr))}
.pq-l-item{background:var(--pq-surface);border:1px solid var(--pq-border);border-radius:16px;padding:22px}
.pq-l-item h3{margin:16px 0 8px;font-size:18px;letter-spacing:-.2px}
.pq-l-item p{margin:0;color:var(--pq-muted);line-height:1.6;font-size:15px}
.pq-l-ico{width:42px;height:42px;border-radius:12px;background:var(--pq-infoBg);color:var(--pq-info);display:grid;place-items:center}
.pq-l-num{width:42px;height:42px;border-radius:50%;background:var(--pq-text);color:var(--pq-bg);display:grid;place-items:center;font-weight:800}
.pq-l-band .pq-l-item{background:transparent;border-color:#334155}
.pq-l-band .pq-l-item p{color:#A6B3C5}
.pq-l-idx{color:#8D99AA;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px}
.pq-l-band .pq-l-item h3{margin-top:24px}

.pq-l-box{background:#0F1A2B;color:#F1F5FA;border-radius:24px;padding:clamp(36px,7vw,56px) 24px;text-align:center;border:1px solid var(--pq-border)}
.pq-l-box h2{margin:0 auto;font-size:clamp(28px,6vw,44px)}
.pq-l-box p{max-width:560px;margin:16px auto 26px;color:#A6B3C5;line-height:1.6}
.pq-l-white{background:#fff;color:#0F1A2B}
.pq-l-white:hover:not(:disabled){background:#E8EEFF}

.pq-l-foot{border-top:1px solid var(--pq-border);padding:28px 0 36px;color:var(--pq-muted);font-size:14px}
.pq-l-foot .pq-l-wrap{display:flex;justify-content:space-between;align-items:center;gap:20px;flex-wrap:wrap}
.pq-l-foot strong{display:block;color:var(--pq-text);font-size:18px;margin-bottom:4px}
.pq-l-social{display:flex;align-items:center;gap:18px;flex-wrap:wrap}
.pq-l-social a{color:var(--pq-text);font-weight:600;text-decoration:none}
.pq-l-social a:hover{text-decoration:underline;text-underline-offset:3px}
`;

function Card({ icon, title, text }) {
  return (
    <div className="pq-l-item">
      <div className="pq-l-ico">
        <Ico name={icon} />
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

export default function Landing({
  onGetStarted,
  darkMode = false,
  onToggleTheme
}) {
  function scrollTo(id) {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    document.getElementById(id)?.scrollIntoView({
      behavior: reduce ? "auto" : "smooth"
    });
  }

  function scrollTop() {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }

  return (
    <ThemeScope dark={darkMode}>
      <style>{CSS}</style>

      <div className="pq-l">
        <header className="pq-l-head">
          <div className="pq-l-wrap pq-l-bar">
            <button type="button" className="pq-l-brand" onClick={scrollTop}>
              <span className="pq-mark" aria-hidden="true">P</span>
              PayQuick
            </button>

            <nav className="pq-l-nav" aria-label="Page sections">
              <span className="pq-l-sections">
                <button type="button" className="pq-l-link" onClick={() => scrollTo("features")}>
                  Features
                </button>
                <button type="button" className="pq-l-link" onClick={() => scrollTo("how-it-works")}>
                  How it works
                </button>
                <button type="button" className="pq-l-link" onClick={() => scrollTo("why-arc")}>
                  Why Arc
                </button>
              </span>

              {onToggleTheme && (
                <button
                  type="button"
                  className="pq-l-icon"
                  onClick={onToggleTheme}
                  aria-label={darkMode ? "Switch to light theme" : "Switch to dark theme"}
                >
                  <Ico name={darkMode ? "sun" : "moon"} size={20} />
                </button>
              )}

              <button type="button" className="pq-btn pq-primary pq-sm" onClick={onGetStarted}>
                Get started
              </button>
            </nav>
          </div>
        </header>

        <main>
          <div className="pq-l-wrap">
            <section className="pq-l-hero" aria-labelledby="hero-title">
              <div>
                <span className="pq-l-pill">Built on Arc</span>

                <h1 id="hero-title">Stablecoin payments made simple.</h1>

                <p className="pq-l-lead">
                  PayQuick gives merchants a simple way to receive stablecoin payments,
                  create invoices, send payment links, and track confirmed transactions
                  from one place.
                </p>

                <div className="pq-l-cta">
                  <button type="button" className="pq-btn pq-primary pq-md" onClick={onGetStarted}>
                    Start accepting payments
                  </button>
                  <button
                    type="button"
                    className="pq-btn pq-secondary pq-md"
                    onClick={() => scrollTo("how-it-works")}
                  >
                    See how it works
                  </button>
                </div>

                <p className="pq-l-note">Currently running on Arc Testnet. Test USDC has no real-world value.</p>
              </div>

              <div className="pq-l-sample">
                <span className="pq-l-tag">Sample checkout · illustration, not live data</span>

                <div className="pq-card" aria-hidden="true">
                  <p className="pq-merchant">Pay Example Store</p>
                  <p className="pq-amount pq-num">
                    25.00<span className="pq-cur">USDC</span>
                  </p>

                  <dl className="pq-rows">
                    <div className="pq-row">
                      <dt>Invoice</dt>
                      <dd className="pq-num">INV-0001</dd>
                    </div>
                    <div className="pq-row">
                      <dt>For</dt>
                      <dd>Website design</dd>
                    </div>
                    <div className="pq-row">
                      <dt>Status</dt>
                      <dd>
                        <span className="pq-badge pq-b-warning">Awaiting payment</span>
                      </dd>
                    </div>
                  </dl>

                  <ol className="pq-steps">
                    <li className="pq-step" data-state="done">
                      <span className="pq-dot">✓</span>Approve in your wallet
                    </li>
                    <li className="pq-step" data-state="active">
                      <span className="pq-dot" />Confirm on Arc
                    </li>
                    <li className="pq-step" data-state="todo">
                      <span className="pq-dot" />Merchant notified
                    </li>
                  </ol>
                </div>
              </div>
            </section>
          </div>

          <section className="pq-l-section pq-l-band" aria-labelledby="problem-title">
            <div className="pq-l-wrap">
              <p className="pq-l-eyebrow">The problem</p>
              <h2 id="problem-title">Crypto payments should not feel complicated.</h2>

              <div className="pq-l-grid">
                <div className="pq-l-item">
                  <span className="pq-l-idx">01</span>
                  <h3>Wrong address</h3>
                  <p>Typing or copying a long wallet address creates unnecessary risk.</p>
                </div>
                <div className="pq-l-item">
                  <span className="pq-l-idx">02</span>
                  <h3>Wrong amount</h3>
                  <p>Customers should know exactly what they are being asked to pay.</p>
                </div>
                <div className="pq-l-item">
                  <span className="pq-l-idx">03</span>
                  <h3>No clear proof</h3>
                  <p>A payment should have a verifiable transaction record.</p>
                </div>
              </div>
            </div>
          </section>

          <section id="features" className="pq-l-section" aria-labelledby="features-title">
            <div className="pq-l-wrap">
              <p className="pq-l-eyebrow">What PayQuick does</p>
              <h2 id="features-title">Everything a merchant needs to handle stablecoin payments.</h2>

              <div className="pq-l-grid">
                <Card
                  icon="invoice"
                  title="Create invoices"
                  text="Set the amount, customer, description and due date, and get a checkout page for each invoice."
                />
                <Card
                  icon="link"
                  title="Payment links and QR codes"
                  text="Share a link or let customers scan a QR code to open the exact payment you asked for."
                />
                <Card
                  icon="pulse"
                  title="Live payment status"
                  text="Follow each payment from wallet approval to confirmation on Arc."
                />
                <Card
                  icon="check"
                  title="Receipts"
                  text="Every confirmed payment keeps its transaction hash, with a link to view it on the block explorer."
                />
                <Card
                  icon="users"
                  title="Customer records"
                  text="Keep customers connected to their invoices and see what each one has paid."
                />
                <Card
                  icon="chart"
                  title="Dashboard and export"
                  text="See what you've received and what's still waiting, and export payments as a CSV."
                />
              </div>
            </div>
          </section>

          <section id="how-it-works" className="pq-l-section pq-l-alt" aria-labelledby="how-title">
            <div className="pq-l-wrap">
              <p className="pq-l-eyebrow">How it works</p>
              <h2 id="how-title">From payment request to confirmation.</h2>

              <div className="pq-l-grid">
                <div className="pq-l-item">
                  <div className="pq-l-num">1</div>
                  <h3>Create</h3>
                  <p>The merchant creates an invoice or payment request.</p>
                </div>
                <div className="pq-l-item">
                  <div className="pq-l-num">2</div>
                  <h3>Pay</h3>
                  <p>The customer opens the payment page and completes the payment from their wallet.</p>
                </div>
                <div className="pq-l-item">
                  <div className="pq-l-num">3</div>
                  <h3>Confirm</h3>
                  <p>PayQuick tracks the transaction and updates the payment status.</p>
                </div>
              </div>
            </div>
          </section>

          <section id="why-arc" className="pq-l-section" aria-labelledby="arc-title">
            <div className="pq-l-wrap">
              <p className="pq-l-eyebrow">Why Arc</p>
              <h2 id="arc-title">Built for stablecoin-native payments.</h2>

              <div className="pq-l-grid">
                <Card icon="dollar" title="USDC as gas" text="Arc uses USDC as its native gas currency." />
                <Card
                  icon="bolt"
                  title="Fast finality"
                  text="Transactions are designed to confirm quickly and deterministically."
                />
                <Card
                  icon="code"
                  title="EVM compatible"
                  text="PayQuick can use familiar Ethereum tooling and wallet infrastructure."
                />
                <Card
                  icon="layers"
                  title="Stablecoin focused"
                  text="The architecture is designed around stablecoin payments."
                />
              </div>
            </div>
          </section>

          <div className="pq-l-wrap" style={{ paddingBottom: 72 }}>
            <section className="pq-l-box" aria-labelledby="cta-title">
              <h2 id="cta-title">Ready to accept stablecoin payments?</h2>
              <p>Connect your wallet and open the PayQuick merchant dashboard.</p>
              <button type="button" className="pq-btn pq-l-white pq-md" onClick={onGetStarted}>
                Get started
              </button>
            </section>
          </div>
        </main>

        <footer className="pq-l-foot">
          <div className="pq-l-wrap">
            <div>
              <strong>PayQuick</strong>
              <span>A stablecoin payment platform on Arc.</span>
            </div>

            <div className="pq-l-social">
              <a href="https://x.com/nass_web3" target="_blank" rel="noopener noreferrer">
                X: @nass_web3
              </a>
              <a href="https://github.com/Naseer32" target="_blank" rel="noopener noreferrer">
                GitHub: Naseer32
              </a>
              <span>Discord: nassuba</span>
            </div>
          </div>
        </footer>
      </div>
    </ThemeScope>
  );
}
