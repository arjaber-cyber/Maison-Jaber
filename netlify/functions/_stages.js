// netlify/functions/_stages.js
//
// One definition of the order fulfilment pipeline, shared by the admin
// update function and the customer tracking lookup (Oct 2026).
//
//   received → ai_production → printing → back_from_printing → with_courier → delivered
//
// Older orders may still carry the previous stage keys; normalizeStage()
// maps them onto the new pipeline so nothing breaks.

const STAGES = ['received', 'ai_production', 'printing', 'back_from_printing', 'with_courier', 'delivered'];

const LEGACY = {
  preparing: 'ai_production',
  awaiting_approval: 'ai_production',
  sent_to_printing: 'printing',
  received_from_printing: 'back_from_printing',
  shipped: 'with_courier',
};

function normalizeStage(s) {
  if (!s) return 'received';
  if (s === 'cancelled' || STAGES.includes(s)) return s;
  return LEGACY[s] || 'received';
}

module.exports = { STAGES, LEGACY, normalizeStage };
