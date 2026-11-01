import { useCallback, useEffect, useState } from "react";
import { ethers } from "ethers";
import { apiRequest } from "../services/api.js";
import { ensureArcTestnet, getNativeBalance, ACTIVE_NETWORK_NAME, IS_MAINNET } from "../services/blockchain.js";
import {
  Button,
  Alert,
  CopyButton,
  formatAmount,
  shortAddress,
  addressUrl,
  txUrl,
  friendlyError
} from "../components/ui.jsx";
import { PageScope, Field, EmptyState } from "../components/forms.jsx";

// Arc's eth_getBalance and tx `value` field use 18-decimal wei (same as
// Ethereum). This must match blockchain.js (ARC_NATIVE_DECIMALS = 18) and
// Checkout.jsx. The ERC-20 decimals() value of 6 applies only to balanceOf
// calls, not to native transfers or eth_getBalance.
const NATIVE_DECIMALS = 18;
const AMOUNT_PATTERN = /^\d+(\.\d{1,6})?$/;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

function formatDate(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

const sectionTitle = { marginBottom: 4 };

export default function Settings({ merchant, darkMode = false, setDarkMode }) {
  const walletAddress = merchant?.wallet_address;

  // Withdrawal
  const [balance, setBalance] = useState(null);
  const [withdrawTo, setWithdrawTo] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawStep, setWithdrawStep] = useState("form"); // form | review | sending
  const [withdrawError, setWithdrawError] = useState("");
  const [withdrawal, setWithdrawal] = useState(null); // { hash, to, amount, status }

  // API keys
  const [apiKeys, setApiKeys] = useState([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [creatingKey, setCreatingKey] = useState(false);
  const [newRawKey, setNewRawKey] = useState("");
  const [keyError, setKeyError] = useState("");
  const [confirmRevokeId, setConfirmRevokeId] = useState(null);
  const [revokingId, setRevokingId] = useState(null);

  const loadBalance = useCallback(async () => {
    if (!walletAddress) return;

    try {
      setBalance(await getNativeBalance(walletAddress));
    } catch {
      setBalance(null);
    }
  }, [walletAddress]);

  const loadApiKeys = useCallback(async () => {
    setLoadingKeys(true);
    setKeyError("");

    try {
      const result = await apiRequest("/api/keys");
      setApiKeys(result.keys || []);
    } catch (err) {
      setKeyError(friendlyError(err));
    } finally {
      setLoadingKeys(false);
    }
  }, []);

  useEffect(() => {
    if (!merchant) {
      setApiKeys([]);
      setBalance(null);
      setNewRawKey("");
      setWithdrawal(null);
      setWithdrawStep("form");
      return;
    }

    loadApiKeys();
    loadBalance();
  }, [merchant, loadApiKeys, loadBalance]);

  async function handleCreateKey(event) {
    event.preventDefault();

    setCreatingKey(true);
    setKeyError("");
    setNewRawKey("");

    try {
      const result = await apiRequest("/api/keys", {
        method: "POST",
        body: JSON.stringify({ name: keyName.trim() })
      });

      setNewRawKey(result.key.rawKey);
      setKeyName("");

      await loadApiKeys();
    } catch (err) {
      setKeyError(friendlyError(err));
    } finally {
      setCreatingKey(false);
    }
  }

  async function handleRevokeKey(keyId) {
    setRevokingId(keyId);
    setKeyError("");

    try {
      await apiRequest(`/api/keys/${encodeURIComponent(keyId)}/revoke`, {
        method: "POST"
      });

      setConfirmRevokeId(null);
      await loadApiKeys();
    } catch (err) {
      setKeyError(friendlyError(err));
    } finally {
      setRevokingId(null);
    }
  }

  function handleReview(event) {
    event.preventDefault();
    setWithdrawError("");

    const to = withdrawTo.trim();
    const amount = withdrawAmount.trim();

    if (!ethers.isAddress(to)) {
      setWithdrawError("Enter a valid wallet address that starts with 0x.");
      return;
    }

    if (to.toLowerCase() === ZERO_ADDRESS) {
      setWithdrawError("That address can't receive funds. Money sent there is lost.");
      return;
    }

    if (!AMOUNT_PATTERN.test(amount) || Number(amount) <= 0) {
      setWithdrawError("Enter an amount greater than 0 with up to 6 decimal places.");
      return;
    }

    if (balance !== null && Number(amount) > balance) {
      setWithdrawError(
        `That is more than your balance of ${formatAmount(balance)} USDC. Leave a little for the network fee.`
      );
      return;
    }

    setWithdrawTo(ethers.getAddress(to));
    setWithdrawAmount(amount);
    setWithdrawStep("review");
  }

  async function handleConfirmWithdraw() {
    setWithdrawError("");
    setWithdrawStep("sending");

    try {
      if (!window.ethereum) {
        throw new Error(
          "No wallet found. Open PayQuick inside your wallet's browser to withdraw."
        );
      }

      await ensureArcTestnet();

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      if (signer.address.toLowerCase() !== walletAddress.toLowerCase()) {
        throw new Error(
          `Your wallet is using a different account. Switch to ${shortAddress(walletAddress)} in your wallet and try again.`
        );
      }

      const sent = await signer.sendTransaction({
        to: withdrawTo,
        value: ethers.parseUnits(withdrawAmount, NATIVE_DECIMALS)
      });

      const record = {
        hash: sent.hash,
        to: withdrawTo,
        amount: withdrawAmount,
        status: "confirming"
      };

      setWithdrawal(record);
      setWithdrawTo("");
      setWithdrawAmount("");
      setWithdrawStep("form");

      const receipt = await sent.wait();

      setWithdrawal({
        ...record,
        status: receipt && receipt.status === 1 ? "confirmed" : "failed"
      });

      loadBalance();
    } catch (err) {
      setWithdrawError(friendlyError(err));
      setWithdrawStep("review");
    }
  }

  if (!merchant) {
    return (
      <PageScope dark={darkMode}>
        <EmptyState
          title="Connect your wallet"
          text="Connect your wallet to manage your account, withdrawals and API keys."
        />
      </PageScope>
    );
  }

  const sending = withdrawStep === "sending";

  return (
    <PageScope dark={darkMode}>
      <div className="pq-head">
        <div>
          <h1 className="pq-h1">Settings</h1>
          <p className="pq-sub">Your account, withdrawals, API keys and appearance.</p>
        </div>
      </div>

      {/* ACCOUNT */}
      <section className="pq-panel">
        <h2 className="pq-h2" style={sectionTitle}>Account</h2>
        <p className="pq-sub" style={{ marginBottom: 16 }}>
          The wallet you signed in with. Payments from your invoices go here.
        </p>

        <div className="pq-linkbox">
          <small>Wallet address</small>
          <span className="pq-num">{walletAddress}</span>
        </div>

        <div className="pq-actions" style={{ marginTop: 12 }}>
          <CopyButton value={walletAddress || ""} label="Copy address" />
          <a
            className="pq-btn pq-secondary pq-sm"
            href={addressUrl(walletAddress)}
            target="_blank"
            rel="noopener noreferrer"
          >
            View on Arcscan
          </a>
          <span className="pq-badge pq-b-success" style={{ alignSelf: "center" }}>
            Connected
          </span>
        </div>
      </section>

      {/* WITHDRAW */}
      <section className="pq-panel">
        <h2 className="pq-h2" style={sectionTitle}>Withdraw funds</h2>
        <p className="pq-sub" style={{ marginBottom: 16 }}>
          Send USDC from your merchant wallet to another address on {ACTIVE_NETWORK_NAME}.
        </p>

        {withdrawal && (
          <div style={{ marginBottom: 16 }} aria-live="polite">
            <Alert
              tone={
                withdrawal.status === "confirmed"
                  ? "success"
                  : withdrawal.status === "failed"
                  ? "danger"
                  : "info"
              }
            >
              {withdrawal.status === "confirming" &&
                "Withdrawal sent. Waiting for Arc to confirm it."}
              {withdrawal.status === "confirmed" &&
                `Withdrawal confirmed: ${formatAmount(withdrawal.amount)} USDC sent to ${shortAddress(withdrawal.to)}.`}
              {withdrawal.status === "failed" &&
                "The withdrawal failed on the network. Your funds were not sent; only the network fee was used."}{" "}
              <a className="pq-link" href={txUrl(withdrawal.hash)} target="_blank" rel="noopener noreferrer">
                View transaction
              </a>
            </Alert>
          </div>
        )}

        {withdrawStep === "form" && (
          <form onSubmit={handleReview}>
            <div className="pq-form-grid" style={{ gridTemplateColumns: "1fr" }}>
              <Field label="Recipient address">
                <input
                  className="pq-input pq-num"
                  value={withdrawTo}
                  onChange={(event) => setWithdrawTo(event.target.value)}
                  placeholder="0x…"
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  required
                />
              </Field>

              <Field
                label="Amount"
                hint={
                  balance !== null
                    ? `Available: ${formatAmount(balance)} USDC. Network fees are paid in USDC too.`
                    : "Network fees are paid in USDC."
                }
              >
                <div className="pq-unit">
                  <input
                    className="pq-input"
                    inputMode="decimal"
                    value={withdrawAmount}
                    onChange={(event) => setWithdrawAmount(event.target.value)}
                    placeholder="10.00"
                    autoComplete="off"
                    required
                  />
                  <span>USDC</span>
                </div>
              </Field>
            </div>

            {withdrawError && (
              <div style={{ marginTop: 16 }}>
                <Alert tone="danger">{withdrawError}</Alert>
              </div>
            )}

            <div className="pq-actions" style={{ marginTop: 18 }}>
              <Button type="submit" disabled={withdrawal?.status === "confirming"}>
                Review withdrawal
              </Button>
            </div>
          </form>
        )}

        {(withdrawStep === "review" || sending) && (
          <div>
            <dl className="pq-kv" style={{ gridTemplateColumns: "1fr" }}>
              <div>
                <dt>You are sending</dt>
                <dd className="pq-num" style={{ fontSize: 22 }}>
                  {formatAmount(withdrawAmount)} USDC
                </dd>
              </div>
              <div>
                <dt>To</dt>
                <dd className="pq-num">{withdrawTo}</dd>
              </div>
              <div>
                <dt>Network</dt>
                <dd>{ACTIVE_NETWORK_NAME}</dd>
              </div>
            </dl>

            <div style={{ marginTop: 16 }}>
              <Alert tone="warning">
                Blockchain transfers can't be undone. Check the address carefully before you confirm.
              </Alert>
            </div>

            {withdrawError && (
              <div style={{ marginTop: 12 }}>
                <Alert tone="danger">{withdrawError}</Alert>
              </div>
            )}

            <div className="pq-actions" style={{ marginTop: 18 }}>
              <Button loading={sending} onClick={handleConfirmWithdraw}>
                {sending ? "Confirm in your wallet…" : "Confirm and send"}
              </Button>
              <Button
                variant="ghost"
                disabled={sending}
                onClick={() => {
                  setWithdrawError("");
                  setWithdrawStep("form");
                }}
              >
                Back
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* API KEYS */}
      <section className="pq-panel">
        <h2 className="pq-h2" style={sectionTitle}>API keys</h2>
        <p className="pq-sub" style={{ marginBottom: 16 }}>
          Keys let your own website or app create invoices through PayQuick.
        </p>

        <form onSubmit={handleCreateKey}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input
              className="pq-input"
              style={{ flex: 1, minWidth: 200 }}
              value={keyName}
              onChange={(event) => setKeyName(event.target.value)}
              placeholder="Key name, e.g. Website"
              aria-label="API key name"
              autoComplete="off"
            />
            <Button type="submit" loading={creatingKey}>
              {creatingKey ? "Generating…" : "Generate key"}
            </Button>
          </div>
        </form>

        {newRawKey && (
          <div style={{ marginTop: 16 }}>
            <Alert tone="warning">
              Copy this key now. It won't be shown again.
              <code
                className="pq-num"
                style={{ display: "block", marginTop: 8, overflowWrap: "anywhere", fontSize: 13 }}
              >
                {newRawKey}
              </code>
              <div className="pq-actions" style={{ marginTop: 10 }}>
                <CopyButton value={newRawKey} label="Copy key" />
                <Button variant="ghost" size="sm" onClick={() => setNewRawKey("")}>
                  I've saved it
                </Button>
              </div>
            </Alert>
          </div>
        )}

        {keyError && (
          <div style={{ marginTop: 16 }}>
            <Alert tone="danger">{keyError}</Alert>
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          {loadingKeys && apiKeys.length === 0 ? (
            <div className="pq-skel" style={{ height: 56, borderRadius: 10 }} aria-busy="true" />
          ) : apiKeys.length === 0 ? (
            <p className="pq-sub" style={{ margin: 0 }}>No API keys yet.</p>
          ) : (
            apiKeys.map((key) => (
              <div
                key={key.id}
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
                <div style={{ minWidth: 0 }}>
                  <strong style={{ fontSize: 14 }}>{key.name || "Unnamed key"}</strong>
                  <div className="pq-item-meta pq-num">
                    {key.key_prefix}…
                    {key.created_at ? ` · created ${formatDate(key.created_at)}` : ""}
                  </div>
                </div>

                {key.revoked_at ? (
                  <span className="pq-badge pq-b-neutral">Revoked</span>
                ) : confirmRevokeId === key.id ? (
                  <span className="pq-actions">
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={revokingId === key.id}
                      onClick={() => handleRevokeKey(key.id)}
                    >
                      Yes, revoke
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={revokingId === key.id}
                      onClick={() => setConfirmRevokeId(null)}
                    >
                      Cancel
                    </Button>
                  </span>
                ) : (
                  <Button size="sm" variant="secondary" onClick={() => setConfirmRevokeId(key.id)}>
                    Revoke
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      {/* APPEARANCE */}
      <section className="pq-panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
          <div>
            <h2 className="pq-h2" style={sectionTitle}>Dark mode</h2>
            <p className="pq-sub" style={{ margin: 0 }}>
              {darkMode ? "Dark theme is on." : "Light theme is on."}
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={darkMode}
            aria-label="Dark mode"
            className="pq-chip"
            disabled={!setDarkMode}
            onClick={() => setDarkMode?.((current) => !current)}
            style={{
              width: 54,
              minHeight: 32,
              height: 32,
              padding: 0,
              borderRadius: 999,
              position: "relative",
              background: darkMode ? "var(--pq-primary)" : "var(--pq-sunken)"
            }}
          >
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                top: 3,
                left: darkMode ? 25 : 3,
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: darkMode ? "var(--pq-onPrimary)" : "var(--pq-surface)",
                boxShadow: "0 1px 3px rgba(0,0,0,.3)",
                transition: "left .15s"
              }}
            />
          </button>
        </div>
      </section>

      {/* NETWORK */}
      <section className="pq-panel">
        <h2 className="pq-h2" style={sectionTitle}>Payments</h2>
        <p className="pq-sub" style={{ marginBottom: 16 }}>
          How PayQuick currently settles payments.
        </p>

        <dl className="pq-kv">
          <div>
            <dt>Currency</dt>
            <dd>USDC</dd>
          </div>
          <div>
            <dt>Network</dt>
            <dd>{ACTIVE_NETWORK_NAME}</dd>
          </div>
        </dl>

        <p className="pq-item-meta" style={{ margin: "14px 0 0", lineHeight: 1.5 }}>
          PayQuick settles payments on the network configured at deployment time.
        </p>
      </section>
    </PageScope>
  );
}
