// ── Email template helpers ────────────────────────────────────────────────────
// Each function returns a { subject, html } object.
// HTML is intentionally simple inline-styled to maximize email client support.

const brand = {
  name: "VINVERSE",
  color: "#1a1a2e",
  accent: "#c084fc",
  url: "https://vinverse.in",
};

function wrap(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background:${brand.color};padding:24px 32px;">
            <span style="font-size:24px;font-weight:bold;color:${brand.accent};letter-spacing:2px;">${brand.name}</span>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;color:#1a1a1a;font-size:15px;line-height:1.6;">
            ${body}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f9f9f9;padding:16px 32px;text-align:center;font-size:12px;color:#888;">
            &copy; ${new Date().getFullYear()} ${brand.name}. All rights reserved.<br/>
            <a href="${brand.url}" style="color:${brand.accent};text-decoration:none;">${brand.url}</a>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Template: Welcome ─────────────────────────────────────────────────────────

export function welcomeTemplate(name: string) {
  return {
    subject: `Welcome to ${brand.name}!`,
    html: wrap(
      `Welcome to ${brand.name}`,
      `<h2 style="color:${brand.color};margin-top:0;">Hello, ${name}! 👋</h2>
      <p>Welcome to <strong>${brand.name}</strong> — your destination for curated books, music, and more.</p>
      <p>Your account is ready. Explore our collection and enjoy exclusive reads.</p>
      <p style="text-align:center;margin:24px 0;">
        <a href="${brand.url}/books" style="background:${brand.accent};color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block;">Browse Books</a>
      </p>
      <p style="color:#666;font-size:13px;">If you did not create this account, please ignore this email.</p>`
    ),
  };
}

// ── Template: Order Confirmation ─────────────────────────────────────────────

export interface OrderConfirmationData {
  name: string;
  orderNumber: string;
  total: number;
  items: Array<{ productName: string; quantity: number; unitPrice: number }>;
}

export function orderConfirmationTemplate(data: OrderConfirmationData) {
  const itemRows = data.items
    .map(
      (i) =>
        `<tr>
          <td style="padding:8px 0;border-bottom:1px solid #eee;">${i.productName}</td>
          <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:center;">${i.quantity}</td>
          <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">₹${i.unitPrice.toFixed(2)}</td>
        </tr>`
    )
    .join("");

  return {
    subject: `Order Confirmed — ${data.orderNumber}`,
    html: wrap(
      "Order Confirmation",
      `<h2 style="color:${brand.color};margin-top:0;">Thank you, ${data.name}!</h2>
      <p>Your order <strong>#${data.orderNumber}</strong> has been placed successfully.</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:16px 0;">
        <tr>
          <th style="text-align:left;padding:8px 0;border-bottom:2px solid ${brand.accent};color:${brand.color};">Item</th>
          <th style="text-align:center;padding:8px 0;border-bottom:2px solid ${brand.accent};color:${brand.color};">Qty</th>
          <th style="text-align:right;padding:8px 0;border-bottom:2px solid ${brand.accent};color:${brand.color};">Price</th>
        </tr>
        ${itemRows}
        <tr>
          <td colspan="2" style="padding:12px 0;font-weight:bold;">Total</td>
          <td style="padding:12px 0;font-weight:bold;text-align:right;color:${brand.accent};">₹${data.total.toFixed(2)}</td>
        </tr>
      </table>
      <p>We will notify you once your order is shipped. Track your order from your account dashboard.</p>`
    ),
  };
}

// ── Template: Payment Success ─────────────────────────────────────────────────

export function paymentSuccessTemplate(name: string, orderNumber: string, amount: number) {
  return {
    subject: `Payment Confirmed — ${orderNumber}`,
    html: wrap(
      "Payment Confirmed",
      `<h2 style="color:${brand.color};margin-top:0;">Payment Received! ✅</h2>
      <p>Hi ${name}, your payment of <strong style="color:${brand.accent};">₹${amount.toFixed(2)}</strong> for order <strong>#${orderNumber}</strong> has been confirmed.</p>
      <p>Your order is now being processed. You will receive a shipping notification soon.</p>`
    ),
  };
}

// ── Template: Inquiry Received ────────────────────────────────────────────────

export function inquiryReceivedTemplate(name: string) {
  return {
    subject: "We received your inquiry — VINVERSE",
    html: wrap(
      "Inquiry Received",
      `<h2 style="color:${brand.color};margin-top:0;">We got your message, ${name}!</h2>
      <p>Thank you for reaching out to <strong>${brand.name}</strong>. Our team will review your inquiry and get back to you within 1–2 business days.</p>
      <p>If your matter is urgent, please email us directly at <a href="mailto:support@vinverse.in" style="color:${brand.accent};">support@vinverse.in</a>.</p>`
    ),
  };
}

// ── Template: Admin — New Order ───────────────────────────────────────────────

export function adminNewOrderTemplate(orderNumber: string, customerName: string, total: number) {
  return {
    subject: `[ADMIN] New Order — ${orderNumber}`,
    html: wrap(
      "New Order Alert",
      `<h2 style="color:${brand.color};margin-top:0;">🛒 New Order Placed</h2>
      <p><strong>Order:</strong> #${orderNumber}</p>
      <p><strong>Customer:</strong> ${customerName}</p>
      <p><strong>Total:</strong> ₹${total.toFixed(2)}</p>
      <p style="text-align:center;margin:24px 0;">
        <a href="${brand.url}/admin/orders" style="background:${brand.accent};color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block;">View in Admin</a>
      </p>`
    ),
  };
}

// ── Template: Admin — New Inquiry ────────────────────────────────────────────

export function adminNewInquiryTemplate(name: string, email: string, type: string, subject?: string) {
  return {
    subject: `[ADMIN] New Inquiry — ${type}`,
    html: wrap(
      "New Inquiry Alert",
      `<h2 style="color:${brand.color};margin-top:0;">📩 New Inquiry Received</h2>
      <p><strong>From:</strong> ${name} (${email})</p>
      <p><strong>Type:</strong> ${type}</p>
      ${subject ? `<p><strong>Subject:</strong> ${subject}</p>` : ""}
      <p style="text-align:center;margin:24px 0;">
        <a href="${brand.url}/admin/inquiries" style="background:${brand.accent};color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block;">View in Admin</a>
      </p>`
    ),
  };
}
