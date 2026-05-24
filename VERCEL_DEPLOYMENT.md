# Vercel Deployment Guide

## Prerequisites

1. **Supabase Project** - Already set up with tables and RLS policies
2. **Razorpay Account** - For payment processing
3. **Vercel Account** - [Sign up here](https://vercel.com/signup)
4. **Git Repository** - Your code pushed to GitHub, GitLab, or Bitbucket

---

## Step 1: Prepare Your Supabase Backend

If you haven't set this up yet, complete these steps from `SUPABASE_MIGRATION.md`:

### Create Database Tables

Run in Supabase SQL Editor:
```sql
-- Tables: users, menu_data, uploads, payments, subscriptions
-- (See SUPABASE_MIGRATION.md for full SQL)
```

### Enable Row Level Security (RLS)
```sql
-- RLS policies for all tables
-- (See SUPABASE_MIGRATION.md for full policies)
```

### Deploy Backend Functions

**Option A: Supabase Edge Functions** (Recommended)
```bash
supabase functions deploy createSubscription
supabase functions deploy verifyPayment
```

**Option B: Node.js Server**
Deploy to Heroku, Railway, Render, or similar service.

Your `VITE_BACKEND_URL` will be:
- Edge Functions: `https://your-project.supabase.co/functions/v1`
- Node Server: `https://your-backend-url.com/functions/v1`

---

## Step 2: Set Up on Vercel

### Option A: Deploy from GitHub UI (Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

2. **Import Project to Vercel**
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click "Add New" → "Project"
   - Select your GitHub repository
   - Click "Import"

3. **Configure Environment Variables**
   In the "Environment Variables" section, add:

   ```
   VITE_SUPABASE_URL = https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY = your-anon-key
   VITE_BACKEND_URL = https://your-project.supabase.co/functions/v1
   VITE_RAZORPAY_KEY_ID = rzp_live_xxxxx (production) or rzp_test_xxxxx (testing)
   VITE_RAZORPAY_PLAN_GROWTH = plan_xxxxx
   VITE_RAZORPAY_PLAN_PRO = plan_xxxxx
   ```

4. **Deploy**
   - Click "Deploy"
   - Wait for the build to complete
   - Your app will be live at `https://your-project-name.vercel.app`

### Option B: Deploy from CLI

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy**
   ```bash
   vercel
   ```

3. **Follow Prompts**
   - Confirm project setup
   - Set environment variables when prompted
   - Wait for deployment

4. **Set up production environment variables**
   ```bash
   vercel env add VITE_SUPABASE_URL production
   vercel env add VITE_SUPABASE_ANON_KEY production
   vercel env add VITE_BACKEND_URL production
   vercel env add VITE_RAZORPAY_KEY_ID production
   vercel env add VITE_RAZORPAY_PLAN_GROWTH production
   vercel env add VITE_RAZORPAY_PLAN_PRO production
   ```

5. **Deploy to production**
   ```bash
   vercel --prod
   ```

---

## Step 3: Configure Environment Variables by Environment

### Development (Preview Deployments)
```
VITE_RAZORPAY_KEY_ID = rzp_test_xxxxxxx
VITE_BACKEND_URL = https://your-project.supabase.co/functions/v1
```

### Production
```
VITE_RAZORPAY_KEY_ID = rzp_live_xxxxxxx
VITE_BACKEND_URL = https://your-project.supabase.co/functions/v1
```

---

## Step 4: Configure Custom Domain (Optional)

1. In Vercel Dashboard → Project Settings → Domains
2. Add your custom domain (e.g., `menu-dna.com`)
3. Update DNS records as instructed
4. Wait for DNS propagation (usually 24 hours)

---

## Step 5: Verify Deployment

### Check Build Logs
- Go to Vercel Dashboard
- Click on your project
- View "Deployments" tab
- Check build logs for any errors

### Test Your App
1. Visit your Vercel URL: `https://your-project.vercel.app`
2. Test sign-up
3. Test sign-in
4. Test menu upload
5. Test payment flow

### Monitor Performance
- Vercel Dashboard → Analytics tab
- Check deployment health
- Monitor error rates

---

## Environment Variables Reference

| Variable | Type | Example | Notes |
|----------|------|---------|-------|
| `VITE_SUPABASE_URL` | String | `https://abc123.supabase.co` | From Supabase Settings |
| `VITE_SUPABASE_ANON_KEY` | String | `eyJh...long key...` | From Supabase Settings |
| `VITE_BACKEND_URL` | String | `https://abc123.supabase.co/functions/v1` | Edge Functions or Node server |
| `VITE_RAZORPAY_KEY_ID` | String | `rzp_test_XXXX` or `rzp_live_XXXX` | From Razorpay Dashboard |
| `VITE_RAZORPAY_PLAN_GROWTH` | String | `plan_XXXX` | From Razorpay Dashboard |
| `VITE_RAZORPAY_PLAN_PRO` | String | `plan_XXXX` | From Razorpay Dashboard |

---

## Build Configuration

The app is configured with:
- **Framework**: Vite + React
- **Build Output**: `dist/`
- **Node Version**: 18.x
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

Configuration is in `vercel.json`:
- Automatic SPA routing (all routes redirect to `/`)
- Environment variables mapped correctly
- Builds optimized automatically

---

## Troubleshooting

### Build Fails
1. Check build logs in Vercel Dashboard
2. Verify `package.json` has all dependencies
3. Check for TypeScript errors (if using TypeScript)
4. Ensure all imports are correct

### App Shows Blank Page
1. Check browser console for errors
2. Verify environment variables are set correctly
3. Check Supabase connection
4. Verify CORS settings in Supabase

### Auth Not Working
1. Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
2. Check Supabase Auth is enabled
3. Verify redirect URLs in Supabase Auth settings
4. Check browser cookies/storage

### Payment Not Working
1. Verify Razorpay keys are for production (`rzp_live_`)
2. Check Razorpay plans exist with correct IDs
3. Verify `VITE_BACKEND_URL` is accessible
4. Check backend logs for errors

### CORS Errors
1. Ensure Supabase CORS settings allow your Vercel domain
2. Verify backend function has CORS enabled
3. Check Razorpay headers

---

## Continuous Deployment

Once deployed, Vercel automatically:
- Deploys on every push to `main` branch
- Creates preview deployments for PRs
- Runs build to check for errors
- Serves from CDN globally

### Disable Auto-Deploy
Settings → Git → Uncheck "Deploy on push"

---

## Performance Tips

1. **Images**: Optimize before upload (use compression)
2. **Code Splitting**: Vercel does this automatically
3. **Caching**: Static assets are cached by CDN
4. **Monitoring**: Enable Vercel Analytics for insights

---

## Security Best Practices

1. **Never commit `.env`** - Use `.env.example` instead
2. **Regenerate keys** if accidentally committed
3. **Use environment variables** for sensitive data
4. **Enable HTTPS** (automatic on Vercel)
5. **Update dependencies** regularly
6. **Monitor Supabase logs** for suspicious activity

---

## Next Steps

1. ✅ Push code to GitHub
2. ✅ Connect to Vercel
3. ✅ Add environment variables
4. ✅ Deploy
5. ✅ Test all features
6. ✅ Set up custom domain (optional)
7. ✅ Monitor analytics

---

## Support

- [Vercel Docs](https://vercel.com/docs)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
- [Supabase Guides](https://supabase.com/docs/guides)

---

## Configuration Files Reference

### `vercel.json`
Deploy configuration with build settings and environment variable mapping.

### `.vercelignore`
Files to exclude from upload to Vercel.

### `vite.config.js`
Vite build configuration optimized for Vercel.

### `.env.example`
Template for environment variables (commit this, not `.env`).

---

**Your app is now ready for Vercel!** 🚀
