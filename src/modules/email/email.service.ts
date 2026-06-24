import { Resend } from "resend";
import { env } from "../../config/env";
import { logger } from "../../lib/logger";
import {
  welcomeTemplate,
  orderConfirmationTemplate,
  paymentSuccessTemplate,
  inquiryReceivedTemplate,
  adminNewOrderTemplate,
  adminNewInquiryTemplate,
  OrderConfirmationData,
} from "./email.templates";

// ── Resend client (lazy singleton) ────────────────────────────────────────────

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    if (!env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }
    _resend = new Resend(env.RESEND_API_KEY);
  }
  return _resend;
}

// ── Core send function ────────────────────────────────────────────────────────

interface SendOptions {
  to: string | string[];
  subject: string;
  html: string;
}

/**
 * Send an email. Always fire-and-forget — never throws.
 * Failures are logged but do NOT propagate to the caller.
 */
export function sendEmail(options: SendOptions): void {
  if (!env.RESEND_API_KEY) {
    logger.warn("[Email] RESEND_API_KEY not set — skipping email send", {
      subject: options.subject,
    });
    return;
  }

  getResend()
    .emails.send({
      from: env.EMAIL_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
    })
    .then((result) => {
      logger.info("[Email] Sent successfully", {
        subject: options.subject,
        id: result.data?.id,
      });
    })
    .catch((err) => {
      logger.error("[Email] Failed to send", {
        subject: options.subject,
        error: String(err),
      });
    });
}

// ── High-level email senders ──────────────────────────────────────────────────

export function sendWelcomeEmail(to: string, name: string): void {
  const { subject, html } = welcomeTemplate(name);
  sendEmail({ to, subject, html });
}

export function sendOrderConfirmationEmail(
  to: string,
  data: OrderConfirmationData
): void {
  const { subject, html } = orderConfirmationTemplate(data);
  sendEmail({ to, subject, html });
}

export function sendPaymentSuccessEmail(
  to: string,
  name: string,
  orderNumber: string,
  amount: number
): void {
  const { subject, html } = paymentSuccessTemplate(name, orderNumber, amount);
  sendEmail({ to, subject, html });
}

export function sendInquiryReceivedEmail(to: string, name: string): void {
  const { subject, html } = inquiryReceivedTemplate(name);
  sendEmail({ to, subject, html });
}

export function sendAdminNewOrderEmail(
  orderNumber: string,
  customerName: string,
  total: number
): void {
  const { subject, html } = adminNewOrderTemplate(orderNumber, customerName, total);
  sendEmail({ to: env.ADMIN_EMAIL, subject, html });
}

export function sendAdminNewInquiryEmail(
  name: string,
  email: string,
  type: string,
  subject?: string
): void {
  const tpl = adminNewInquiryTemplate(name, email, type, subject);
  sendEmail({ to: env.ADMIN_EMAIL, subject: tpl.subject, html: tpl.html });
}
