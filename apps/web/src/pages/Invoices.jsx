import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { apiRequest } from "../services/api.js";
import {
  Button,
  Alert,
  StatusBadge,
  CopyButton,
  formatAmount,
  friendlyError
} from "../components/ui.jsx";
import {
  PageScope,
  Field,
  Segmented,
  EmptyState
} from "../components/forms.jsx";

const PAID = ["paid", "confirmed"];
const PENDING = ["pending", "processing"];

function bucket(status) {
  const value = String(status || "").toLowerCase();
  if (PAID.includes(value)) return "paid";
  if (PENDING.includes(value)) return "pending";
  return "closed";
}

function nextInvoiceNumber(invoices) {
  let max = 0;
  let width = 4;

  for (const invoice of invoices) {
    const match = /^INV-(\d+)$/i.exec(String(invoice.invoice_number || ""));

    if (match) {
      max = Math.max(max, Number(match[1]));
      width = Math.max(width, match[1].length);
    }
  }

  return `INV-${String(max + 1).padStart(width, "0")}`;
}

function formatDate(value) {
  if (!value) return "Not set";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not set";

  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function checkoutUrlFor(invoice) {
  return `${window.location.origin}/pay/${encodeURIComponent(invoice.checkout_token)}`;
}

export default function Invoices({ merchant, darkMode = false }) {
  const requestId = useRef(0);

  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState("");
  const [customerError, setCustomerError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");

  const [customerId, setCustomerId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState("");

  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState(null);
  const [qrId, setQrId] = useState(null);

  const loadInvoices = useCallback(async (silent = false) => {
    const id = ++requestId.current;

    if (!silent) setLoading(true);
    setListError("");

    try {
      const result = await apiRequest("/api/invoices");

      if (id === requestId.current) {
        setInvoices(result.invoices || []);
      }
    } catch (err) {
      if (id === requestId.current && !silent) {
        setListError(friendlyError(err));
      }
    } finally {
      if (id === requestId.current && !silent) {
        setLoading(false);
      }
    }
  }, []);

  const loadCustomers = useCallback(async () => {
    setCustomerError("");

    try {
      const result = await apiRequest("/api/customers");
      setCustomers(result.customers || []);
    } catch (err) {
      setCustomerError(friendlyError(err));
    }
  }, []);

  useEffect(() => {
    if (!merchant) {
      setInvoices([]);
      setCustomers([]);
      return;
    }

    loadInvoices();
    loadCustomers();
  }, [merchant, loadInvoices, loadCustomers]);

  useEffect(() => {
    if (!merchant) return;

    function onVisible() {
      if (document.visibilityState === "visible") {
        loadInvoices(true);
        loadCustomers();
      }
    }

    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [merchant, loadInvoices, loadCustomers]);

  // Keeps awaiting invoices fresh so a payment shows up without a manual refresh.
  const hasPending = invoices.some((invoice) => bucket(invoice.status) === "pending");

  useEffect(() => {
    if (!merchant || !hasPending) return;

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") loadInvoices(true);
    }, 15000);

    return () => clearInterval(interval);
  }, [merchant, hasPending, loadInvoices]);

  const stats = useMemo(() => {
    let collected = 0;
    let outstanding = 0;
    const counts = { all: invoices.length, pending: 0, paid: 0, closed: 0 };

    for (const invoice of invoices) {
      const kind = bucket(invoice.status);
      counts[kind] += 1;

      if (kind === "paid") collected += Number(invoice.amount || 0);
      if (kind === "pending") outstanding += Number(invoice.amount || 0);
    }

    return { collected, outstanding, counts };
  }, [invoices]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return invoices.filter((invoice) => {
      if (filter !== "all" && bucket(invoice.status) !== filter) return false;
      if (!needle) return true;

      return [
        invoice.invoice_number,
        invoice.customer_name,
        invoice.customer_email,
        invoice.description
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });
  }, [invoices, filter, query]);

  function toggleForm() {
    setNotice("");
    setFormError("");

    if (!showForm && !invoiceNumber) {
      setInvoiceNumber(nextInvoiceNumber(invoices));
    }

    setShowForm((value) => !value);
  }

  async function handleCreate(event) {
    event.preventDefault();

    setFormError("");
    setNotice("");

    if (!(Number(amount) > 0)) {
      setFormError("Enter an amount greater than 0.");
      return;
    }

    let utcDueAt = null;

    if (dueAt) {
      const date = new Date(dueAt);

      if (Number.isNaN(date.getTime())) {
        setFormError("The due date isn't valid.");
        return;
      }

      utcDueAt = date.toISOString();
    }

    setCreating(true);

    try {
      await apiRequest("/api/invoices", {
        method: "POST",
        body: JSON.stringify({
          customerId: customerId || null,
          invoiceNumber,
          amount,
          currency: "USDC",
          description,
          dueAt: utcDueAt
        })
      });

      setNotice(`Invoice ${invoiceNumber} created.`);
      setCustomerId("");
      setInvoiceNumber("");
      setAmount("");
      setDescription("");
      setDueAt("");
      setShowForm(false);
      setFilter("all");

      await loadInvoices();
    } catch (err) {
      setFormError(friendlyError(err));
    } finally {
      setCreating(false);
    }
  }

  async function share(invoice) {
    try {
      await navigator.share({
        title: `Invoice ${invoice.invoice_number}`,
        text: `Pay ${formatAmount(invoice.amount)} ${invoice.currency || "USDC"}`,
        url: checkoutUrlFor(invoice)
      });
    } catch {
      /* cancelled by the user */
    }
  }

  if (!merchant) {
    return (
      <PageScope dark={darkMode}>
        <EmptyState
          title="Connect your wallet"
          text="Connect your wallet to create invoices and share payment links with your customers."
        />
      </PageScope>
    );
  }

  const currency = invoices[0]?.currency || "USDC";

  return (
    <PageScope dark={darkMode}>
      <div className="pq-head">
        <div>
          <h1 className="pq-h1">Invoices</h1>
          <p className="pq-sub">Create invoices and share checkout links.</p>
        </div>
        <Button onClick={toggleForm} variant={showForm ? "secondary" : "primary"}>
          {showForm ? "Close" : "New invoice"}
        </Button>
      </div>

      <div className="pq-stats">
        <div className="pq-stat">
          <span>Collected</span>
          <b>{formatAmount(stats.collected)}</b>
          <small>{currency} · {stats.counts.paid} paid</small>
        </div>
        <div className="pq-stat">
          <span>Awaiting payment</span>
          <b>{formatAmount(stats.outstanding)}</b>
          <small>{currency} · {stats.counts.pending} open</small>
        </div>
        <div className="pq-stat">
          <span>Total invoices</span>
          <b>{stats.counts.all}</b>
          <small>{stats.counts.closed} expired or failed</small>
        </div>
      </div>

      <div aria-live="polite">
        {notice && (
          <div style={{ marginBottom: 16 }}>
            <Alert tone="success">{notice}</Alert>
          </div>
        )}
      </div>

      {showForm && (
        <form className="pq-panel" onSubmit={handleCreate}>
          <h2 className="pq-h2" style={{ marginBottom: 16 }}>New invoice</h2>

          <div className="pq-form-grid">
            <Field
              label="Customer"
              hint={
                customerError
                  ? customerError
                  : customers.length === 0
                  ? "No customers yet. Add them on the Customers page."
                  : "Optional"
              }
            >
              <select
                className="pq-input"
                value={customerId}
                onChange={(event) => setCustomerId(event.target.value)}
              >
                <option value="">No customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name || customer.email || "Unnamed customer"}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Invoice number">
              <input
                className="pq-input"
                value={invoiceNumber}
                onChange={(event) => setInvoiceNumber(event.target.value)}
                placeholder="INV-0001"
                required
              />
            </Field>

            <Field label="Amount">
              <div className="pq-unit">
                <input
                  className="pq-input"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.000001"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="10.00"
                  required
                />
                <span>USDC</span>
              </div>
            </Field>

            <Field label="Due date" hint="Optional. Checkout stays valid for at least 24 hours.">
              <input
                className="pq-input"
                type="datetime-local"
                value={dueAt}
                onChange={(event) => setDueAt(event.target.value)}
              />
            </Field>
          </div>

          <div style={{ marginTop: 16 }}>
            <Field label="Description">
              <textarea
                className="pq-input"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What is this payment for?"
                rows={3}
              />
            </Field>
          </div>

          {formError && (
            <div style={{ marginTop: 16 }}>
              <Alert tone="danger">{formError}</Alert>
            </div>
          )}

          <div className="pq-actions" style={{ marginTop: 18 }}>
            <Button type="submit" loading={creating}>
              {creating ? "Creating…" : "Create invoice"}
            </Button>
            <Button variant="ghost" onClick={toggleForm} disabled={creating}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      <div className="pq-toolbar">
        <Segmented
          label="Filter invoices"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All", count: stats.counts.all },
            { value: "pending", label: "Awaiting", count: stats.counts.pending },
            { value: "paid", label: "Paid", count: stats.counts.paid },
            { value: "closed", label: "Expired/failed", count: stats.counts.closed }
          ]}
        />
        <input
          className="pq-input"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search invoice or customer"
          aria-label="Search invoices"
        />
      </div>

      {listError && (
        <div style={{ marginBottom: 14 }}>
          <Alert tone="danger">
            {listError}{" "}
            <button
              type="button"
              className="pq-link"
              style={{ background: "none", border: 0, padding: 0, font: "inherit", cursor: "pointer" }}
              onClick={() => loadInvoices()}
            >
              Try again
            </button>
          </Alert>
        </div>
      )}

      {loading && invoices.length === 0 && (
        <div className="pq-list" aria-busy="true" aria-label="Loading invoices">
          {[0, 1, 2].map((key) => (
            <div key={key} className="pq-skel" style={{ height: 68, borderRadius: 14 }} />
          ))}
        </div>
      )}

      {!loading && !listError && invoices.length === 0 && (
        <EmptyState
          title="No invoices yet"
          text="Create your first invoice and send the checkout link to your customer."
        >
          <Button onClick={toggleForm}>New invoice</Button>
        </EmptyState>
      )}

      {invoices.length > 0 && visible.length === 0 && (
        <EmptyState
          title="No matching invoices"
          text="Try a different filter or search."
        >
          <Button
            variant="secondary"
            onClick={() => {
              setFilter("all");
              setQuery("");
            }}
          >
            Clear filters
          </Button>
        </EmptyState>
      )}

      {visible.length > 0 && (
        <div className="pq-list">
          {visible.map((invoice) => {
            const url = checkoutUrlFor(invoice);
            const kind = bucket(invoice.status);
            const expanded = openId === invoice.id;
            const showQr = qrId === invoice.id;

            return (
              <article key={invoice.id} className="pq-item">
                <button
                  type="button"
                  className="pq-item-head"
                  aria-expanded={expanded}
                  onClick={() => setOpenId(expanded ? null : invoice.id)}
                >
                  <span>
                    <span className="pq-item-title">
                      {invoice.invoice_number || invoice.id?.slice(0, 8)}
                    </span>
                    <br />
                    <span className="pq-item-meta">
                      {invoice.customer_name || "No customer"}
                    </span>
                  </span>
                  <span className="pq-item-amt">
                    {formatAmount(invoice.amount)} {invoice.currency || "USDC"}
                  </span>
                  <span>
                    <StatusBadge status={invoice.status} />
                  </span>
                  <span className="pq-item-meta" style={{ textAlign: "right" }}>
                    Due {formatDate(invoice.due_at)}
                  </span>
                </button>

                {expanded && (
                  <div className="pq-item-body">
                    <dl className="pq-kv">
                      <div>
                        <dt>Customer</dt>
                        <dd>
                          {invoice.customer_name || "No customer"}
                          {invoice.customer_email && (
                            <>
                              <br />
                              <span className="pq-item-meta">{invoice.customer_email}</span>
                            </>
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt>Due</dt>
                        <dd>{formatDate(invoice.due_at)}</dd>
                      </div>
                      <div>
                        <dt>Created</dt>
                        <dd>{formatDate(invoice.created_at)}</dd>
                      </div>
                      {invoice.description && (
                        <div>
                          <dt>Description</dt>
                          <dd>{invoice.description}</dd>
                        </div>
                      )}
                    </dl>

                    <div className="pq-linkbox">
                      <small>{kind === "paid" ? "Receipt link" : "Checkout link"}</small>
                      {url}
                    </div>

                    <div className="pq-actions">
                      <CopyButton value={url} label="Copy link" />
                      {typeof navigator !== "undefined" && navigator.share && (
                        <Button variant="secondary" size="sm" onClick={() => share(invoice)}>
                          Share
                        </Button>
                      )}
                      <a
                        className="pq-btn pq-primary pq-sm"
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {kind === "paid" ? "View receipt" : "Open checkout"}
                      </a>
                      {kind === "pending" && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setQrId(showQr ? null : invoice.id)}
                        >
                          {showQr ? "Hide QR" : "Show QR"}
                        </Button>
                      )}
                    </div>

                    {showQr && kind === "pending" && (
                      <div className="pq-qr">
                        <div className="pq-qr-box">
                          <QRCodeSVG value={url} size={200} level="M" />
                        </div>
                        <span className="pq-item-meta">Scan to open the checkout page</span>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </PageScope>
  );
}
