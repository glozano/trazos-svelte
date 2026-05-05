import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 5;
const requestsByIp = new Map();
const ALLOWED_REASONS = new Set([
  'seminarios',
  'talleres',
  'eventos',
  'actividades_colaborativas',
  'desarrollos_tecnologicos',
  'comunidad',
  'colaborar',
  'otros'
]);

function getClientIp(request, getClientAddress) {
  if (typeof getClientAddress === 'function') {
    return getClientAddress();
  }
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (!forwardedFor) return 'unknown';
  return forwardedFor.split(',')[0]?.trim() || 'unknown';
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function checkRateLimit(ip) {
  const now = Date.now();
  const fromWindow = now - WINDOW_MS;
  const recent = (requestsByIp.get(ip) || []).filter((timestamp) => timestamp > fromWindow);

  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    requestsByIp.set(ip, recent);
    return false;
  }

  recent.push(now);
  requestsByIp.set(ip, recent);
  return true;
}

async function verifyTurnstileToken(secretKey, token, clientIp) {
  const payload = new URLSearchParams({
    secret: secretKey,
    response: token
  });

  if (clientIp && clientIp !== 'unknown') {
    payload.set('remoteip', clientIp);
  }

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded'
      },
      body: payload
    });

    if (!response.ok) {
      return false;
    }

    const result = await response.json();
    return Boolean(result?.success);
  } catch (error) {
    console.error('Turnstile verification error:', error);
    return false;
  }
}

export async function POST({ request, getClientAddress }) {
  let data;
  try {
    data = await request.json();
  } catch (error) {
    return json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const name = String(data?.name || '').trim();
  const email = String(data?.email || '').trim();
  const subject = String(data?.subject || '').trim();
  const message = String(data?.message || '').trim();
  const reason = String(data?.reason || 'otros').trim();
  const website = String(data?.website || '').trim();
  const turnstileToken = String(data?.turnstileToken || '').trim();

  // Honeypot: silently accept bots to reduce retries.
  if (website) {
    return json({ ok: true });
  }

  const valid =
    ALLOWED_REASONS.has(reason) &&
    name.length >= 2 &&
    name.length <= 120 &&
    isValidEmail(email) &&
    subject.length >= 3 &&
    subject.length <= 160 &&
    message.length >= 10 &&
    message.length <= 3000;

  if (!valid) {
    return json({ ok: false, error: 'invalid_input' }, { status: 400 });
  }

  const clientIp = getClientIp(request, getClientAddress);
  if (!checkRateLimit(clientIp)) {
    return json({ ok: false, error: 'rate_limited' }, { status: 429 });
  }

  const turnstileSecret = env.TURNSTILE_SECRET_KEY;
  if (turnstileSecret) {
    if (!turnstileToken) {
      return json({ ok: false, error: 'turnstile_required' }, { status: 400 });
    }

    const isHuman = await verifyTurnstileToken(turnstileSecret, turnstileToken, clientIp);
    if (!isHuman) {
      return json({ ok: false, error: 'turnstile_failed' }, { status: 400 });
    }
  }

  const apiKey = env.BREVO_API_KEY;
  const toEmail = env.CONTACT_TO_EMAIL;
  const fromEmail = env.CONTACT_FROM_EMAIL || toEmail;
  const senderName = env.CONTACT_SENDER_NAME || 'Trazos Contact';

  if (!apiKey || !toEmail || !fromEmail) {
    console.error('Missing Brevo contact env vars');
    return json({ ok: false, error: 'misconfigured' }, { status: 500 });
  }

  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeSubject = escapeHtml(subject);
  const safeReason = escapeHtml(reason);
  const safeMessage = escapeHtml(message).replaceAll('\n', '<br>');

  const textContent = [
    `Reason: ${reason}`,
    `Name: ${name}`,
    `Email: ${email}`,
    `IP: ${clientIp}`,
    '',
    `Subject: ${subject}`,
    '',
    message
  ].join('\n');

  const htmlContent = `
    <h2>Nuevo mensaje desde trazos.club</h2>
    <p><strong>Reason:</strong> ${safeReason}</p>
    <p><strong>Name:</strong> ${safeName}</p>
    <p><strong>Email:</strong> ${safeEmail}</p>
    <p><strong>IP:</strong> ${escapeHtml(clientIp)}</p>
    <p><strong>Subject:</strong> ${safeSubject}</p>
    <p><strong>Message:</strong><br>${safeMessage}</p>
  `;

  try {
    const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: {
          email: fromEmail,
          name: senderName
        },
        to: [{ email: toEmail }],
        replyTo: {
          email,
          name
        },
        subject: `[Trazos] ${subject}`,
        textContent,
        htmlContent
      })
    });

    if (!brevoResponse.ok) {
      const responseText = await brevoResponse.text();
      console.error('Brevo send failed:', brevoResponse.status, responseText);
      return json({ ok: false, error: 'delivery_failed' }, { status: 502 });
    }

    return json({ ok: true });
  } catch (error) {
    console.error('Brevo request error:', error);
    return json({ ok: false, error: 'delivery_failed' }, { status: 502 });
  }
}
