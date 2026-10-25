import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiRequest } from "../services/api.js";
import { getNativeBalance } from "../services/blockchain.js";
import {
  Button,
  Alert,
  StatusBadge,
  CopyButton,
  formatAmount,
  shortAddress,
  addressUrl,
  friendlyError
} from "../components/ui.jsx";
import { PageScope, EmptyState } from "../components/forms.jsx";

const PAID = ["paid", "confirmed"];
const PENDING = ["pending", "processing"];
const CHART_DAYS = 14;

const isPaid = (status) => PAID.includes(String(status || "").toLowerCase());
const isPending = (status) => PENDING.includes(String(status || "").toLowerCase());

function relativeTime(value) {
  if (!value) return "Unknown";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Unknown";

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return "Just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  return date.toLocaleDateString();
}

function dayKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const rowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  padding: "12px 0",
  borderTop: "1px solid var(--pq-border)"
};

export default function Dashboard({ merchant, darkMode = false, onNavigate }) {
  const dataRequestId = useRef(0);

  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [dataError, setDataError] = useState("");

  const [balance, setBalance] = useState(null);
  const [balanceError, setBalanceError] = useState("");
  const [loadingBalance, setLoadingBalance] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [notificationError, setNotificationError] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);

  const loadData = useCallback(async (silent = false) => {
    const id = ++dataRequestId.current;

    if (!silent) setLoadingData(true);
    setDataError("");

    try {
      const [paymentsResult, invoicesResult, customersResult] = await Promise.all([
        apiRequest("/api/payments"),
        apiRequest("/api/invoices"),
        apiRequest("/api/customers")
      ]);

      if (id !== dataRequestId.current) return;

      setPayments(paymentsResult.payments || []);
      setInvoices(invoicesResult.invoices || []);
      setCustomers(customersResult.customers || []);
      setLoadedOnce(true);
    } catch (err) {
      if (id === dataRequestId.current && !silent) {
        setDataError(friendlyError(err));
      }
    } finally {
      if (id === dataRequestId.current && !silent) {
        setLoadingData(false);
      }
    }
  }, []);

  const loadNotifications = useCallback(async (silent = false) => {
    if (!silent) setLoadingNotifications(true);
    setNotificationError("");

    try {
      const result = await apiRequest("/api/notifications");
      setNotifications(result.notifications || []);
    } catch (err) {
      if (!silent) setNotificationError(friendlyError(err));
    } finally {
      if (!silent) setLoadingNotifications(false);
    }
  }, []);

  const walletAddress = merchant?.wallet_address;

  const loadBalance = useCallback(async () => {
    if (!walletAddress) return;

    setLoadingBalance(true);
    setBalanceError("");

    try {
      setBalance(await getNativeBalance(walletAddress));
    } catch (err) {
      setBalanceError(
        "Balance unavailable. Open this page in your wallet's browser to see it."
      );
    } finally {
      setLoadingBalance(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    if (!merchant) {
      setPayments([]);
      setInvoices([]);
      setCustomers([]);
      setNotifications([]);
      setBalance(null);
      setLoadedOnce(false);
      setShowNotifications(false);
      return;
    }

    loadData();
    loadNotifications();
    loadBalance();
  }, [merchant, loadData, loadNotifications, loadBalance]);

  useEffect(() => {
    if (!merchant) return;

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        loadData(true);
        loadNotifications(true);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [merchant, loadData, loadNotifications]);

  async function markAsRead(notificationId) {
    try {
      await apiRequest(`/api/notifications/${encodeURIComponent(notificationId)}/read`, {
        method: "POST"
      });

      setNotifications((current) =>
        current.map((item) =>
          item.id === notificationId ? { ...item, read_at: new Date().toISOString() } : item
        )
      );
    } catch (err) {
      setNotificationError(friendlyError(err));
    }
  }

  const stats = useMemo(() => {
    const confirmed = payments.filter((payment) => isPaid(payment.status));
    const received = confirmed.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const awaiting = invoices
      .filter((invoice) => isPending(invoice.status))
      .reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);

    return {
      received,
      awaiting,
      paidInvoices: invoices.filter((invoice) => isPaid(invoice.status)).length,
      openInvoices: invoices.filter((invoice) => isPending(invoice.status)).length,
      currency: confirmed.find((payment) => payment.currency)?.currency || "USDC"
    };
  }, [payments, invoices]);

  const chart = useMemo(() => {
    const today = new Date();
    const days = [];

    for (let i = CHART_DAYS - 1; i >= 0; i -= 1) {
      const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
      days.push({ key: dayKey(date), date, total: 0, count: 0 });
    }

    const byKey = new Map(days.map((day) => [day.key, day]));

    payments.forEach((payment) => {
      if (!isPaid(payment.status)) return;

      const when = new Date(payment.confirmed_at || payment.created_at);

      if (Number.isNaN(when.getTime())) return;

      const day = byKey.get(dayKey(when));

      if (day) {
        day.total += Number(payment.amount || 0);
        day.count += 1;
      }
    });

    const max = Math.max(...days.map((day) => day.total), 0);
    const total = days.reduce((sum, day) => sum + day.total, 0);
    const count = days.reduce((sum, day) => sum + day.count, 0);

    return { days, max, total, count };
  }, [payments]);

  const recentInvoices = useMemo(
    () =>
      [...invoices]
        .sort(
          (a, b) =>
            new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        )
        .slice(0, 5),
    [invoices]
  );

  const recentPayments = useMemo(
    () =>
      [...payments]
        .sort(
          (a, b) =>
            new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        )
        .slice(0, 5),
    [payments]
  );

  const unread = notifications.filter((item) => !item.read_at).length;
  const showSkeleton = loadingData && !loadedOnce;

  if (!merchant) {
    return (
      <PageScope dark={darkMode}>
        <EmptyState
          title="Welcome to PayQuick"
          text="Connect your wallet to see your dashboard, create invoices and track USDC payments on Arc."
        />
      </PageScope>
    );
  }

  return (
    <PageScope dark={darkMode}>
      <div className="pq-head">
        <div>
          <h1 className="pq-h1">Overview</h1>
          <p className="pq-sub">Your invoices, customers and payments at a glance.</p>
        </div>

        <div className="pq-actions">
          <button
            type="button"
            className="pq-btn pq-secondary pq-sm"
            aria-expanded={showNotifications}
            onClick={() => setShowNotifications((value) => !value)}
          >
            Notifications{unread > 0 ? ` (${unread > 99 ? "99+" : unread})` : ""}
          </button>
          {onNavigate && (
            <Button size="sm" onClick={() => onNavigate("invoices")}>
              New invoice
            </Button>
          )}
        </div>
      </div>

      {showNotifications && (
        <section className="pq-panel" aria-label="Notifications">
          <div className="pq-head" style={{ marginBottom: 8, alignItems: "center" }}>
            <h2 className="pq-h2">Notifications</h2>
            <Button
              variant="secondary"
              size="sm"
              loading={loadingNotifications}
              onClick={() => loadNotifications()}
            >
              Refresh
            </Button>
          </div>

          {notificationError && <Alert tone="danger">{notificationError}</Alert>}

          {!loadingNotifications && notifications.length === 0 && !notificationError && (
            <p className="pq-sub" style={{ margin: "8px 0" }}>
              No notifications yet. You'll see payment updates here.
            </p>
          )}

          {notifications.map((item) => (
            <article key={item.id} style={rowStyle}>
              <div style={{ minWidth: 0 }}>
                <strong style={{ fontSize: 14 }}>{item.title}</strong>
                {item.body && (
                  <p className="pq-item-meta" style={{ margin: "4px 0 0", lineHeight: 1.5 }}>
                    {item.body}
                  </p>
                )}
                <span className="pq-item-meta">{relativeTime(item.created_at)}</span>
              </div>
              {!item.read_at && (
                <Button variant="ghost" size="sm" onClick={() => markAsRead(item.id)}>
                  Mark as read
                </Button>
              )}
            </article>
          ))}
        </section>
      )}

      <section className="pq-panel" style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ minWidth: 0 }}>
          <div className="pq-item-meta">Connected wallet</div>
          <div className="pq-num" style={{ fontWeight: 650, marginTop: 2 }}>
            {shortAddress(walletAddress)}
          </div>
          <div className="pq-actions" style={{ marginTop: 8 }}>
            <CopyButton value={walletAddress || ""} label="Copy address" variant="ghost" />
            <a className="pq-link" style={{ alignSelf: "center", fontSize: 13 }} href={addressUrl(walletAddress)} target="_blank" rel="noopener noreferrer">
              View on Arcscan
            </a>
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div className="pq-item-meta">Wallet balance</div>
          <div className="pq-num" style={{ fontSize: 24, fontWeight: 750, marginTop: 2 }}>
            {loadingBalance ? "…" : balance !== null ? `${formatAmount(balance)} USDC` : "Unavailable"}
          </div>
          {balanceError && (
            <div className="pq-item-meta" style={{ maxWidth: 260, marginTop: 4 }}>
              {balanceError}
            </div>
          )}
        </div>
      </section>

      {dataError && (
        <div style={{ marginBottom: 16 }}>
          <Alert tone="danger">
            {dataError}{" "}
            <button
              type="button"
              className="pq-link"
              style={{ background: "none", border: 0, padding: 0, font: "inherit", cursor: "pointer" }}
              onClick={() => loadData()}
            >
              Try again
            </button>
          </Alert>
        </div>
      )}

      {showSkeleton ? (
        <div className="pq-stats" aria-busy="true" aria-label="Loading overview">
          {[0, 1, 2, 3].map((key) => (
            <div key={key} className="pq-skel" style={{ height: 96, borderRadius: 14 }} />
          ))}
        </div>
      ) : (
        <div className="pq-stats">
          <div className="pq-stat">
            <span>Received</span>
            <b>{formatAmount(stats.received)}</b>
            <small>{stats.currency} confirmed on Arc</small>
          </div>
          <div className="pq-stat">
            <span>Awaiting payment</span>
            <b>{formatAmount(stats.awaiting)}</b>
            <small>{stats.openInvoices} open {stats.openInvoices === 1 ? "invoice" : "invoices"}</small>
          </div>
          <div className="pq-stat">
            <span>Paid invoices</span>
            <b>{stats.paidInvoices}</b>
            <small>of {invoices.length} total</small>
          </div>
          <div className="pq-stat">
            <span>Customers</span>
            <b>{customers.length}</b>
            <small>{payments.length} {payments.length === 1 ? "payment" : "payments"} recorded</small>
          </div>
        </div>
      )}

      {!showSkeleton && (
        <section className="pq-panel" aria-label="Payments received in the last 14 days">
          <h2 className="pq-h2">Received, last {CHART_DAYS} days</h2>

          {chart.count === 0 ? (
            <p className="pq-sub">No confirmed payments in this period yet.</p>
          ) : (
            <>
              <p className="pq-sub">
                <b className="pq-num">{formatAmount(chart.total)} {stats.currency}</b> from {chart.count}{" "}
                {chart.count === 1 ? "payment" : "payments"}
              </p>

              <div
                role="img"
                aria-label={`Daily USDC received over the last ${CHART_DAYS} days. Total ${formatAmount(chart.total)} from ${chart.count} payments.`}
                style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 120, marginTop: 16 }}
              >
                {chart.days.map((day) => (
                  <div
                    key={day.key}
                    title={`${day.date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}: ${formatAmount(day.total)} ${stats.currency}`}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      borderRadius: 4,
                      height: day.total > 0 ? `${Math.max((day.total / chart.max) * 100, 4)}%` : 3,
                      background: day.total > 0 ? "var(--pq-primary)" : "var(--pq-border)"
                    }}
                  />
                ))}
              </div>

              <div className="pq-item-meta" style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                <span>{chart.days[0].date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                <span>Today</span>
              </div>
            </>
          )}
        </section>
      )}

      {!showSkeleton && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
          <section className="pq-panel" style={{ marginBottom: 0 }}>
            <div className="pq-head" style={{ marginBottom: 4, alignItems: "center" }}>
              <h2 className="pq-h2">Recent payments</h2>
              {onNavigate && (
                <Button variant="ghost" size="sm" onClick={() => onNavigate("payments")}>
                  View all
                </Button>
              )}
            </div>

            {recentPayments.length === 0 ? (
              <p className="pq-sub">Payments will appear here once customers pay.</p>
            ) : (
              recentPayments.map((payment) => (
                <div key={payment.id} style={rowStyle}>
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ fontSize: 14 }}>{payment.invoice_number || "Payment"}</strong>
                    <div className="pq-item-meta">{relativeTime(payment.created_at)}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="pq-num" style={{ fontWeight: 700 }}>
                      {formatAmount(payment.amount)} {payment.currency || "USDC"}
                    </div>
                    <StatusBadge status={payment.status} />
                  </div>
                </div>
              ))
            )}
          </section>

          <section className="pq-panel" style={{ marginBottom: 0 }}>
            <div className="pq-head" style={{ marginBottom: 4, alignItems: "center" }}>
              <h2 className="pq-h2">Recent invoices</h2>
              {onNavigate && (
                <Button variant="ghost" size="sm" onClick={() => onNavigate("invoices")}>
                  View all
                </Button>
              )}
            </div>

            {recentInvoices.length === 0 ? (
              <p className="pq-sub">Create your first invoice to start getting paid.</p>
            ) : (
              recentInvoices.map((invoice) => (
                <div key={invoice.id} style={rowStyle}>
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ fontSize: 14 }}>
                      {invoice.invoice_number || invoice.id?.slice(0, 8)}
                    </strong>
                    <div className="pq-item-meta">
                      {invoice.customer_name || invoice.customer_email || "No customer"}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="pq-num" style={{ fontWeight: 700 }}>
                      {formatAmount(invoice.amount)} {invoice.currency || "USDC"}
                    </div>
                    <StatusBadge status={invoice.status} />
                  </div>
                </div>
              ))
            )}
          </section>
        </div>
      )}
    </PageScope>
  );
}
