/**wqdgit
 *  DEPRECATED: This file is no longer used.
 * Firebase Cloud Functions have been migrated to Supabase.
 * 
 * See SUPABASE_MIGRATION.md for:
 * - Option A: Supabase Edge Functions (createSubscription, verifyPayment)
 * - Option B: Node.js backend server
 * 
 * This file is kept for reference only and can be safely deleted.
 */

// =========================
// LEGACY FIREBASE FUNCTIONS
// =========================

/**
 * Menu DNA — Firebase Cloud Functions (DEPRECATED)
 * Razorpay backend: subscription creation, payment verification, webhook handling
 *
 * Deploy: firebase deploy --only functions
 * Requires: firebase-functions, firebase-admin, razorpay, cors
 */

const functions  = require('firebase-functions');
const admin      = require('firebase-admin');
const Razorpay   = require('razorpay');
const crypto     = require('crypto');
const cors       = require('cors')({ origin: true });

admin.initializeApp();
const db = admin.firestore();

// ─── Razorpay client (secrets stay server-side only) ──────────────────────────
const razorpay = new Razorpay({
  key_id:     functions.config().razorpay.key_id,
  key_secret: functions.config().razorpay.key_secret,
});

// ─── Plan ID map (Razorpay Dashboard plan IDs) ────────────────────────────────
const PLAN_IDS = {
  growth: functions.config().razorpay.plan_growth,
  pro:    functions.config().razorpay.plan_pro,
};

// ─── 1. Create Subscription ──────────────────────────────────────────────────
/**
 * Called by frontend before opening Razorpay checkout.
 * Creates a Razorpay Subscription and returns the subscription_id.
 *
 * POST body: { planId, userId, email }
 * Returns:   { subscriptionId }
 */
exports.createSubscription = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { planId, userId, email } = req.body;

    if (!planId || !userId || !email) {
      return res.status(400).json({ error: 'planId, userId, email are required' });
    }

    const razorpayPlanId = PLAN_IDS[planId];
    if (!razorpayPlanId) {
      return res.status(400).json({ error: `Unknown plan: ${planId}` });
    }

    try {
      const subscription = await razorpay.subscriptions.create({
        plan_id:         razorpayPlanId,
        total_count:     12,               // 12 billing cycles (1 year)
        quantity:        1,
        customer_notify: 1,
        notes: {
          userId,
          email,
          planId,
          product: 'menu-dna',
        },
      });

      // Store pending subscription in Firestore
      await db.collection('users').doc(userId)
        .collection('subscriptions').doc(subscription.id).set({
          subscriptionId: subscription.id,
          planId,
          status:     'created',
          createdAt:  admin.firestore.FieldValue.serverTimestamp(),
        });

      return res.json({ subscriptionId: subscription.id });
    } catch (err) {
      console.error('createSubscription error:', err);
      return res.status(500).json({ error: err.message });
    }
  });
});

// ─── 2. Verify Payment Signature ─────────────────────────────────────────────
/**
 * Called by frontend after successful payment to verify signature.
 * ⚠️  This is the security-critical step. Never skip this.
 *
 * POST body: { razorpay_payment_id, razorpay_subscription_id, razorpay_signature, userId, planId }
 * Returns:   { verified: true }
 */
exports.verifyPayment = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const {
      razorpay_payment_id,
      razorpay_subscription_id,
      razorpay_signature,
      userId,
      planId,
    } = req.body;

    if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment fields' });
    }

    try {
      // ── Signature verification ────────────────────────────────────────────
      const body    = razorpay_payment_id + '|' + razorpay_subscription_id;
      const secret  = functions.config().razorpay.key_secret;
      const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');

      if (expected !== razorpay_signature) {
        console.warn('Signature mismatch for payment:', razorpay_payment_id);
        return res.status(400).json({ verified: false, error: 'Signature mismatch' });
      }

      // ── Activate plan in Firestore ────────────────────────────────────────
      const userRef = db.collection('users').doc(userId);
      await userRef.update({
        plan:                    planId,
        planStatus:              'active',
        planActivatedAt:         admin.firestore.FieldValue.serverTimestamp(),
        razorpaySubscriptionId:  razorpay_subscription_id,
      });

      // ── Log payment record ────────────────────────────────────────────────
      await userRef.collection('payments').add({
        planId,
        type:                       'subscription',
        status:                     'success',
        razorpayPaymentId:          razorpay_payment_id,
        razorpaySubscriptionId:     razorpay_subscription_id,
        razorpaySignature:          razorpay_signature,
        createdAt:                  admin.firestore.FieldValue.serverTimestamp(),
      });

      return res.json({ verified: true });
    } catch (err) {
      console.error('verifyPayment error:', err);
      return res.status(500).json({ error: err.message });
    }
  });
});

// ─── 3. Razorpay Webhook ──────────────────────────────────────────────────────
/**
 * Receives async events from Razorpay (subscription renewals, cancellations, failures).
 * Register this URL in Razorpay Dashboard → Settings → Webhooks.
 *
 * URL: https://your-region-project.cloudfunctions.net/razorpayWebhook
 * Secret: set in Razorpay dashboard and match VITE_RAZORPAY_WEBHOOK_SECRET
 */
exports.razorpayWebhook = functions.https.onRequest(async (req, res) => {
  const webhookSecret = functions.config().razorpay.webhook_secret;
  const signature     = req.headers['x-razorpay-signature'];
  const body          = req.rawBody;

  // ── Verify webhook signature ──────────────────────────────────────────────
  const expectedSig = crypto
    .createHmac('sha256', webhookSecret)
    .update(body)
    .digest('hex');

  if (expectedSig !== signature) {
    console.warn('Invalid webhook signature');
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const event = req.body;
  console.log('Razorpay webhook event:', event.event);

  try {
    switch (event.event) {

      // ── Subscription activated / renewed ─────────────────────────────────
      case 'subscription.activated':
      case 'subscription.charged': {
        const sub    = event.payload.subscription.entity;
        const userId = sub.notes?.userId;
        if (userId) {
          await db.collection('users').doc(userId).update({
            planStatus:             'active',
            planRenewedAt:          admin.firestore.FieldValue.serverTimestamp(),
            razorpaySubscriptionId: sub.id,
          });
        }
        break;
      }

      // ── Subscription cancelled ────────────────────────────────────────────
      case 'subscription.cancelled':
      case 'subscription.completed': {
        const sub    = event.payload.subscription.entity;
        const userId = sub.notes?.userId;
        if (userId) {
          await db.collection('users').doc(userId).update({
            plan:       'starter',
            planStatus: 'cancelled',
            planCancelledAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
        break;
      }

      // ── Payment failed ────────────────────────────────────────────────────
      case 'subscription.halted':
      case 'payment.failed': {
        const sub    = event.payload.subscription?.entity;
        const userId = sub?.notes?.userId;
        if (userId) {
          await db.collection('users').doc(userId).update({
            planStatus: 'payment_failed',
          });
        }
        break;
      }

      default:
        console.log('Unhandled webhook event:', event.event);
    }

    return res.json({ received: true });
  } catch (err) {
    console.error('Webhook handler error:', err);
    return res.status(500).json({ error: err.message });
  }
});
