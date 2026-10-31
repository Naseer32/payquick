import { randomUUID } from "node:crypto";
import { query } from "../db/database.js";
import { CURRENCIES } from "../constants.js";

export async function createInvoice({
  merchantId,
  customerId,
  invoiceNumber,
  amount,
  currency,
  description,
  dueAt
}) {
  if (!merchantId) {
    throw new Error("Merchant ID is required");
  }

  if (!invoiceNumber) {
    throw new Error("Invoice number is required");
  }

  // Enforce unique invoice number per merchant
  const existing = await query(
    `SELECT id FROM invoices WHERE merchant_id = $1 AND invoice_number = $2 LIMIT 1`,
    [merchantId, invoiceNumber]
  );
  if (existing.rows.length > 0) {
    throw new Error(`Invoice number ${invoiceNumber} already exists. Please use a different number.`);
  }

  const numericAmount = Number(amount);

  if (!amount || Number.isNaN(numericAmount) || numericAmount <= 0) {
    throw new Error("Invoice amount must be a positive number");
  }

  if (!currency || !Object.values(CURRENCIES).includes(currency)) {
    throw new Error("Invoice currency is not supported");
  }

  const id = randomUUID();
  const checkoutToken = randomUUID();

  // PayQuick checkout links must remain valid for at least 24 hours.
  const minimumExpiration = new Date(
    Date.now() + 24 * 60 * 60 * 1000
  );

  let finalDueAt = minimumExpiration;

  if (dueAt) {
    const requestedDueAt = new Date(dueAt);

    if (Number.isNaN(requestedDueAt.getTime())) {
      throw new Error("Invalid due date.");
    }

    // Use the merchant's requested date only when it is
    // at least 24 hours from invoice creation.
    if (requestedDueAt > minimumExpiration) {
      finalDueAt = requestedDueAt;
    }
  }

  const result = await query(
    `
      INSERT INTO invoices (
        id,
        merchant_id,
        customer_id,
        invoice_number,
        amount,
        currency,
        description,
        checkout_token,
        due_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING
        id,
        merchant_id,
        invoice_number,
        amount,
        currency,
        description,
        status,
        checkout_token,
        due_at,
        paid_at,
        created_at
    `,
    [
      id,
      merchantId,
      customerId || null,
      invoiceNumber,
      numericAmount,
      currency,
      description || null,
      checkoutToken,
      finalDueAt
    ]
  );

  return result.rows[0];
}
