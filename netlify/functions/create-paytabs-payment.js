// netlify/functions/create-paytabs-payment.js
//
// Creates a PayTabs Hosted Payment Page session for a card order. This is
// the PCI-safe integration type: card numbers are typed directly into a
// page PayTabs controls (embedded here as an iframe), never touching our
// server or code at all.
//
// SETUP (Netlify env vars):
//   PAYTABS_PROFILE_ID  — from your PayTabs dashboard
//   PAYTABS_SERVER_KEY  — your PayTabs server key (keep secret, server-side only)
//   PAYTABS_DOMAIN      — the regional API domain for your account, e.g.
//                         https://secure.paytabs.com (confirm the exact one
//                         for your account under PayTabs dashboard > "What is
//                         my region/endpoint URL?" -- this varies by region
//                         and getting it wrong causes auth errors, not a
//                         clear "wrong domain" message)
//
// Flow: this function creates the payment session and returns an iframe-
// embeddable URL. The customer pays on PayTabs' own page inside that
// iframe. PayTabs then does two things once payment finishes:
//   1. POSTs the result server-to-server to paytabs-callback.js (the
//      authoritative source of truth -- always trusted over anything the
//      browser reports, since a customer closing their browser early would
//      otherwise leave us never knowing what happened)
//   2. Redirects the iframe to paytabs-return.js, which relays a message
//      to the parent checkout page so the UI can update immediately

const SUPABASE_URL = 'https://zxzlarlpoctpnnnvzced.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4emxhcmxwb2N0cG5ubnZ6Y2VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NTIwODUsImV4cCI6MjEwNDAyODA4NX0.NURv-OB9GIU23fsMAlsMFD59oxuKqc1hDHNuoUHQ21E';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const profileId = process.env.PAYTABS_PROFILE_ID;
  const serverKey = process.env.PAYTABS_SERVER_KEY;
  const domain = process.env.PAYTABS_DOMAIN || 'https://secure.paytabs.com';

  if (!profileId || !serverKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Card payment isn\'t set up yet -- add PAYTABS_PROFILE_ID and PAYTABS_SERVER_KEY in Netlify environment variables, then redeploy.' })
    };
  }

  let order;
  try {
    order = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request.' }) };
  }

  const { fullName, email, phone, address, city, country, amount, currency, items } = order;
  if (!fullName || !email || !phone || !address || !city || !amount || !currency) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing required order details.' }) };
  }
  if (!items || !Array.isArray(items) || items.length === 0) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Your cart is empty.' }) };
  }

  // Every order gets a unique cart_id so PayTabs' callback can be matched
  // back to the right pending order.
  const cartId = `HK-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const siteUrl = process.env.URL || 'https://maison-jaber.com';

  // Stash the pending order so paytabs-callback.js can retrieve and save it
  // once payment is confirmed -- we don't save it to the real `orders`
  // table until PayTabs actually confirms the charge succeeded.
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/pending_paytabs_orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        cart_id: cartId, order_data: JSON.stringify(order), created_at: new Date().toISOString(),
      }),
    });
  } catch (err) {
    console.warn('Could not stash pending order (pending_paytabs_orders table may not exist yet):', err);
  }

  const paytabsPayload = {
    profile_id: Number(profileId),
    tran_type: 'sale',
    tran_class: 'ecom',
    cart_id: cartId,
    cart_currency: currency,
    cart_amount: amount,
    cart_description: `Hikaya order — ${items.map(i => i.story).join(', ')}`,
    customer_details: {
      name: fullName, email, phone, street1: address, city, country: country || 'AE',
    },
    return: `${siteUrl}/.netlify/functions/paytabs-return`,
    callback: `${siteUrl}/.netlify/functions/paytabs-callback`,
    framed: true, // lets us embed the payment page in an iframe instead of a full-page redirect
    hide_shipping: true,
  };

  try {
    const res = await fetch(`${domain}/payment/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: serverKey,
      },
      body: JSON.stringify(paytabsPayload),
    });
    const data = await res.json();
    if (!res.ok || !data.redirect_url) {
      console.error('PayTabs payment request failed:', data);
      return { statusCode: 502, body: JSON.stringify({ error: data.message || 'Could not start the payment. Please try again.' }) };
    }
    return { statusCode: 200, body: JSON.stringify({ redirectUrl: data.redirect_url, cartId }) };
  } catch (err) {
    console.error('create-paytabs-payment error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Something went wrong starting the payment. Please try again.' }) };
  }
};
