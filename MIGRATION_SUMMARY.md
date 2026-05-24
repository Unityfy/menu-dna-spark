# Firebase to Supabase Migration - Implementation Summary

## ✅ Changes Completed

### 1. **Code Changes Made**

#### Created New Files:
- ✅ `src/supabase.js` - Supabase client initialization (replaces firebase.js)
- ✅ `SUPABASE_MIGRATION.md` - Comprehensive setup guide

#### Updated Files:
- ✅ `package.json` - Replaced `firebase` with `@supabase/supabase-js`
- ✅ `src/hooks/useAuth.jsx` - Migrated to Supabase Auth
- ✅ `src/hooks/useRestaurant.jsx` - Migrated to Supabase PostgreSQL
- ✅ `src/hooks/useBilling.jsx` - Migrated to Supabase database
- ✅ `src/components/Sidebar.jsx` - Updated profile field references
- ✅ `src/pages/DashboardPage.jsx` - Updated profile field references
- ✅ `src/firebase.js` - Marked as deprecated

#### Deprecated Files (can be deleted):
- `src/firebase.js` - No longer used
- `functions/index.js` - Firebase Cloud Functions are replaced by Supabase Edge Functions

---

## 📋 What You Need to Do in Supabase

### Step 1: Create a Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Sign up / Log in
3. Create a new project
4. Save your **Project URL** and **Anon Key**

### Step 2: Create Database Tables
Run the following SQL in your Supabase **SQL Editor** (to execute all at once):

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
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

-- Menu Data table
CREATE TABLE menu_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255),
  category VARCHAR(100),
  price DECIMAL(10, 2),
  cost DECIMAL(10, 2),
  quantity INT,
  sales INT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_menu_data_user_id ON menu_data(user_id);

-- Uploads table
CREATE TABLE uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_name VARCHAR(255),
  dish_count INT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_uploads_user_id ON uploads(user_id);

-- Payments table
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

-- Subscriptions table (for tracking)
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

### Step 3: Enable Row Level Security (RLS)
Run these SQL commands in your **SQL Editor**:

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users RLS - Users can only read/write their own data
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Menu Data RLS - Users can manage only their own menu data
CREATE POLICY "Users can manage own menu data" ON menu_data
  FOR ALL USING (auth.uid() = user_id);

-- Uploads RLS - Users can manage only their own uploads
CREATE POLICY "Users can manage own uploads" ON uploads
  FOR ALL USING (auth.uid() = user_id);

-- Payments RLS - Users can read only their own payments
CREATE POLICY "Users can read own payments" ON payments
  FOR SELECT USING (auth.uid() = user_id);

-- Subscriptions RLS - Users can manage only their own subscriptions
CREATE POLICY "Users can manage own subscriptions" ON subscriptions
  FOR ALL USING (auth.uid() = user_id);
```

### Step 4: Set Environment Variables
Create or update `.env.local` in your project root:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Backend URL (for Razorpay functions)
VITE_BACKEND_URL=https://your-project.supabase.co/functions/v1
```

Get these values from your Supabase Dashboard:
- Settings → API → Project URL
- Settings → API → `anon` key

### Step 5: Set Up Backend Functions
Choose **one** option:

#### **Option A: Supabase Edge Functions (Recommended)**

1. Install Supabase CLI:
```bash
npm install -g supabase
```

2. Initialize in your project:
```bash
supabase init
```

3. Create functions:
```bash
supabase functions new createSubscription
supabase functions new verifyPayment
```

4. Add function code from `SUPABASE_MIGRATION.md` (Option A section)

5. Set secrets:
```bash
supabase secrets set RAZORPAY_KEY_ID=your_key
supabase secrets set RAZORPAY_KEY_SECRET=your_secret
supabase secrets set RAZORPAY_PLAN_GROWTH=plan_xxx
supabase secrets set RAZORPAY_PLAN_PRO=plan_yyy
```

6. Deploy:
```bash
supabase functions deploy
```

#### **Option B: Node.js Backend Server**

1. Create `backend/` folder with the code from `SUPABASE_MIGRATION.md` (Option B section)

2. Install dependencies:
```bash
cd backend
npm install express cors dotenv razorpay @supabase/supabase-js
```

3. Create `backend/.env`:
```env
SUPABASE_URL=your_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
RAZORPAY_KEY_ID=your_key
RAZORPAY_KEY_SECRET=your_secret
RAZORPAY_PLAN_GROWTH=plan_xxx
RAZORPAY_PLAN_PRO=plan_yyy
PORT=3000
```

4. Deploy to your hosting (Heroku, Railway, Render, etc.)

### Step 6: Install Dependencies Locally
```bash
npm install
```

This will install `@supabase/supabase-js` and remove the Firebase dependency.

### Step 7: Verify Migration
- [ ] Test user sign-up
- [ ] Test user sign-in
- [ ] Test menu data upload
- [ ] Test menu data loading
- [ ] Test payment flow
- [ ] Check Supabase dashboard for data

---

## 🔄 Migration Checklist

### Database Setup
- [ ] Create Supabase project
- [ ] Run SQL table creation scripts
- [ ] Enable Row Level Security
- [ ] Test RLS policies

### Authentication
- [ ] Verify sign-up works
- [ ] Verify sign-in works
- [ ] Verify sign-out works
- [ ] Check user profile data saves correctly

### Data Operations
- [ ] Test menu data upload
- [ ] Test menu data retrieval
- [ ] Test uploads history
- [ ] Verify data filtering by user_id (RLS)

### Payment Integration
- [ ] Deploy backend functions
- [ ] Test subscription creation
- [ ] Test payment verification
- [ ] Verify plan activation

### Deployment
- [ ] Set environment variables in production
- [ ] Deploy frontend
- [ ] Deploy backend (Edge Functions or Node.js)
- [ ] Test all features in production

---

## 📚 Key Migration Details

### Field Name Changes
Supabase uses snake_case for database columns:

| Old (Firebase) | New (Supabase) |
|---|---|
| `uid` | `id` |
| `displayName` | `display_name` |
| `restaurantName` | `restaurant_name` |
| `createdAt` | `created_at` |
| `planActivatedAt` | `plan_activated_at` |
| `planStatus` | `plan_status` |
| `uploadedAt` | `uploaded_at` |
| `fileName` | `file_name` |
| `dishCount` | `dish_count` |
| `razorpayPaymentId` | `razorpay_payment_id` |

### API Method Changes

| Firebase | Supabase |
|---|---|
| `getDoc(doc(db, 'users', id))` | `supabase.from('users').select('*').eq('id', id).single()` |
| `getDocs(collection(...))` | `supabase.from('table').select('*')` |
| `addDoc(collection(...), data)` | `supabase.from('table').insert([data])` |
| `updateDoc(doc(...), data)` | `supabase.from('table').update(data).eq('id', id)` |
| `deleteDoc(doc(...))` | `supabase.from('table').delete().eq('id', id)` |
| `orderBy('field', 'asc')` | `.order('field', { ascending: true })` |
| `where('field', '==', value)` | `.eq('field', value)` |

---

## 🆘 Troubleshooting

### "PGRST116" Error
This is normal when trying to fetch a user record that doesn't exist yet. The code handles this gracefully.

### RLS Policy Denied
Check that:
- RLS policies are enabled
- User is authenticated
- User ID in the row matches `auth.uid()`

### Backend Function Errors
Check:
- Environment variables are set correctly
- Razorpay credentials are valid
- Backend URL matches `.env` file

### Auth Sign-in Issues
Verify:
- Email confirmation if required
- User exists in Supabase Auth
- User record exists in `users` table

---

## 📖 Useful Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [PostgREST API](https://postgrest.org/)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

---

## ✨ Summary

All code changes have been completed. Your application is now ready for Supabase! 

**Next Steps:**
1. Follow the "What You Need to Do in Supabase" section above
2. Run `npm install` to install the new Supabase dependency
3. Test locally with your Supabase project
4. Deploy to production

**Questions?** Check `SUPABASE_MIGRATION.md` for detailed guides and code examples.
