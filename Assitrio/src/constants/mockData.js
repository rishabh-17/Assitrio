// ── Initial Mock Data ──
export const INITIAL_NOTES = [];

export const INITIAL_ACTIVITIES = [];

// ── Listen Simulator Phrases ──
export const LISTEN_PHRASES = [
  "So regarding the marketing budget...",
  "Haan, budget thoda tight hai is quarter mein.",
  "But we need to run the Diwali campaign right?",
  "Okay, let's allocate 5 lakhs for digital ads.",
  "And 2 lakhs for influencer collaboration.",
  "Done. I'll send the revised plan by evening.",
];

// ── AI Response Templates (Talk Simulator) ──
export const AI_RESPONSES = {
  rahul: "Based on your conversation with Rahul yesterday, he agreed to a **10% volume discount** for laptop orders above 50 units, with delivery in 5 working days. Payment terms are 30 days post-delivery.",
  laptop: "Your vendor Rahul confirmed a 10% discount on laptops. You have a PO for 55 units already approved. Pending: sending the confirmation email to Rahul.",
  techcorp: "In the TechCorp discussion today, you finalized API integration for Q3. The timeline was extended by 2 weeks, and you need to assign 2 additional developers. A new SOW needs to be drafted.",
  sow: "You need to draft a new Statement of Work for TechCorp Solutions. This came from today's client discussion. The API integration scope was finalized for Q3 delivery.",
  budget: "From the marketing budget discussion, 5 lakhs were allocated for digital ads and 2 lakhs for influencer collaboration for the Diwali campaign.",
  design: "In the design review, the team approved the mobile flow structure. Font sizes need to increase by 2px, and the CTA button color changes from Blue to Indigo.",
  doctor: "Dr. Sharma reviewed your MRI showing a mild L4-L5 bulge. He recommended physiotherapy 3 times per week for 6 weeks. No surgery is needed. You have a follow-up in 6 weeks.",
  sprint: "Sprint 14 is on track. Backend micro-services migration is 70% complete. Frontend is blocked on design tokens. QA starts regression testing Thursday, with a demo Friday.",
  pending: "You currently have multiple pending tasks across your conversations. The most critical ones include drafting a new SOW for TechCorp and following up with the design team for tokens.",
  default: "Based on your recent conversations, you have several action items pending. Would you like me to summarize a specific meeting or list your critical tasks?"
};

// ── Timing Constants ──
export const PROCESSING_DELAY_MS = 2000;
export const VOICE_RECORD_DURATION_MS = 2500;
export const AI_RESPONSE_DELAY_MS = 1500;
export const AI_SPEAKING_DURATION_MS = 3000;
export const LISTEN_PHRASE_INTERVAL_MS = 2200;
