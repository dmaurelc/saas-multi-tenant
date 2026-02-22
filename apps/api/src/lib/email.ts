// Email Service using Resend
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: EmailOptions) {
  // Skip if Resend is not configured
  if (!process.env.RESEND_API_KEY) {
    console.log('Email service not configured. Would send:', { to, subject });
    return { id: 'mock-id' };
  }

  try {
    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'noreply@saas.com',
      to,
      subject,
      html,
      text,
    });

    return result;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

export const EmailTemplates = {
  PAYMENT_SUCCEEDED: 'payment-succeeded',
  PAYMENT_FAILED: 'payment-failed',
  SUBSCRIPTION_CANCELED: 'subscription-canceled',
  USER_INVITED: 'user-invited',
  INVOICE_AVAILABLE: 'invoice-available',
  NOTIFICATION: 'notification',
};

export { resend };
