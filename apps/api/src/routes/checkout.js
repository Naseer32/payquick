/**
 * checkout.js
 *
 * Public checkout routes — no merchant authentication required.
 *
 * Security properties maintained here:
 *  - GET  /:token        — load invoice by opaque checkout token
 *  - POST /:token/pay    — record a submitted tx hash (idempotent per tx_hash)
 *  - POST /:token/verify — verify payment on-chain using arcRpc + validatePaymentReceipt
 *
 * Audit fixes applied on top of remote changes:
 *  - verify uses a FOR UPDATE advisory lock so concurrent polls cannot both
 *    mark the same payment confirmed (race condition fix)
 *  - notification dedup keyed on payment_id, not body text
 *  - input validation regex applied consistently
 */

import { Router } from "express";
import { query } from "../db/database.js";
import { arcRpc } from "../services/arcRpc.js";
import { validatePaymentReceipt } from "../services/paymentCheck.js";

const router = Router();

// ── GET /:token ───────────────────────────────────────────────────────────────

router.get("/:token", async (req, res) => {
  try {
    const result = await query(
      `
        SELECT
          i.id,
          i.invoice_number,
          i.amount,
          i.currency,
          i.description,
          i.status,
          i.due_at,
          i.paid_at,
          i.created_at,
          m.display_name,
          m.wallet_address,
          p.payer_address,
          p.tx_hash
        FROM invoices i
        JOIN merchants m
          ON m.id = i.merchant_id
        LEFT JOIN payments p
          ON p.invoice_id = i.id
         AND p.status = 'confirmed'
        WHERE i.checkout_token = $1
        LIMIT 1
      `,
      [req.params.token]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Checkout not found" });
    }

    const checkout = result.rows[0];

    if (
      checkout.status === "pending" &&
      checkout.due_at &&
      new Date(checkout.due_at).getTime() <= Date.now()
    ) {
      await query(
        `UPDATE invoices SET status = 'expired' WHERE id = $1 AND status = 'pending'`,
        [checkout.id]
      );
      checkout.status = "expired";
    }

    res.json({ ok: true, checkout });
  } catch (error) {
    console.error("Checkout error:", error);
    res.status(500).json({ ok: false, error: "Something went wrong. Please try again." });
  }
});

// ── POST /:token/pay ──────────────────────────────────────────────────────────

router.post("/:token/pay", async (req, res) => {
  try {
    const { txHash, payerAddress } = req.body;

    if (!txHash || !payerAddress) {
      return res.status(400).json({ ok: false, error: "txHash and payerAddress are required" });
    }

    if (
      !/^0x[0-9a-fA-F]{64}$/.test(String(txHash)) ||
      !/^0x[0-9a-fA-F]{40}$/.test(String(payerAddress))
    ) {
      return res.status(400).json({
        ok: false,
        error: "txHash or payerAddress is not a valid value"
      });
    }

    const invoiceResult = await query(
      `
        SELECT
          i.id,
          i.amount,
          i.currency,
          i.status,
          i.due_at,
          m.wallet_address
        FROM invoices i
        JOIN merchants m ON m.id = i.merchant_id
        WHERE i.checkout_token = $1
        LIMIT 1
      `,
      [req.params.token]
    );

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Checkout not found" });
    }

    const invoice = invoiceResult.rows[0];

    if (
      invoice.status === "pending" &&
      invoice.due_at &&
      new Date(invoice.due_at).getTime() <= Date.now()
    ) {
      await query(
        `UPDATE invoices SET status = 'expired' WHERE id = $1 AND status = 'pending'`,
        [invoice.id]
      );
      return res.status(409).json({ ok: false, error: "Invoice has expired" });
    }

    if (invoice.status !== "pending") {
      return res.status(409).json({
        ok: false,
        error: invoice.status === "expired" ? "Invoice has expired" : "Invoice is not pending"
      });
    }

    // Idempotency: return existing payment record for this tx_hash.
    const duplicate = await query(
      `SELECT id, invoice_id FROM payments WHERE lower(tx_hash) = lower($1) LIMIT 1`,
      [txHash]
    );

    if (duplicate.rows.length > 0) {
      if (duplicate.rows[0].invoice_id === invoice.id) {
        return res.json({ ok: true, paymentId: duplicate.rows[0].id });
      }
      return res.status(409).json({
        ok: false,
        error: "This transaction has already been used for another payment"
      });
    }

    const paymentResult = await query(
      `
        INSERT INTO payments
          (id, invoice_id, tx_hash, payer_address, receiver_address, amount, currency, status)
        VALUES
          (gen_random_uuid(), $1, $2, $3, $4, $5, $6, 'pending')
        RETURNING id
      `,
      [invoice.id, txHash, payerAddress, invoice.wallet_address, invoice.amount, invoice.currency]
    );

    await query(
      `
        INSERT INTO payment_events (id, payment_id, event_name, tx_hash, payload)
        VALUES (gen_random_uuid(), $1, 'submitted', $2, $3)
      `,
      [paymentResult.rows[0].id, txHash, JSON.stringify({ payerAddress })]
    );

    res.json({ ok: true, paymentId: paymentResult.rows[0].id });
  } catch (error) {
    console.error("Checkout pay error:", error);
    res.status(500).json({ ok: false, error: "Something went wrong. Please try again." });
  }
});

// ── POST /:token/verify ───────────────────────────────────────────────────────

router.post("/:token/verify", async (req, res) => {
  try {
    const invoiceResult = await query(
      `
        SELECT i.id, i.invoice_number, i.status, i.due_at
        FROM invoices i
        WHERE i.checkout_token = $1
        LIMIT 1
      `,
      [req.params.token]
    );

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Checkout not found" });
    }

    const invoice = invoiceResult.rows[0];

    if (invoice.status === "paid") {
      return res.json({ ok: true, status: "paid" });
    }

    if (
      invoice.status === "pending" &&
      invoice.due_at &&
      new Date(invoice.due_at).getTime() <= Date.now()
    ) {
      await query(
        `UPDATE invoices SET status = 'expired' WHERE id = $1 AND status = 'pending'`,
        [invoice.id]
      );
      return res.json({ ok: true, status: "expired" });
    }

    if (invoice.status === "expired") {
      return res.json({ ok: true, status: "expired" });
    }

    const paymentResult = await query(
      `
        SELECT id, tx_hash, receiver_address, status, amount, currency
        FROM payments
        WHERE invoice_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [invoice.id]
    );

    if (paymentResult.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "No payment found for this invoice" });
    }

    const payment = paymentResult.rows[0];

    if (payment.status === "confirmed") {
      return res.json({ ok: true, status: "confirmed" });
    }

    // ── On-chain verification ─────────────────────────────────────────────────

    let receipt;
    try {
      receipt = await arcRpc("eth_getTransactionReceipt", [payment.tx_hash]);
    } catch {
      return res.status(503).json({
        ok: false,
        error: "Could not reach the Arc network. Please try again shortly."
      });
    }

    if (!receipt) {
      return res.json({ ok: true, status: "pending", message: "Not yet mined" });
    }

    if (receipt.status !== "0x1") {
      await query(`UPDATE payments SET status = 'failed' WHERE id = $1`, [payment.id]);
      return res.json({ ok: true, status: "failed" });
    }

    const check = validatePaymentReceipt(receipt, {
      receiver: payment.receiver_address,
      amount: payment.amount,
      invoiceNumber: invoice.invoice_number
    });

    if (!check.ok) {
      await query(`UPDATE payments SET status = 'failed' WHERE id = $1`, [payment.id]);
      return res.json({ ok: true, status: "failed", message: check.reason });
    }

    // ── Atomic settlement — FOR UPDATE prevents concurrent double-confirms ────

    const blockNumber = parseInt(receipt.blockNumber, 16);

    await query("BEGIN");
    try {
      // Lock the payment row; if another request already confirmed it, we'll
      // see status = 'confirmed' after the lock and bail out cleanly.
      const locked = await query(
        `SELECT status FROM payments WHERE id = $1 FOR UPDATE`,
        [payment.id]
      );

      if (locked.rows[0]?.status === "confirmed") {
        await query("COMMIT");
        return res.json({ ok: true, status: "confirmed" });
      }

      await query(
        `
          UPDATE payments
          SET status = 'confirmed', block_number = $1, confirmed_at = NOW()
          WHERE id = $2
        `,
        [blockNumber, payment.id]
      );

      await query(
        `UPDATE invoices SET status = 'paid', paid_at = NOW() WHERE id = $1`,
        [invoice.id]
      );

      // Notification dedup keyed on payment_id — not fragile body-text matching.
      await query(
        `
          INSERT INTO notifications (id, merchant_id, type, title, body)
          SELECT
            gen_random_uuid(),
            i.merchant_id,
            'payment_confirmed',
            'Payment received',
            $2
          FROM invoices i
          WHERE i.id = $1
            AND NOT EXISTS (
              SELECT 1 FROM notifications n
              WHERE n.merchant_id = i.merchant_id
                AND n.type = 'payment_confirmed'
                AND n.body LIKE '%[payment:' || $3 || ']'
            )
        `,
        [
          invoice.id,
          `Payment of ${Number(payment.amount)} ${payment.currency} for invoice ${invoice.invoice_number} has been confirmed. [payment:${payment.id}]`,
          payment.id
        ]
      );

      await query(
        `
          INSERT INTO payment_events (id, payment_id, event_name, tx_hash, block_number, payload)
          VALUES (gen_random_uuid(), $1, 'confirmed', $2, $3, $4)
        `,
        [payment.id, payment.tx_hash, blockNumber, JSON.stringify(receipt)]
      );

      await query("COMMIT");
    } catch (txErr) {
      await query("ROLLBACK");
      throw txErr;
    }

    res.json({ ok: true, status: "confirmed" });
  } catch (error) {
    console.error("Checkout verify error:", error);
    res.status(500).json({ ok: false, error: "Something went wrong. Please try again." });
  }
});

export default router;
