// netlify/functions/contact-submit.js
//
// Handles the Contact Us form: emails the message to the business owner
// and sends the visitor a short confirmation. Degrades gracefully if
// RESEND_API_KEY isn't set yet (see _email.js) -- the visitor still sees
// a friendly confirmation, and the message just isn't emailed anywhere
// until that's configured.

const { sendEmail, emailShell } = require('./_email');

const SUPABASE_URL = 'https://zxzlarlpoctpnnnvzced.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4emxhcmxwb2N0cG5ubnZ6Y2VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NTIwODUsImV4cCI6MjEwNDAyODA4NX0.NURv-OB9GIU23fsMAlsMFD59oxuKqc1hDHNuoUHQ21E';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request.' }) };
  }

  const { name, email, orderNumber, message } = payload;
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!name || !emailRe.test(email || '') || !message || message.trim().length < 5) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Please fill in your name, a valid email, and a message.' }) };
  }

  const ownerEmail = process.env.CONTACT_INBOX_EMAIL || process.env.ADMIN_EMAILS?.split(',')[0]?.trim();

  // Log it in Supabase regardless of whether email sending is configured,
  // so nothing is lost if RESEND_API_KEY isn't set yet.
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/contact_messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ name, email, order_number: orderNumber || null, message, created_at: new Date().toISOString() }),
    });
  } catch (err) {
    console.warn('contact_messages insert failed (table may not exist yet):', err);
  }

  if (ownerEmail) {
    await sendEmail({
      to: ownerEmail,
      subject: `New contact message from ${name}${orderNumber ? ' (Order ' + orderNumber + ')' : ''}`,
      html: emailShell(`
        <h2 style="font-family:Georgia,serif; font-size:20px; margin:0 0 12px;">New message from your site</h2>
        <p style="font-size:14px; color:#5b4a3d;"><strong>From:</strong> ${name} (${email})</p>
        ${orderNumber ? `<p style="font-size:14px; color:#5b4a3d;"><strong>Order:</strong> ${orderNumber}</p>` : ''}
        <div style="background:#F3E8D8; border-radius:10px; padding:14px 16px; margin:14px 0; font-size:14px; white-space:pre-wrap;">${message}</div>
      `)
    });
  }

  await sendEmail({
    to: email,
    subject: 'We got your message — Hikaya by Maison Jaber',
    html: emailShell(`
      <h2 style="font-family:Georgia,serif; font-size:20px; margin:0 0 12px;">Thanks, ${name.split(' ')[0]}!</h2>
      <p style="font-size:14px; line-height:1.6; color:#5b4a3d;">We've received your message and will get back to you as soon as we can — usually within a day.</p>
    `)
  });

  return { statusCode: 200, body: JSON.stringify({ success: true }) };
};
