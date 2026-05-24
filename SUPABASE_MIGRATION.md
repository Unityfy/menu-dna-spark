# Firebase to Supabase Migration Guide

## 1. Environment Variables

Create a `.env.local` file in your project root with these variables:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Backend URL (for Razorpay functions)
VITE_BACKEND_URL=https://your-project.supabase.co/functions/v1
```

You can find these values in your Supabase dashboard:
- Go to Settings → API
- Copy the Project URL and anon key

## 2. Supabase Database Schema Setup

Create the following tables in your Supabase project (in the SQL Editor):

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(255),
  restaurant_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'owner',
  plan VARCHAR(50) DEFAULT 'starter',
  plan_status VARCHAR(50),
  plan_activated_at TIMESTAMP WITH TIME ZONE,
  razorpay_subscription_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Menu Data Table
```sql
CREATE TABLE menu_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255),
  category VARCHAR(100),
  price DECIMAL(10, 2),
  cost DECIMAL(10, 2),
  quantity INT,
  sales INT,
  -- Add other dish-specific fields as needed
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_menu_data_user_id ON menu_data(user_id);
```

### Uploads Table
```sql
CREATE TABLE uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_name VARCHAR(255),
  dish_count INT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_uploads_user_id ON uploads(user_id);
```

### Payments Table
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id VARCHAR(50),
  type VARCHAR(50),
  status VARCHAR(50),
  razorpay_payment_id VARCHAR(255),
  razorpay_order_id VARCHAR(255),
  razorpay_subscription_id VARCHAR(255),
  razorpay_signature VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payments_user_id ON payments(user_id);
```

### Subscriptions Table (optional, for tracking)
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id VARCHAR(255),
  plan_id VARCHAR(50),
  status VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
```

## 3. Row-Level Security (RLS) Policies

Enable RLS on all tables and create these policies:

### Users Table RLS
```sql
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can read/write their own data
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);
```

### Menu Data Table RLS
```sql
ALTER TABLE menu_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own menu data" ON menu_data
  FOR ALL USING (auth.uid() = user_id);
```

### Uploads Table RLS
```sql
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own uploads" ON uploads
  FOR ALL USING (auth.uid() = user_id);
```

### Payments Table RLS
```sql
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own payments" ON payments
  FOR SELECT USING (auth.uid() = user_id);
```

### Subscriptions Table RLS
```sql
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own subscriptions" ON subscriptions
  FOR ALL USING (auth.uid() = user_id);
```

## 4. Backend: Replace Firebase Cloud Functions

### Option A: Supabase Edge Functions (Recommended)

Create a new Supabase Edge Function:

```bash
supabase functions new createSubscription
supabase functions new verifyPayment
```

**createSubscription** (`supabase/functions/createSubscription/index.ts`):
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { planId, userId, email } = await req.json();

    // Validate inputs
    if (!planId || !userId || !email) {
      return new Response(
        JSON.stringify({ error: "planId, userId, email are required" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Initialize Razorpay client
    const RazorpayKey = Deno.env.get("RAZORPAY_KEY_ID");
    const RazorpaySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (!RazorpayKey || !RazorpaySecret) {
      throw new Error("Missing Razorpay credentials");
    }

    // Map plan IDs
    const PLAN_IDS = {
      growth: Deno.env.get("RAZORPAY_PLAN_GROWTH"),
      pro: Deno.env.get("RAZORPAY_PLAN_PRO"),
    };

    const razorpayPlanId = PLAN_IDS[planId];
    if (!razorpayPlanId) {
      return new Response(
        JSON.stringify({ error: `Unknown plan: ${planId}` }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Create Razorpay subscription
    const auth = btoa(`${RazorpayKey}:${RazorpaySecret}`);
    const response = await fetch("https://api.razorpay.com/v1/subscriptions", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        plan_id: razorpayPlanId,
        total_count: 12,
        quantity: 1,
        customer_notify: 1,
        notes: {
          userId,
          email,
          planId,
          product: "menu-dna",
        },
      }),
    });

    const subscription = await response.json();

    // Store pending subscription in Supabase
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await supabase.from("subscriptions").insert([
      {
        user_id: userId,
        subscription_id: subscription.id,
        plan_id: planId,
        status: "created",
      },
    ]);

    return new Response(
      JSON.stringify({ subscriptionId: subscription.id }),
      { headers: corsHeaders }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});
```

**verifyPayment** (`supabase/functions/verifyPayment/index.ts`):
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      razorpay_payment_id,
      razorpay_subscription_id,
      razorpay_signature,
      userId,
      planId,
    } = await req.json();

    // ⚠️ Security-critical: Verify signature
    const RazorpaySecret = Deno.env.get("RAZORPAY_KEY_SECRET")!;
    const body = razorpay_payment_id + "|" + razorpay_subscription_id;
    
    // Create HMAC SHA256
    const encoder = new TextEncoder();
    const data = encoder.encode(body);
    const keyData = encoder.encode(RazorpaySecret);
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", key, data);
    const expected = Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (expected !== razorpay_signature) {
      return new Response(
        JSON.stringify({ verified: false, error: "Signature mismatch" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Update user plan in Supabase
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await supabase
      .from("users")
      .update({
        plan: planId,
        plan_status: "active",
        plan_activated_at: new Date().toISOString(),
        razorpay_subscription_id,
      })
      .eq("id", userId);

    // Log payment
    await supabase.from("payments").insert([
      {
        user_id: userId,
        plan_id: planId,
        type: "subscription",
        status: "success",
        razorpay_payment_id,
        razorpay_subscription_id,
        razorpay_signature,
      },
    ]);

    return new Response(JSON.stringify({ verified: true }), {
      headers: corsHeaders,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});
```

Deploy with:
```bash
supabase functions deploy createSubscription
supabase functions deploy verifyPayment
```

### Option B: Node.js Backend Server

If you prefer a separate Node.js server, install dependencies:
```bash
npm install express cors dotenv razorpay @supabase/supabase-js
```

Create `backend/index.js`:
```javascript
const express = require('express');
const cors = require('cors');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Razorpay client
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const PLAN_IDS = {
  growth: process.env.RAZORPAY_PLAN_GROWTH,
  pro: process.env.RAZORPAY_PLAN_PRO,
};

// Create subscription
app.post('/functions/v1/createSubscription', async (req, res) => {
  try {
    const { planId, userId, email } = req.body;

    if (!planId || !userId || !email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const razorpayPlanId = PLAN_IDS[planId];
    if (!razorpayPlanId) {
      return res.status(400).json({ error: `Unknown plan: ${planId}` });
    }

    const subscription = await razorpay.subscriptions.create({
      plan_id: razorpayPlanId,
      total_count: 12,
      quantity: 1,
      customer_notify: 1,
      notes: { userId, email, planId, product: 'menu-dna' },
    });

    // Store in Supabase
    await supabase.from('subscriptions').insert([{
      user_id: userId,
      subscription_id: subscription.id,
      plan_id: planId,
      status: 'created',
    }]);

    res.json({ subscriptionId: subscription.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Verify payment
app.post('/functions/v1/verifyPayment', async (req, res) => {
  try {
    const {
      razorpay_payment_id,
      razorpay_subscription_id,
      razorpay_signature,
      userId,
      planId,
    } = req.body;

    // Verify signature
    const body = razorpay_payment_id + '|' + razorpay_subscription_id;
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expected !== razorpay_signature) {
      return res.status(400).json({ verified: false, error: 'Signature mismatch' });
    }

    // Update user in Supabase
    await supabase
      .from('users')
      .update({
        plan: planId,
        plan_status: 'active',
        plan_activated_at: new Date().toISOString(),
        razorpay_subscription_id,
      })
      .eq('id', userId);

    // Log payment
    await supabase.from('payments').insert([{
      user_id: userId,
      plan_id: planId,
      type: 'subscription',
      status: 'success',
      razorpay_payment_id,
      razorpay_subscription_id,
      razorpay_signature,
    }]);

    res.json({ verified: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
```

## 5. Install Dependencies

```bash
npm install
```

This will install `@supabase/supabase-js` replacing Firebase.

## 6. Update Your `.env` file

Replace Firebase environment variables with:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_BACKEND_URL=your_backend_url (Supabase Edge Functions or Node.js server)
```

## 7. Key Differences to Remember

| Firebase | Supabase |
|----------|----------|
| `auth.uid()` | `user.id` |
| `.uid` property | `.id` property |
| `doc(db, 'users', userId)` | `.from('users').eq('id', userId)` |
| `collection(db, 'users')` | `.from('users')` |
| `getDoc()` | `.select().single()` |
| `getDocs()` | `.select()` |
| `addDoc()` | `.insert()` |
| `updateDoc()` | `.update()` |
| `deleteDoc()` | `.delete()` |
| `setDoc()` | `.insert()` |
| `orderBy()` | `.order()` |
| `where()` | `.eq()` / `.neq()` / `.lt()` etc |
| `serverTimestamp()` | `new Date().toISOString()` |

## 8. Testing

1. Test authentication flows (sign up, sign in, sign out)
2. Test menu data operations (upload, load, save)
3. Test payment flow integration
4. Verify RLS policies work correctly
5. Test error handling

## 9. Production Deployment

1. Set environment variables in your deployment platform (Vercel, Netlify, etc.)
2. Deploy backend (Supabase Edge Functions or Node.js server)
3. Test all flows in staging environment
4. Monitor Supabase metrics and logs
5. Set up Supabase backups

## 10. Additional Resources

- [Supabase Docs](https://supabase.com/docs)
- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [PostgREST API](https://postgrest.org/)
- [RLS Policies Guide](https://supabase.com/docs/guides/auth/row-level-security)
