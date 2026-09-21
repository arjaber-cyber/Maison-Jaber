// netlify/functions/check-paytabs-status.js
//
// Called by checkout.html after the payment iframe reports it's done, to
// independently confirm the result before showing a success state --
// rather than trusting the iframe's postMessage alone, which a browser
// extension or compromised page could theoretically fake. Queries PayTabs
// directly using the transaction reference.

exports.handler = async (event) => {
  const profileId = process.env.PAYTABS_PROFILE_ID;
  const serverKey = process.env.PAYTABS_SERVER_KEY;
  const domain = process.env.PAYTABS_DOMAIN || 'https://secure.paytabs.com';
  if (!profileId || !serverKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Payment checking isn\'t set up yet.' }) };
  }

  const tranRef = event.queryStringParameters && event.queryStringParameters.tranRef;
  if (!tranRef) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing transaction reference.' }) };
  }

  try {
    const res = await fetch(`${domain}/payment/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: serverKey },
      body: JSON.stringify({ profile_id: Number(profileId), tran_ref: tranRef }),
    });
    const data = await res.json();
    const approved = data?.payment_result?.response_status === 'A';
    return { statusCode: 200, body: JSON.stringify({ approved, status: data?.payment_result?.response_status || null }) };
  } catch (err) {
    console.error('check-paytabs-status error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Could not check payment status.' }) };
  }
};
