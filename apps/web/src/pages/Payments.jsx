import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiRequest } from "../services/api.js";
import {
  Button,
  Alert,
  StatusBadge,
  CopyButton,
  formatAmount,
  shortAddress,
  txUrl,
  addressUrl,
  friendlyError
} from "../components/ui.jsx";
import {
  PageScope,
  Segmented,
  EmptyState
} from "../components/forms.jsx";

const CONFIRMED = ["confirmed", "paid"];
const PENDING = ["pending", "processing"];

function bucket(status) {
  const value = String(status || "").toLowerCase();
  if (CONFIRMED.includes(value)) return "confirmed";
  if (PENDING.includes(value)) return "pending";
  return "failed";
}

function formatDate(value) {
  if (!value) return "Unknown";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Unknown";

  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function csvCell(value) {
  let text = String(value ?? "");

  // Stops spreadsheet apps from treating a cell as a formula.
  if (/^[=+\-@]/.test(text)) text = `'${text}`;

  return `"${text.replace(/"/g, '""')}"`;
}

function exportCsv(rows) {
  const header = [
    "Invoice",
    "Amount",
    "Currency",
    "Status",
    "Customer",
    "From",
    "To",
    "Transaction",
    "Block",
    "Confirmed at",
    "Created at"
  ];

  const lines = rows.map((payment) =>
    [
      payment.invoice_number,
      payment.amount,
      payment.currency || "USDC",
      payment.status,
      payment.customer_name || payment.customer_email,
      payment.payer_address,
      payment.receiver_address,
      payment.tx_hash,
      payment.block_number,
      payment.confirmed_at,
      payment.created_at
    ]
      .map(csvCell)
      .join(",")
  );

  const blob = new Blob([[header.map(csvCell).join(","), ...lines].join("\n")], {
    type: "text/csv;charset=utf-8"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `payquick-payments-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function Payments({ merchant, darkMode = false }) {
  const requestId = useRef(0);

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState(null);

  const loadPayments = useCallback(async (silent = false) => {
    const id = ++requestId.current;

    if (!silent) setLoading(true);
    setError("");

    try {
      const result = await apiRequest("/api/payments");

      if (id === requestId.current) {
        setPayments(result.payments || []);
      }
    } catch (err) {
      if (id === requestId.current && !silent) {
        setError(friendlyError(err));
      }
    } finally {
      if (id === requestId.current && !silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!merchant) {
      setPayments([]);
      return;
    }

    loadPayments();
  }, [merchant, loadPayments]);

  const hasPending = payments.some((payment) => bucket(payment.status) === "pending");

  useEffect(() => {
    if (!merchant || !hasPending) return;

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") loadPayments(true);
    }, 15000);

    return () => clearInterval(interval);
  }, [merchant, hasPending, loadPayments]);

  const stats = useMemo(() => {
    const counts = { all: payments.length, confirmed: 0, pending: 0, failed: 0 };
    let received = 0;

    payments.forEach((payment) => {
      const kind = bucket(payment.status);
      counts[kind] += 1;

      if (kind === "confirmed") received += Number(payment.amount || 0);
    });

    return { counts, received };
  }, [payments]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return payments.filter((payment) => {
      if (filter !== "all" && bucket(payment.status) !== filter) return false;
      if (!needle) return true;

      return [
        payment.invoice_number,
        payment.customer_name,
        payment.customer_email,
        payment.description,
        payment.tx_hash,
        payment.payer_address
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });
  }, [payments, filter, query]);

  if (!merchant) {
    return (
      <PageScope dark={darkMode}>
        <EmptyState
          title="Connect your wallet"
          text="Connect your wallet to see payments your customers have made."
        />
      </PageScope>
    );
  }

  return (
    <PageScope dark={darkMode}>
      <div className="pq-head">
        <div>
          <h1 className="pq-h1">Payments</h1>
          <p className="pq-sub">Every payment, with its status and transaction on Arc.</p>
        </div>

        <div className="pq-actions">
          <Button variant="secondary" size="sm" loading={loading} onClick={() => loadPayments()}>
            Refresh
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={visible.length === 0}
            onClick={() => exportCsv(visible)}
          >
            Export CSV
          </Button>
        </div>
      </div>

      <div className="pq-stats">
        <div className="pq-stat">
          <span>Received</span>
          <b>{formatAmount(stats.received)}</b>
          <small>USDC confirmed</small>
        </div>
        <div className="pq-stat">
          <span>Confirmed</span>
          <b>{stats.counts.confirmed}</b>
          <small>of {stats.counts.all} payments</small>
        </div>
        <div className="pq-stat">
          <span>Pending</span>
          <b>{stats.counts.pending}</b>
          <small>{hasPending ? "Updating automatically" : "Nothing waiting"}</small>
        </div>
      </div>

      <div className="pq-toolbar">
        <Segmented
          label="Filter payments"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All", count: stats.counts.all },
            { value: "confirmed", label: "Confirmed", count: stats.counts.confirmed },
            { value: "pending", label: "Pending", count: stats.counts.pending },
            { value: "failed", label: "Failed", count: stats.counts.failed }
          ]}
        />
        <input
          className="pq-input"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search invoice, customer or hash"
          aria-label="Search payments"
        />
      </div>

      {error && (
        <div style={{ marginBottom: 14 }}>
          <Alert tone="danger">
            {error}{" "}
            <button
              type="button"
              className="pq-link"
              style={{ background: "none", border: 0, padding: 0, font: "inherit", cursor: "pointer" }}
              onClick={() => loadPayments()}
            >
              Try again
            </button>
          </Alert>
        </div>
      )}

      {loading && payments.length === 0 && (
        <div className="pq-list" aria-busy="true" aria-label="Loading payments">
          {[0, 1, 2].map((key) => (
            <div key={key} className="pq-skel" style={{ height: 68, borderRadius: 14 }} />
          ))}
        </div>
      )}

      {!loading && !error && payments.length === 0 && (
        <EmptyState
          title="No payments yet"
          text="When a customer pays an invoice, the payment and its transaction will show up here."
        />
      )}

      {payments.length > 0 && visible.length === 0 && (
        <EmptyState title="No matching payments" text="Try a different filter or search.">
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
          {visible.map((payment) => {
            const expanded = openId === payment.id;

            return (
              <article key={payment.id} className="pq-item">
                <button
                  type="button"
                  className="pq-item-head"
                  aria-expanded={expanded}
                  onClick={() => setOpenId(expanded ? null : payment.id)}
                >
                  <span>
                    <span className="pq-item-title">{payment.invoice_number || "Payment"}</span>
                    <br />
                    <span className="pq-item-meta">
                      {payment.customer_name || payment.customer_email || "No customer"}
                    </span>
                  </span>
                  <span className="pq-item-amt">
                    {formatAmount(payment.amount)} {payment.currency || "USDC"}
                  </span>
                  <span>
                    <StatusBadge status={payment.status} />
                  </span>
                  <span className="pq-item-meta" style={{ textAlign: "right" }}>
                    {formatDate(payment.confirmed_at || payment.created_at)}
                  </span>
                </button>

                {expanded && (
                  <div className="pq-item-body">
                    {payment.description && (
                      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>{payment.description}</p>
                    )}

                    <dl className="pq-kv">
                      <div>
                        <dt>From</dt>
                        <dd className="pq-num">
                          {payment.payer_address ? (
                            <a
                              className="pq-link"
                              href={addressUrl(payment.payer_address)}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={payment.payer_address}
                            >
                              {shortAddress(payment.payer_address)}
                            </a>
                          ) : (
                            "Unknown"
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt>To</dt>
                        <dd className="pq-num">
                          {payment.receiver_address ? (
                            <a
                              className="pq-link"
                              href={addressUrl(payment.receiver_address)}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={payment.receiver_address}
                            >
                              {shortAddress(payment.receiver_address)}
                            </a>
                          ) : (
                            "Unknown"
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt>Block</dt>
                        <dd className="pq-num">{payment.block_number ?? "Not yet confirmed"}</dd>
                      </div>
                      <div>
                        <dt>Created</dt>
                        <dd>{formatDate(payment.created_at)}</dd>
                      </div>
                      <div>
                        <dt>Confirmed</dt>
                        <dd>{payment.confirmed_at ? formatDate(payment.confirmed_at) : "Not yet confirmed"}</dd>
                      </div>
                    </dl>

                    <div className="pq-linkbox">
                      <small>Transaction</small>
                      {payment.tx_hash || "No transaction hash recorded"}
                    </div>

                    {payment.tx_hash && (
                      <div className="pq-actions">
                        <CopyButton value={payment.tx_hash} label="Copy hash" />
                        <a
                          className="pq-btn pq-primary pq-sm"
                          href={txUrl(payment.tx_hash)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View on Arcscan
                        </a>
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
