import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { Resend } from 'resend';
import { z } from 'zod';

const app = express();
app.use(express.json());
app.set('trust proxy', 1);

const RECIPIENT = 'post@mindmatter.no';
const FROM = 'Mindmatter <kontakt@mindmatter.no>';
const DEV_BYPASS_TOKEN = 'DEV_BYPASS';

const schema = z.object({
  name: z.string().trim().min(1).max(120),
  company: z.string().trim().max(160).optional().or(z.literal('')),
  email: z.string().trim().email().max(200),
  message: z.string().trim().min(10).max(2000),
  captchaToken: z.string().min(1),
});

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function verifyCaptcha(token) {
  const secret = process.env.HCAPTCHA_SECRET_KEY;
  if (!secret) {
    console.error('HCAPTCHA_SECRET_KEY not set');
    return false;
  }
  const params = new URLSearchParams({ secret, response: token });
  try {
    const res = await fetch('https://api.hcaptcha.com/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const data = await res.json();
    return !!data.success;
  } catch (err) {
    console.error('hCaptcha verify error', err);
    return false;
  }
}

app.post('/api/contact', limiter, async (req, res) => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'RESEND_API_KEY not configured' });
  }

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  const { name, company, email, message, captchaToken } = parsed.data;

  const devBypass = process.env.CONTACT_DEV_BYPASS === 'true';
  const captchaOk =
    devBypass && captchaToken === DEV_BYPASS_TOKEN
      ? true
      : await verifyCaptcha(captchaToken);

  if (!captchaOk) {
    return res.status(401).json({ error: 'Captcha verification failed' });
  }

  const safeName = escapeHtml(name);
  const safeCompany = company ? escapeHtml(company) : '';
  const safeEmail = escapeHtml(email);
  const safeMessage = escapeHtml(message).replace(/\n/g, '<br/>');

  const html = `
    <div style="font-family:-apple-system,Segoe UI,sans-serif;color:#111;line-height:1.6;">
      <h2 style="margin:0 0 16px;">Ny henvendelse fra mindmatter.no</h2>
      <table style="border-collapse:collapse;">
        <tr><td style="padding:4px 12px 4px 0;color:#666;">Navn</td><td><strong>${safeName}</strong></td></tr>
        ${safeCompany ? `<tr><td style="padding:4px 12px 4px 0;color:#666;">Bedrift</td><td>${safeCompany}</td></tr>` : ''}
        <tr><td style="padding:4px 12px 4px 0;color:#666;">E-post</td><td><a href="mailto:${safeEmail}">${safeEmail}</a></td></tr>
      </table>
      <hr style="margin:20px 0;border:none;border-top:1px solid #eee;"/>
      <div style="white-space:pre-wrap;">${safeMessage}</div>
    </div>
  `;

  const text = `Ny henvendelse fra mindmatter.no\n\nNavn: ${name}\n${company ? `Bedrift: ${company}\n` : ''}E-post: ${email}\n\n${message}`;

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: [RECIPIENT],
      reply_to: email,
      subject: `Ny henvendelse fra ${name}${company ? ` (${company})` : ''}`,
      html,
      text,
    });

    if (error) {
      console.error('Resend error', error);
      return res.status(502).json({ error: 'Failed to send email', details: error });
    }

    return res.json({ success: true, id: data.id });
  } catch (err) {
    console.error('Contact API error', err);
    return res.status(500).json({ error: 'Internal error' });
  }
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API server på :${PORT}`));
