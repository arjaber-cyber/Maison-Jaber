// netlify/functions/send-abandoned-reminders.js
//
// Runs automatically on a schedule (configured in netlify.toml, currently
// every 6 hours). Finds carts that were started 3+ hours ago, never
// completed, and haven't already gotten a reminder -- then emails a
// gentle nudge to come finish their child's book.
//
// Needs the `abandoned_carts` table in Supabase (see track-abandoned-cart.js)
// and RESEND_API_KEY set (see _email.js) to actually send anything -- until
// both exist, this just runs, finds nothing to do, and exits quietly.

const { sendEmail, emailShell } = require('./_email');

const SUPABASE_URL = 'https://zxzlarlpoctpnnnvzced.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4emxhcmxwb2N0cG5ubnZ6Y2VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NTIwODUsImV4cCI6MjEwNDAyODA4NX0.NURv-OB9GIU23fsMAlsMFD59oxuKqc1hDHNuoUHQ21E';

const REMINDER_DELAY_HOURS = 3;

exports.handler = async () => {
  const cutoff = new Date(Date.now() - REMINDER_DELAY_HOURS * 60 * 60 * 1000).toISOString();

  let carts;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/abandoned_carts?completed=eq.false&reminder_sent=eq.false&last_seen_at=lt.${cutoff}&select=*`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
    );
    if (!res.ok) {
      console.warn('send-abandoned-reminders: could not read abandoned_carts (table may not exist yet):', await res.text());
      return { statusCode: 200, body: 'No table yet, nothing to do.' };
    }
    carts = await res.json();
  } catch (err) {
    console.error('send-abandoned-reminders: fetch failed:', err);
    return { statusCode: 200, body: 'Fetch failed, exiting quietly.' };
  }

  let sent = 0;
  for (const cart of carts) {
    const firstName = cart.child_name ? cart.child_name : 'their story';
    const result = await sendEmail({
      to: cart.email,
      subject: `${cart.child_name ? cart.child_name + "'s" : 'Your child\'s'} Hikaya story is waiting for you`,
      html: emailShell(`
        <h2 style="font-family:Georgia,serif; font-size:20px; margin:0 0 12px;">You were so close!</h2>
        <p style="font-size:14px; line-height:1.6; color:#5b4a3d;">
          You started creating a personalized storybook${cart.story ? ' — <strong>' + cart.story + '</strong>' : ''}${cart.child_name ? ' for <strong>' + cart.child_name + '</strong>' : ''}. It's still saved and ready whenever you are.
        </p>
        <div style="text-align:center; margin:22px 0;">
          <a href="https://maison-jaber.com/test5/personalize.html" style="background:#A67443; color:#fff; padding:13px 26px; border-radius:999px; text-decoration:none; font-size:14px; font-weight:600; display:inline-block;">Finish Their Story &rarr;</a>
        </div>
        <p style="font-size:13px; color:#7d6a5a;">If you've changed your mind, no worries at all — just ignore this email.</p>
      `)
    });

    if (result.sent) {
      sent++;
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/abandoned_carts?email=eq.${encodeURIComponent(cart.email)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
          body: JSON.stringify({ reminder_sent: true }),
        });
      } catch (err) {
        console.warn('Could not mark reminder_sent for', cart.email, err);
      }
    }
  }

  return { statusCode: 200, body: `Checked ${carts.length} abandoned cart(s), sent ${sent} reminder(s).` };
};
