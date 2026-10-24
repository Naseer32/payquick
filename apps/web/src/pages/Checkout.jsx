import { useCallback, useEffect, useState } from "react";
import { ethers } from "ethers";
import { apiRequest } from "../services/api.js";
import { ensureArcTestnet } from "../services/blockchain.js";
import {
  ThemeScope,
  Button,
  Alert,
  StatusBadge,
  CopyButton,
  formatAmount,
  shortAddress,
  txUrl,
  friendlyError
} from "../components/ui.jsx";

const PAYMENT_TRACKER_ADDRESS = "0xd0c5f3e9570CcA0E9913522905b164304A692166";
const PAYMENT_TRACKER_ABI = [
  "function sendPayment(address to, string memo) external payable"
];

// Arc's native USDC uses 18 decimals for transaction values (same as the existing flow).
const NATIVE_DECIMALS = 18;

const storageKey = (token) => `payquick_tx_${token}`;

function readPending(token) {
  try {
    return JSON.parse(localStorage.getItem(storageKey(token)) || "null");
  } catch {
    return null;
  }
}

function savePending(token, record) {
  try {
    localStorage.setItem(storageKey(token), JSON.stringify(record));
  } catch {
    /* storage unavailable: payment still works, recovery just won't */
  }
}

function clearPending(token) {
  try {
    localStorage.removeItem(storageKey(token));
  } catch {
    /* ignore */
  }
}

function Shell({ darkMode, children }) {
  return (
    <ThemeScope dark={darkMode}>
      <div className="pq-wrap">
        <div className="pq-brand">
          <b>
            <span className="pq-mark" aria-hidden="true">P</span>
            PayQuick
          </b>
        </div>
        {children}
        <p className="pq-note pq-noprint">
          Arc Testnet: test USDC has no real-world value.
        </p>
      </div>
    </ThemeScope>
  );
}

export default function Checkout({ checkoutToken, darkMode = false }) {
  const [checkout, setCheckout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // idle | wallet | signing | confirming | reporting | reported | unreported
  const [step, setStep] = useState("idle");
  const [payError, setPayError] = useState("");
  const [noWallet, setNoWallet] = useState(false);
  const [tx, setTx] = useState(null);

  const [networkStatus, setNetworkStatus] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [checking, setChecking] = useState(false);

  const encoded = encodeURIComponent(checkoutToken || "");

  const loadCheckout = useCallback(async () => {
    if (!checkoutToken) {
      setLoadError("This checkout link is invalid. Ask the merchant for a new one.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError("");

    try {
      const result = await apiRequest(`/api/checkout/${encoded}`);
      setCheckout(result.checkout);

      const pending = readPending(checkoutToken);

      if (pending?.txHash) {
        if (result.checkout.status === "pending") {
          setTx(pending);
          setStep("unreported");
        } else {
          clearPending(checkoutToken);
        }
      }
    } catch (err) {
      setLoadError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }, [checkoutToken, encoded]);

  useEffect(() => {
    loadCheckout();
  }, [loadCheckout]);

  const verify = useCallback(async () => {
    setChecking(true);
    setVerifyError("");

    try {
      const result = await apiRequest(`/api/checkout/${encoded}/verify`, {
        method: "POST"
      });

      setNetworkStatus(result.status || "");

      if (result.status === "confirmed" || result.status === "paid") {
        setCheckout((prev) => ({ ...prev, status: "paid" }));
        clearPending(checkoutToken);
      } else if (result.status === "expired") {
        setCheckout((prev) => ({ ...prev, status: "expired" }));
      }
    } catch (err) {
      setVerifyError(friendlyError(err));
    } finally {
      setChecking(false);
    }
  }, [encoded, checkoutToken]);

  useEffect(() => {
    if (step !== "reported" || checkout?.status !== "pending") return;

    verify();
    const interval = setInterval(verify, 5000);
    return () => clearInterval(interval);
  }, [step, checkout?.status, verify]);

  async function report(record) {
    setStep("reporting");
    setPayError("");

    try {
      await apiRequest(`/api/checkout/${encoded}/pay`, {
        method: "POST",
        body: JSON.stringify({
          txHash: record.txHash,
          payerAddress: record.payerAddress
        })
      });

      setStep("reported");
    } catch (err) {
      setPayError(friendlyError(err));
      setStep("unreported");
    }
  }

  async function handlePay() {
    setPayError("");
    setNoWallet(false);

    if (!window.ethereum) {
      setNoWallet(true);
      return;
    }

    let record = null;

    try {
      if (!checkout.wallet_address) {
        throw new Error(
          "This invoice has no merchant wallet address. Contact the merchant."
        );
      }

      setStep("wallet");

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts"
      });
      const payerAddress = accounts[0];

      await ensureArcTestnet();

      const amount = ethers.parseUnits(String(checkout.amount), NATIVE_DECIMALS);
      const memo = `${checkout.description || "Payment"} [${checkout.invoice_number}]`;

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(
        PAYMENT_TRACKER_ADDRESS,
        PAYMENT_TRACKER_ABI,
        signer
      );

      setStep("signing");

      const sent = await contract.sendPayment(checkout.wallet_address, memo, {
        value: amount
      });

      // Saved as soon as the wallet returns a hash, so a closed tab can't lose track of it.
      record = { txHash: sent.hash, payerAddress };
      savePending(checkoutToken, record);
      setTx(record);
      setStep("confirming");

      const receipt = await sent.wait();

      if (!receipt || receipt.status === 0) {
        clearPending(checkoutToken);
        setTx(null);
        throw new Error(
          "The transaction failed on the network. Your payment was not made; only the network fee was used."
        );
      }

      await report(record);
    } catch (err) {
      setPayError(friendlyError(err));
      setStep(record && readPending(checkoutToken) ? "unreported" : "idle");
    }
  }

  function startOver() {
    clearPending(checkoutToken);
    setTx(null);
    setPayError("");
    setStep("idle");
  }

  if (loading) {
    return (
      <Shell darkMode={darkMode}>
        <div className="pq-card" aria-busy="true" aria-label="Loading invoice">
          <div className="pq-skel" style={{ height: 14, width: "40%" }} />
          <div className="pq-skel" style={{ height: 44, width: "70%", marginTop: 14 }} />
          <div className="pq-skel" style={{ height: 120, marginTop: 22 }} />
          <div className="pq-skel" style={{ height: 46, marginTop: 22 }} />
        </div>
      </Shell>
    );
  }

  if (loadError || !checkout) {
    return (
      <Shell darkMode={darkMode}>
        <div className="pq-card">
          <h1 style={{ margin: "0 0 12px", fontSize: 20 }}>Can't open this invoice</h1>
          <Alert tone="danger">{loadError || "Invoice not found."}</Alert>
          <div className="pq-stack">
            <Button block onClick={loadCheckout}>Try again</Button>
          </div>
        </div>
      </Shell>
    );
  }

  const isPaid = checkout.status === "paid";
  const isExpired = checkout.status === "expired";
  const isPending = checkout.status === "pending";
  const busy = ["wallet", "signing", "confirming", "reporting"].includes(step);
  const inFlow = busy || step === "reported" || step === "unreported";

  const steps = [
    {
      label: "Approve in your wallet",
      state: tx || isPaid ? "done" : step === "wallet" || step === "signing" ? "active" : "todo"
    },
    {
      label: "Confirm on Arc",
      state:
        isPaid || step === "reporting" || step === "reported"
          ? "done"
          : step === "confirming"
          ? "active"
          : "todo"
    },
    {
      label: "Merchant notified",
      state: isPaid ? "done" : step === "reporting" || step === "reported" ? "active" : "todo"
    }
  ];

  const amountBlock = (
    <>
      <p className="pq-merchant">
        {checkout.display_name ? `Pay ${checkout.display_name}` : "Pay invoice"}
      </p>
      <p className="pq-amount pq-num">
        {formatAmount(checkout.amount)}
        <span className="pq-cur">{checkout.currency}</span>
      </p>
    </>
  );

  const rows = (
    <dl className="pq-rows">
      <div className="pq-row">
        <dt>Invoice</dt>
        <dd className="pq-num">{checkout.invoice_number}</dd>
      </div>
      {checkout.description && (
        <div className="pq-row">
          <dt>For</dt>
          <dd>{checkout.description}</dd>
        </div>
      )}
      {checkout.due_at && (
        <div className="pq-row">
          <dt>Due</dt>
          <dd>{new Date(checkout.due_at).toLocaleString()}</dd>
        </div>
      )}
      {checkout.wallet_address && (
        <div className="pq-row">
          <dt>Merchant wallet</dt>
          <dd className="pq-num">{shortAddress(checkout.wallet_address)}</dd>
        </div>
      )}
      <div className="pq-row">
        <dt>Status</dt>
        <dd><StatusBadge status={checkout.status} /></dd>
      </div>
      {tx?.txHash && (
        <div className="pq-row">
          <dt>Transaction</dt>
          <dd>
            <a
              className="pq-link pq-num"
              href={txUrl(tx.txHash)}
              target="_blank"
              rel="noopener noreferrer"
            >
              {shortAddress(tx.txHash)}
            </a>
          </dd>
        </div>
      )}
    </dl>
  );

  if (isPaid) {
    return (
      <Shell darkMode={darkMode}>
        <div className="pq-card">
          <div className="pq-check" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </div>
          <h1 style={{ margin: 0, fontSize: 22 }} role="status">Payment received</h1>
          {amountBlock}
          {rows}
          <div className="pq-stack pq-noprint">
            <Button variant="secondary" block onClick={() => window.print()}>
              Print receipt
            </Button>
            <CopyButton value={window.location.href} label="Copy receipt link" block />
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell darkMode={darkMode}>
      <div className="pq-card">
        {amountBlock}
        {rows}

        {isExpired && (
          <div className="pq-stack">
            <Alert tone="danger">
              This invoice has expired and can't be paid. Ask the merchant for a new one.
            </Alert>
          </div>
        )}

        {isPending && inFlow && (
          <ol className="pq-steps" aria-label="Payment progress">
            {steps.map((item) => (
              <li key={item.label} className="pq-step" data-state={item.state}>
                <span className="pq-dot" aria-hidden="true">{item.state === "done" ? "✓" : ""}</span>
                {item.label}
              </li>
            ))}
          </ol>
        )}

        <div className="pq-stack" aria-live="polite">
          {step === "signing" && (
            <Alert tone="info">Confirm the payment in your wallet to continue.</Alert>
          )}

          {step === "confirming" && (
            <Alert tone="info">
              Payment sent. Waiting for Arc to confirm it. Keep this page open.
            </Alert>
          )}

          {step === "reported" && (
            <Alert tone="info">
              Confirmed on Arc. Waiting for PayQuick to record it.
              {networkStatus && (
                <>
                  {" "}Current status: <b>{networkStatus}</b>.
                </>
              )}
            </Alert>
          )}

          {step === "unreported" && tx && (
            <Alert tone="warning">
              We found a payment started on this device (
              <a className="pq-link" href={txUrl(tx.txHash)} target="_blank" rel="noopener noreferrer">
                {shortAddress(tx.txHash)}
              </a>
              ) that PayQuick hasn't recorded yet. Send it to PayQuick to finish. Don't pay again.
            </Alert>
          )}

          {verifyError && <Alert tone="danger">{verifyError}</Alert>}
          {payError && <Alert tone="danger">{payError}</Alert>}

          {noWallet && (
            <Alert tone="warning">
              No wallet found in this browser. Open this link inside your wallet app's
              browser (Rabby, MetaMask, Trust Wallet…), or copy it and paste it there.
            </Alert>
          )}
        </div>

        <div className="pq-stack pq-noprint">
          {isPending && step === "idle" && (
            <Button block onClick={handlePay}>
              Pay {formatAmount(checkout.amount)} {checkout.currency}
            </Button>
          )}

          {isPending && busy && (
            <Button block loading disabled>
              {step === "wallet"
                ? "Opening wallet…"
                : step === "signing"
                ? "Waiting for approval…"
                : step === "confirming"
                ? "Confirming on Arc…"
                : "Recording payment…"}
            </Button>
          )}

          {isPending && step === "unreported" && tx && (
            <>
              <Button block onClick={() => report(tx)}>Send payment to PayQuick</Button>
              <Button variant="ghost" block onClick={startOver}>Start over</Button>
            </>
          )}

          {isPending && step === "reported" && (
            <Button variant="secondary" block loading={checking} onClick={verify}>
              Check status now
            </Button>
          )}

          {noWallet && <CopyButton value={window.location.href} label="Copy payment link" block />}
        </div>
      </div>
    </Shell>
  );
}
