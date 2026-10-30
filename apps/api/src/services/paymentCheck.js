// Checks that a mined transaction really is the payment an invoice asked for.
//
// The PaymentTracker contract emits one event per payment. It records who was paid, how
// much, and the memo (which ends with "[<invoice number>]"). Reading that event, instead of
// only checking that the transaction succeeded, stops someone from submitting an unrelated
// successful transaction as proof of payment.

import { ACTIVE_PAYMENT_TRACKER_ADDRESS } from "../constants.js";

const TRACKER_ADDRESS = ACTIVE_PAYMENT_TRACKER_ADDRESS
  ? ACTIVE_PAYMENT_TRACKER_ADDRESS.toLowerCase()
  : null;

// Topic 0 of the payment event. Topics: payment id, sender, recipient.
// Data: amount, memo offset, timestamp, memo.
const PAYMENT_EVENT_TOPIC =
  "0x3850c91f104feb2bf70644e43b04de7b6368673d810ad84a914bfc9aefb270ea";

// Arc's native USDC uses 6 decimals (not 18).
// Using 18 would make every amount comparison fail — a 10^12 mismatch on every payment.
const DECIMALS = 6;
const WORD = 64;

export function toBaseUnits(value) {
  const text = String(value).trim();

  if (!/^\d+(\.\d+)?$/.test(text)) {
    throw new Error("Invalid amount");
  }

  const [whole, fraction = ""] = text.split(".");

  return BigInt(whole + fraction.padEnd(DECIMALS, "0").slice(0, DECIMALS));
}

function addressFromTopic(topic) {
  return "0x" + String(topic).slice(-40).toLowerCase();
}

function readWord(data, index) {
  const start = 2 + index * WORD;
  return data.slice(start, start + WORD);
}

function decodeMemo(data) {
  try {
    const offset = Number(BigInt("0x" + readWord(data, 1)));
    const start = 2 + offset * 2;
    const length = Number(BigInt("0x" + data.slice(start, start + WORD)));

    if (!Number.isSafeInteger(length) || length > 10000) return "";

    const hex = data.slice(start + WORD, start + WORD + length * 2);

    return Buffer.from(hex, "hex").toString("utf8");
  } catch {
    return "";
  }
}

function fail(reason) {
  return { ok: false, reason };
}

export function validatePaymentReceipt(receipt, { receiver, amount, invoiceNumber }) {
  const logs = Array.isArray(receipt?.logs) ? receipt.logs : [];

  const event = logs.find(
    (log) =>
      String(log.address).toLowerCase() === TRACKER_ADDRESS &&
      String(log.topics?.[0]).toLowerCase() === PAYMENT_EVENT_TOPIC &&
      log.topics.length === 4
  );

  if (!event) {
    return fail("This transaction is not a PayQuick payment.");
  }

  if (addressFromTopic(event.topics[3]) !== String(receiver).toLowerCase()) {
    return fail("The payment went to a different wallet.");
  }

  let paid;
  let required;

  try {
    paid = BigInt("0x" + readWord(event.data, 0));
    required = toBaseUnits(amount);
  } catch {
    return fail("The payment could not be read.");
  }

  if (paid < required) {
    return fail("The payment is less than the invoice amount.");
  }

  if (!decodeMemo(event.data).endsWith("[" + invoiceNumber + "]")) {
    return fail("The payment is for a different invoice.");
  }

  return {
    ok: true,
    sender: addressFromTopic(event.topics[2]),
    amount: paid
  };
}
