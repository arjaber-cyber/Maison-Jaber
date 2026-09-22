// netlify/functions/paytabs-callback.js
//
// PayTabs' server-to-server webhook. This is the ONLY source of truth for
// whether a card payment actually succeeded -- never the browser/iframe
// redirect, since a customer closing their tab mid-payment would mean we
// never hear from that path. This function fires regardless of what the
// customer does.
//
// Security: rather than trusting the POSTed body directly (which anyone
// could forge without knowing it came from PayTabs), we take the tran_ref
// it reports and independently ask PayTabs' own Query Transaction API
// whether that transaction really succeeded, and only act on that answer.

const SUPABASE_URL = 'https://zxzlarlpoctpnnnvzced.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4emxhcmxwb2N0cG5ubnZ6Y2VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NTIwODUsImV4cCI6MjEwNDAyODA4NX0.NURv-OB9GIU23fsMAlsMFD59oxuKqc1hDHNuoUHQ21E';

const { sendEmail, emailShell } = require('./_email');

exports.handler = async (event) => {
  const profileId = process.env.PAYTABS_PROFILE_ID;
  const serverKey = process.env.PAYTABS_SERVER_KEY;
  const domain = process.env.PAYTABS_DOMAIN || 'https://secure.paytabs.com';
  if (!profileId || !serverKey) {
    console.error('paytabs-callback: PayTabs env vars not set');
    return { statusCode: 200, body: 'ok' }; // still 200 so PayTabs doesn't endlessly retry
  }

  let payload;
  try {
    payload = event.headers['content-type']?.includes('application/json')
      ? JSON.parse(event.body)
      : Object.fromEntries(new URLSearchParams(event.body));
  } catch {
    return { statusCode: 200, body: 'ok' };
  }

  const tranRef = payload.tran_ref;
  const cartId = payload.cart_id;
  if (!tranRef || !cartId) return { statusCode: 200, body: 'ok' };

  // Independently verify with PayTabs rather than trusting this POST body.
  let verified;
  try {
    const queryRes = await fetch(`${domain}/payment/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: serverKey },
      body: JSON.stringify({ profile_id: Number(profileId), tran_ref: tranRef }),
    });
    verified = await queryRes.json();
  } catch (err) {
    console.error('paytabs-callback: verification query failed', err);
    return { statusCode: 200, body: 'ok' };
  }

  const succeeded = verified?.payment_result?.response_status === 'A';
  if (!succeeded) {
    console.log(`paytabs-callback: transaction ${tranRef} not approved (status: ${verified?.payment_result?.response_status})`);
    return { statusCode: 200, body: 'ok' };
  }

  // Retrieve the order we stashed when the payment session was created.
  let order;
  try {
    const pendingRes = await fetch(`${SUPABASE_URL}/rest/v1/pending_paytabs_orders?cart_id=eq.${encodeURIComponent(cartId)}&select=order_data`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    });
    const rows = await pendingRes.json();
    if (!rows || !rows[0]) {
      console.error(`paytabs-callback: no pending order found for cart_id ${cartId}`);
      return { statusCode: 200, body: 'ok' };
    }
    order = JSON.parse(rows[0].order_data);
  } catch (err) {
    console.error('paytabs-callback: could not retrieve pending order', err);
    return { statusCode: 200, body: 'ok' };
  }

  const orderNumber = `HK-${Date.now().toString().slice(-8)}`;

  try {
    await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify({
        order_number: orderNumber,
        full_name: order.fullName, email: order.email, address: order.address, city: order.city,
        country: order.country, phone: order.phone, payment_method: 'card',
        amount: order.amount, currency: order.currency, is_gift: !!order.isGift, gift_message: order.giftMessage || null,
        items: JSON.stringify(order.items), bundle_discount_pct: order.bundleDiscountPct || 0,
        promo_code: order.promoCode || null, payment_status: 'paid', order_status: 'received',
        paytabs_tran_ref: tranRef, created_at: new Date().toISOString(),
      }),
    });
  } catch (err) {
    console.error('paytabs-callback: could not save order', err);
  }

  const itemsListHtml = (order.items || []).map(i => `<li>${i.story}${i.childName ? ' for ' + i.childName : ''}${i.ageEdition ? ' (Ages ' + i.ageEdition + ')' : ''}</li>`).join('');
  await sendEmail({
    to: order.email,
    subject: `Your Hikaya order is confirmed — ${orderNumber}`,
    html: emailShell(`
      <h2 style="font-family:Georgia,serif; font-size:20px; margin:0 0 12px;">Thank you, ${(order.fullName || '').split(' ')[0]}!</h2>
      <p style="font-size:14px; line-height:1.6; color:#5b4a3d;">Your Hikaya storybook order is confirmed and payment received:</p>
      <ul style="font-size:14px; line-height:1.8; color:#5b4a3d; padding-left:18px;">${itemsListHtml}</ul>
      <p style="font-size:14px; line-height:1.6; color:#5b4a3d;">It ships to <strong>${order.address}, ${order.city}</strong>.</p>
      <div style="background:#F3E8D8; border-radius:10px; padding:14px 16px; margin:18px 0; font-size:13px;"><strong>Order reference:</strong> ${orderNumber}</div>
      <p style="font-size:13px; color:#7d6a5a;">Questions? Just reply to this email.</p>
    `)
  });

  // Clean up the pending-order stash now that it's a real order.
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/pending_paytabs_orders?cart_id=eq.${encodeURIComponent(cartId)}`, {
      method: 'DELETE',
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    });
  } catch { /* not critical */ }

  return { statusCode: 200, body: 'ok' };
};
