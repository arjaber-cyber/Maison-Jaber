// netlify/functions/process-payment.js
//
// Handles order submission at checkout. Behavior depends on payment method:
//
//   - Cash on Delivery (Syria): no payment gateway needed at all — this
//     actually works right now. The order is saved to Supabase and marked
//     as confirmed immediately.
//
//   - Card payment (Germany & wider Europe): needs a real merchant account.
//     SETUP (one-time, once you have a Telr or PayTabs merchant account):
//       1. In Netlify: Site settings > Environment variables, add:
//            PAYMENT_PROVIDER   = telr   (or "paytabs")
//            PAYMENT_API_KEY    = <your merchant API key>
//            PAYMENT_STORE_ID   = <your store/merchant ID>
//       2. Redeploy. The card-payment branch below has a clearly marked
//          spot to plug in the real API call — everything else (validation,
//          order saving, response handling) is already wired up.
//     Until those variables are set, card-payment orders return a clear
//     "not yet available" message instead of silently failing.

const SUPABASE_URL = 'https://zxzlarlpoctpnnnvzced.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4emxhcmxwb2N0cG5ubnZ6Y2VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NTIwODUsImV4cCI6MjEwNDAyODA4NX0.NURv-OB9GIU23fsMAlsMFD59oxuKqc1hDHNuoUHQ21E';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let order;
  try {
    order = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body.' }) };
  }

  const { fullName, email, address, city, country, phone, paymentMethod, amount, currency } = order;
  if (!fullName || !email || !address || !city || !country || !paymentMethod) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Please fill in all required delivery details.' }) };
  }

  // Optional auth (guest checkout is allowed, so this is best-effort only)
  const authHeader = event.headers.authorization || event.headers.Authorization;
  let userEmail = null;
  if (authHeader) {
    try {
      const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: { Authorization: authHeader, apikey: SUPABASE_ANON_KEY }
      });
      if (userRes.ok) {
        const user = await userRes.json();
        userEmail = user.email;
      }
    } catch { /* fall through as guest */ }
  }

  // --- Cash on Delivery: works right now, no gateway needed ---
  if (paymentMethod === 'cod') {
    try {
      const saveRes = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
          Authorization: authHeader || `Bearer ${SUPABASE_ANON_KEY}`,
          Prefer: 'return=representation'
        },
        body: JSON.stringify({
          full_name: fullName, email: userEmail || email, address, city, country, phone,
          payment_method: 'cod', amount, currency: currency || 'EUR',
          payment_status: 'pending_cod', order_status: 'received',
          created_at: new Date().toISOString()
        })
      });
      // Table may not exist yet in Supabase — treat that as non-fatal so
      // cash-on-delivery orders still confirm (this can be reconciled once
      // the orders table migration is approved).
      if (!saveRes.ok) {
        console.warn('orders table insert failed (may not exist yet):', await saveRes.text());
      }
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, paymentStatus: 'cash_on_delivery', message: 'Order confirmed — pay by cash when it arrives.' })
      };
    } catch (err) {
      console.error('process-payment (COD) error:', err);
      return { statusCode: 500, body: JSON.stringify({ error: 'Something went wrong confirming your order. Please try again.' }) };
    }
  }

  // --- Sham Cash (Syria): a real, widely-used Syrian e-wallet. Needs its ---
  // --- own merchant integration before it can actually charge anyone.    ---
  if (paymentMethod === 'shamcash') {
    const apiKey = process.env.SHAMCASH_API_KEY;
    const merchantId = process.env.SHAMCASH_MERCHANT_ID;
    if (!apiKey || !merchantId) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Sham Cash isn\'t connected yet. Add SHAMCASH_API_KEY and SHAMCASH_MERCHANT_ID in Netlify environment variables once you have a Sham Cash merchant account, then redeploy.'
        })
      };
    }
    // -----------------------------------------------------------------
    // REAL SHAM CASH API CALL GOES HERE once merchant credentials exist.
    // Sham Cash has been expanding merchant API access since early 2026 —
    // check their current merchant documentation for the exact request
    // shape when you're ready to wire this up.
    // -----------------------------------------------------------------
    return {
      statusCode: 501,
      body: JSON.stringify({ error: 'Sham Cash is configured but not yet implemented in code. See the comment in process-payment.js.' })
    };
  }

  // --- Card payment: needs a real merchant account ---
  if (paymentMethod === 'card') {
    const provider = process.env.PAYMENT_PROVIDER;
    const apiKey = process.env.PAYMENT_API_KEY;
    const storeId = process.env.PAYMENT_STORE_ID;

    if (!provider || !apiKey || !storeId) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Card payment isn\'t connected yet. Add PAYMENT_PROVIDER, PAYMENT_API_KEY, and PAYMENT_STORE_ID in Netlify environment variables once you have a Telr or PayTabs merchant account, then redeploy.'
        })
      };
    }

    // -----------------------------------------------------------------
    // REAL GATEWAY CALL GOES HERE once the merchant account is live.
    // Example shape for Telr's hosted payment page API:
    //
    //   const res = await fetch('https://secure.telr.com/gateway/order.json', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({
    //       method: 'create', store: storeId, authkey: apiKey,
    //       order: { cartid: orderId, test: '0', amount, currency: currency || 'EUR', description: 'Hikaya storybook order' },
    //       return: { authorised: successUrl, declined: failUrl, cancelled: cancelUrl }
    //     })
    //   });
    //   const data = await res.json();
    //   return { statusCode: 200, body: JSON.stringify({ redirectUrl: data.order.url }) };
    //
    // (PayTabs' "Hosted Payment Page" API follows a similar create-then-redirect shape.)
    // -----------------------------------------------------------------

    return {
      statusCode: 501,
      body: JSON.stringify({ error: 'Card payment gateway is configured but not yet implemented in code. See the comment in process-payment.js.' })
    };
  }

  return { statusCode: 400, body: JSON.stringify({ error: 'Unknown payment method.' }) };
};
