/* Hikaya dashboard — Campaigns (Nov 2026).
   Google Ads campaigns compared side by side, from admin-campaigns.js:
   spend and clicks (Google Ads), tracked sessions, engagement, free cover previews and checkouts
   (cookie-free counter), verified paid orders and revenue (orders table), CPA and ROAS.
   Loaded by admin.html; started with window.hkCampaigns.load(password). */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const n0 = v => Number(v || 0).toLocaleString('en-AE');
  const aed = v => v == null ? '—' : 'AED ' + Number(v).toLocaleString('en-AE', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const pc = v => v == null ? '—' : Number(v).toLocaleString('en-AE', { maximumFractionDigits: 1 }) + '%';
  const secs = v => { if (v == null) return '—'; const s = Math.round(Number(v)); return s >= 60 ? Math.floor(s / 60) + 'm ' + (s % 60) + 's' : s + 's'; };
  const RANGES = [['today', 'Today'], ['7d', '7 days'], ['14d', '14 days'], ['30d', '30 days'], ['all', 'Since 1 Nov']];
  let pw = null, range = '7d', busy = false;

  const METRICS = [
    ['Ad spend', r => aed(r.spend_aed)],
    ['Clicks (Google Ads)', r => n0(r.clicks)],
    ['Tracked sessions', r => n0(r.sessions) + (r.clicks ? ` <small>(${Math.round(100 * r.sessions / r.clicks)}% of clicks)</small>` : '')],
    ['Engaged sessions', r => n0(r.engaged_sessions)],
    ['Avg. engagement time', r => secs(r.avg_engagement_sec)],
    ['Cover previews started', r => n0(r.preview_starts)],
    ['Cover previews completed', r => n0(r.previews_completed)],
    ['Cover-preview conversion rate', r => pc(r.preview_rate)],
    ['Checkout starts', r => n0(r.checkout_starts)],
    ['Checkout rate', r => pc(r.checkout_rate)],
    ['Verified paid orders', r => n0(r.orders)],
    ['Revenue (paid)', r => aed(r.revenue_aed)],
    ['Cost per acquisition', r => r.orders ? aed(r.cpa_aed) : (Number(r.spend_aed) ? 'no orders yet' : '—')],
    ['ROAS', r => r.roas == null ? '—' : Number(r.roas).toFixed(2) + '×'],
    ['Free-code orders (not revenue)', r => n0(r.free_orders)],
  ];

  function load(password) {
    if (password) pw = password;
    const root = $('cz-root'); if (!root) return;
    if (!root.dataset.ready) {
      root.dataset.ready = '1';
      root.innerHTML = `
        <div class="op-toolbar">
          <div class="op-seg" role="group" aria-label="Time range">${RANGES.map(([k, l]) => `<button type="button" data-range="${k}" aria-pressed="${k === range}">${l}</button>`).join('')}</div>
          <button type="button" class="op-btn ghost" id="cz-refresh">Refresh</button>
        </div>
        <div id="cz-body"><div class="state-box">Loading campaigns…</div></div>
        <p class="vz-note">How a visit is matched to a campaign: Google's campaign id on the ad click (auto-tagging), else the campaign's own UTM tag. Clicks from before 11 Nov arrived without a campaign id: Saudi visitors are placed in KSA Search (it is the only Saudi campaign), the rest are shown as "campaign not identified". The campaign stays with the visitor's device for 30 days, so a later checkout or purchase still counts for it.
        Orders and revenue are confirmed paid orders only, counted once per order number; free-code, influencer and gift orders are never revenue. Cover previews and engagement time are counted from 11 Nov 2026. No personal data is used: no cookies, an anonymous daily code per visitor.</p>`;
      root.querySelectorAll('[data-range]').forEach(b => b.addEventListener('click', () => {
        range = b.dataset.range;
        root.querySelectorAll('[data-range]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
        fetchRange();
      }));
      $('cz-refresh').addEventListener('click', fetchRange);
    }
    fetchRange();
  }

  async function fetchRange() {
    if (busy) return; busy = true;
    const body = $('cz-body');
    try {
      const res = await fetch('/.netlify/functions/admin-campaigns?range=' + encodeURIComponent(range), { headers: { 'x-admin-password': pw } });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'Could not load campaigns.');
      render(d);
    } catch (err) {
      if (body) body.innerHTML = `<div class="state-box">${esc(err.message)}</div>`;
    } finally { busy = false; }
  }

  function render(d) {
    const rows = d.rows || [];
    const body = $('cz-body');
    if (!rows.length) { body.innerHTML = '<div class="state-box">No campaign data for this period.</div>'; return; }
    const upd = rows.map(r => r.spend_updated_at).filter(Boolean).sort().pop();
    const head = rows.map(r => `<th scope="col">${esc(r.label)}${r.attributed_inferred && !r.attributed_by_id ? ' <small title="Matched by country / click type, not by campaign id">(inferred)</small>' : ''}</th>`).join('');
    const lines = METRICS.map(([label, f]) => `<tr><th scope="row">${esc(label)}</th>${rows.map(r => `<td>${f(r)}</td>`).join('')}</tr>`).join('');
    body.innerHTML = `
      <p class="cz-sub">${esc(d.from)} → ${esc(d.to)} (Dubai time)${upd ? ' · Google Ads spend updated ' + esc(new Date(upd).toLocaleString('en-AE', { timeZone: 'Asia/Dubai', dateStyle: 'medium', timeStyle: 'short' })) : ''}</p>
      <div class="cz-scroll"><table class="cz-table"><thead><tr><th></th>${head}</tr></thead><tbody>${lines}</tbody></table></div>`;
  }

  window.hkCampaigns = { load };
})();
