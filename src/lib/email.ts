// Client wrapper for the `send-email` edge function (Resend).
import { getSupabaseClient } from './supabase';

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke('send-email', { body: input });
  if (error) {
    // Surface the real reason hidden in error.context (see projectStore.ocrDocument).
    let detail = error.message;
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.text === 'function') {
      try {
        const raw = await ctx.text();
        const parsed = raw ? JSON.parse(raw) : null;
        detail = (parsed as { error?: string })?.error || raw || detail;
      } catch { /* keep generic */ }
    }
    throw new Error(detail);
  }
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
}

const BRAND = '#44576D'; // steel-blue

/** Minimal branded transactional email shell. */
export function emailShell(heading: string, bodyHtml: string, cta?: { label: string; url: string }): string {
  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#29353C">
    <h1 style="font-size:20px;margin:0 0 16px">${heading}</h1>
    <div style="font-size:14px;line-height:1.6;color:#44576D">${bodyHtml}</div>
    ${cta ? `<p style="margin:24px 0">
      <a href="${cta.url}" style="display:inline-block;background:${BRAND};color:#fff;text-decoration:none;padding:10px 18px;border-radius:10px;font-size:14px;font-weight:600">${cta.label}</a>
    </p>` : ''}
    <p style="font-size:12px;color:#768A96;margin-top:24px">Construxa · Construction management</p>
  </div>`;
}
