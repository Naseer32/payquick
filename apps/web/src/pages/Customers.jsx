import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiRequest } from "../services/api.js";
import {
  Button,
  Alert,
  StatusBadge,
  formatAmount,
  friendlyError
} from "../components/ui.jsx";
import { PageScope, Field, EmptyState } from "../components/forms.jsx";

const PAID = ["paid", "confirmed"];
const PENDING = ["pending", "processing"];

function initials(customer) {
  const value = (customer.name || customer.email || "C").trim();
  const parts = value.split(/\s+/);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return value.slice(0, 2).toUpperCase();
}

function formatDate(value) {
  if (!value) return "Unknown";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Unknown";

  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

export default function Customers({
  merchant,
  darkMode = false,
  onCreateInvoice
}) {
  const listRequestId = useRef(0);
  const historyRequestIds = useRef({});

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");

  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState(null);
  const [history, setHistory] = useState({});
  const [historyLoading, setHistoryLoading] = useState({});
  const [historyError, setHistoryError] = useState({});

  const loadCustomers = useCallback(async () => {
    const id = ++listRequestId.current;

    setLoading(true);
    setListError("");

    try {
      const result = await apiRequest("/api/customers");

      if (id === listRequestId.current) {
        setCustomers(result.customers || []);
      }
    } catch (err) {
      if (id === listRequestId.current) {
        setListError(friendlyError(err));
      }
    } finally {
      if (id === listRequestId.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!merchant) {
      setCustomers([]);
      setHistory({});
      setOpenId(null);
      return;
    }

    loadCustomers();
  }, [merchant, loadCustomers]);

  const loadHistory = useCallback(async (customerId) => {
    const id = (historyRequestIds.current[customerId] || 0) + 1;
    historyRequestIds.current[customerId] = id;

    setHistoryLoading((prev) => ({ ...prev, [customerId]: true }));
    setHistoryError((prev) => ({ ...prev, [customerId]: "" }));

    try {
      const result = await apiRequest(
        `/api/customers/${encodeURIComponent(customerId)}/payments`
      );

      if (historyRequestIds.current[customerId] === id) {
        setHistory((prev) => ({ ...prev, [customerId]: result.history || [] }));
      }
    } catch (err) {
      if (historyRequestIds.current[customerId] === id) {
        setHistoryError((prev) => ({ ...prev, [customerId]: friendlyError(err) }));
      }
    } finally {
      if (historyRequestIds.current[customerId] === id) {
        setHistoryLoading((prev) => ({ ...prev, [customerId]: false }));
      }
    }
  }, []);

  function toggleCustomer(customer) {
    if (openId === customer.id) {
      setOpenId(null);
      return;
    }

    setOpenId(customer.id);

    if (history[customer.id] === undefined) {
      loadHistory(customer.id);
    }
  }

  function toggleForm() {
    setNotice("");
    setFormError("");
    setShowForm((value) => !value);
  }

  async function handleCreate(event) {
    event.preventDefault();

    setFormError("");
    setNotice("");

    const cleanName = name.trim();
    const cleanEmail = email.trim();

    if (!cleanName && !cleanEmail) {
      setFormError("Enter a name or an email address.");
      return;
    }

    if (
      cleanEmail &&
      customers.some(
        (customer) =>
          String(customer.email || "").toLowerCase() === cleanEmail.toLowerCase()
      )
    ) {
      setFormError("A customer with this email already exists.");
      return;
    }

    setCreating(true);

    try {
      await apiRequest("/api/customers", {
        method: "POST",
        body: JSON.stringify({ name: cleanName, email: cleanEmail })
      });

      setNotice(`${cleanName || cleanEmail} was added.`);
      setName("");
      setEmail("");
      setShowForm(false);

      await loadCustomers();
    } catch (err) {
      setFormError(friendlyError(err));
    } finally {
      setCreating(false);
    }
  }

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();

    if (!needle) return customers;

    return customers.filter((customer) =>
      [customer.name, customer.email]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle))
    );
  }, [customers, query]);

  if (!merchant) {
    return (
      <PageScope dark={darkMode}>
        <EmptyState
          title="Connect your wallet"
          text="Connect your wallet to manage customers and see their payment history."
        />
      </PageScope>
    );
  }

  return (
    <PageScope dark={darkMode}>
      <div className="pq-head">
        <div>
          <h1 className="pq-h1">Customers</h1>
          <p className="pq-sub">
            {customers.length} {customers.length === 1 ? "customer" : "customers"}.
            Add them here, then pick them when you create an invoice.
          </p>
        </div>
        <Button onClick={toggleForm} variant={showForm ? "secondary" : "primary"}>
          {showForm ? "Close" : "Add customer"}
        </Button>
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
          <h2 className="pq-h2" style={{ marginBottom: 16 }}>New customer</h2>

          <div className="pq-form-grid">
            <Field label="Name">
              <input
                className="pq-input"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Customer name"
                autoComplete="off"
              />
            </Field>

            <Field label="Email">
              <input
                className="pq-input"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="customer@example.com"
                autoComplete="off"
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
              {creating ? "Adding…" : "Add customer"}
            </Button>
            <Button variant="ghost" onClick={toggleForm} disabled={creating}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {customers.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <input
            className="pq-input"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name or email"
            aria-label="Search customers"
          />
        </div>
      )}

      {listError && (
        <div style={{ marginBottom: 14 }}>
          <Alert tone="danger">
            {listError}{" "}
            <button
              type="button"
              className="pq-link"
              style={{ background: "none", border: 0, padding: 0, font: "inherit", cursor: "pointer" }}
              onClick={loadCustomers}
            >
              Try again
            </button>
          </Alert>
        </div>
      )}

      {loading && customers.length === 0 && (
        <div className="pq-list" aria-busy="true" aria-label="Loading customers">
          {[0, 1, 2].map((key) => (
            <div key={key} className="pq-skel" style={{ height: 68, borderRadius: 14 }} />
          ))}
        </div>
      )}

      {!loading && !listError && customers.length === 0 && (
        <EmptyState
          title="No customers yet"
          text="Add a customer to link them to invoices and track what they've paid."
        >
          <Button onClick={toggleForm}>Add customer</Button>
        </EmptyState>
      )}

      {customers.length > 0 && visible.length === 0 && (
        <EmptyState title="No matching customers" text="Try a different name or email.">
          <Button variant="secondary" onClick={() => setQuery("")}>
            Clear search
          </Button>
        </EmptyState>
      )}

      {visible.length > 0 && (
        <div className="pq-list">
          {visible.map((customer) => {
            const expanded = openId === customer.id;
            const items = history[customer.id];
            const busy = historyLoading[customer.id];
            const failed = historyError[customer.id];

            let paid = 0;
            let open = 0;

            (items || []).forEach((item) => {
              const status = String(item.invoice_status || "").toLowerCase();
              if (PAID.includes(status)) paid += Number(item.amount || 0);
              if (PENDING.includes(status)) open += Number(item.amount || 0);
            });

            return (
              <article key={customer.id} className="pq-item">
                <button
                  type="button"
                  className="pq-item-head"
                  aria-expanded={expanded}
                  onClick={() => toggleCustomer(customer)}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                    <span
                      aria-hidden="true"
                      style={{
                        width: 40,
                        height: 40,
                        flex: "none",
                        borderRadius: 12,
                        background: "var(--pq-infoBg)",
                        color: "var(--pq-info)",
                        display: "grid",
                        placeItems: "center",
                        fontSize: 13,
                        fontWeight: 800
                      }}
                    >
                      {initials(customer)}
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <span className="pq-item-title">
                        {customer.name || "Unnamed customer"}
                      </span>
                      <br />
                      <span className="pq-item-meta">
                        {customer.email || "No email address"}
                      </span>
                    </span>
                  </span>
                  <span className="pq-item-meta" style={{ textAlign: "right" }}>
                    {expanded ? "Hide" : "Payments"}
                  </span>
                </button>

                {expanded && (
                  <div className="pq-item-body">
                    <dl className="pq-kv">
                      <div>
                        <dt>Added</dt>
                        <dd>{formatDate(customer.created_at)}</dd>
                      </div>
                      {items && (
                        <>
                          <div>
                            <dt>Paid</dt>
                            <dd className="pq-num">{formatAmount(paid)} USDC</dd>
                          </div>
                          <div>
                            <dt>Awaiting payment</dt>
                            <dd className="pq-num">{formatAmount(open)} USDC</dd>
                          </div>
                        </>
                      )}
                    </dl>

                    {busy && !items && (
                      <div className="pq-skel" style={{ height: 56, borderRadius: 10 }} />
                    )}

                    {failed && <Alert tone="danger">{failed}</Alert>}

                    {items && items.length === 0 && (
                      <p className="pq-item-meta" style={{ margin: 0 }}>
                        No invoices for this customer yet.
                      </p>
                    )}

                    {items && items.length > 0 && (
                      <div>
                        {items.map((item) => (
                          <div
                            key={item.invoice_id}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              gap: 12,
                              flexWrap: "wrap",
                              padding: "12px 0",
                              borderTop: "1px solid var(--pq-border)"
                            }}
                          >
                            <span>
                              <strong style={{ fontSize: 14 }}>{item.invoice_number}</strong>
                              <br />
                              <span className="pq-item-meta pq-num">
                                {formatAmount(item.amount)} {item.currency || "USDC"}
                              </span>
                            </span>
                            <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                              <StatusBadge status={item.invoice_status} />
                              {item.payment_status && (
                                <span className="pq-item-meta" style={{ alignSelf: "center" }}>
                                  Payment: {item.payment_status}
                                </span>
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="pq-actions">
                      {onCreateInvoice && (
                        <Button size="sm" onClick={() => onCreateInvoice(customer.id)}>
                          Create invoice
                        </Button>
                      )}
                      <Button
                        variant="secondary"
                        size="sm"
                        loading={busy}
                        onClick={() => loadHistory(customer.id)}
                      >
                        Refresh payments
                      </Button>
                    </div>
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
