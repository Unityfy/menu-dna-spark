# Vercel Deployment Checklist

## Pre-Deployment (Local)

### Setup
- [ ] Node.js 18+ installed
- [ ] Code pushed to GitHub/GitLab/Bitbucket
- [ ] `.env.local` file created with Supabase credentials
- [ ] `npm install` completed locally
- [ ] `npm run build` succeeds without errors
- [ ] `npm run preview` works and app loads

### Code Quality
- [ ] All Firebase imports removed ✓
- [ ] All Supabase imports added ✓
- [ ] No hardcoded credentials in code
- [ ] No console.log statements left (except dev)
- [ ] All environment variables use `VITE_` prefix

### Configuration Files
- [ ] ✓ `vercel.json` exists and is valid
- [ ] ✓ `.vercelignore` exists with correct exclusions
- [ ] ✓ `vite.config.js` has build optimizations
- [ ] ✓ `package.json` has all dependencies
- [ ] `.env.example` updated with Supabase variables

---

## Supabase Setup (Already Required)

- [ ] Project created on Supabase
- [ ] Database tables created (users, menu_data, uploads, payments, subscriptions)
- [ ] Row Level Security (RLS) enabled and policies configured
- [ ] Project URL saved: `https://your-project.supabase.co`
- [ ] Anon Key saved: `eyJ...`
- [ ] Backend functions deployed (Edge Functions or Node.js server)
- [ ] Backend URL saved: `https://your-project.supabase.co/functions/v1`

---

## Vercel Setup

### Create Vercel Account
- [ ] Sign up at [vercel.com](https://vercel.com)
- [ ] Connect GitHub/GitLab/Bitbucket account
- [ ] Authorize Vercel to access repositories

### Import Project
- [ ] Go to Vercel Dashboard
- [ ] Click "Add New" → "Project"
- [ ] Select your repository
- [ ] Click "Import"

### Configure Build Settings
- [ ] Framework: `Vite` (auto-detected ✓)
- [ ] Build Command: `npm run build` (auto-detected ✓)
- [ ] Output Directory: `dist` (auto-detected ✓)
- [ ] Node.js Version: `18.x` (in vercel.json ✓)
- [ ] Install Command: `npm ci` (auto-detected ✓)

### Add Environment Variables
In Vercel Dashboard → Project Settings → Environment Variables

**Required Variables:**
- [ ] `VITE_SUPABASE_URL` = `https://your-project.supabase.co`
- [ ] `VITE_SUPABASE_ANON_KEY` = `your-anon-key`
- [ ] `VITE_BACKEND_URL` = `https://your-project.supabase.co/functions/v1`
- [ ] `VITE_RAZORPAY_KEY_ID` = `rzp_live_xxxxx` (production) or `rzp_test_xxxxx` (testing)
- [ ] `VITE_RAZORPAY_PLAN_GROWTH` = `plan_xxxxx`
- [ ] `VITE_RAZORPAY_PLAN_PRO` = `plan_xxxxx`

**Consider Setting These by Environment:**
- Preview (Pull Requests):
  - Use `rzp_test_*` Razorpay keys
  - Use test Supabase credentials if desired

- Production:
  - Use `rzp_live_*` Razorpay keys (for real payments)
  - Use production Supabase credentials

### Deploy Production
- [ ] Click "Deploy"
- [ ] Wait for build to complete
- [ ] Check build logs for errors
- [ ] Get deployment URL
- [ ] Test app at deployment URL

---

## Post-Deployment Testing

### Test Core Features
- [ ] App loads without 404 errors
- [ ] Auth page displays correctly
- [ ] Sign-up works
- [ ] Sign-in works with created account
- [ ] User profile loads correctly
- [ ] Sign-out works

### Test Data Features
- [ ] Data Upload page loads
- [ ] Can upload CSV file
- [ ] Data persists after page refresh
- [ ] Dashboard displays loaded data
- [ ] Charts render correctly

### Test Payment Feature
- [ ] Billing page loads
- [ ] Razorpay checkout opens (test mode)
- [ ] Payment flow completes
- [ ] User plan updates in Supabase

### Test Performance
- [ ] Page load time < 3 seconds
- [ ] Charts render smoothly
- [ ] No excessive console errors
- [ ] Network requests complete successfully

### Test Browser Compatibility
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile (iPhone, Android)

---

## Configure Custom Domain (Optional)

- [ ] Domain registered (e.g., menu-dna.com)
- [ ] In Vercel Dashboard → Settings → Domains
- [ ] Add your domain
- [ ] Update DNS records (follow Vercel's instructions)
- [ ] Wait for DNS propagation (usually 24 hours)
- [ ] Verify domain is working
- [ ] SSL certificate auto-provisioned
- [ ] Add domain to Supabase Auth → URL Configuration → Redirect URLs

---

## Set Up Auto-Deployment

### GitHub Automatic Deployments
- [ ] Vercel connected to GitHub ✓
- [ ] Production branch set to `main` (or your choice)
- [ ] Preview deployments enabled for PRs ✓
- [ ] Automatic deployments enabled ✓

### Configure Deployment Protections (Optional)
- [ ] Require PR reviews before production deployment
- [ ] Add environment variable overrides for production
- [ ] Set up deployment notifications

---

## Security Checklist

### Environment Variables
- [ ] Never commit `.env` file
- [ ] All sensitive data in Vercel environment variables
- [ ] Production and preview have different Razorpay keys
- [ ] Regenerate keys if accidentally exposed

### CORS & Redirects
- [ ] Supabase Auth → URL Configuration → Add Vercel domain to redirect URLs
- [ ] Supabase CORS allows Vercel domain
- [ ] Backend functions allow requests from Vercel domain

### Monitoring
- [ ] Check Vercel Analytics dashboard
- [ ] Monitor error rates
- [ ] Check Supabase for suspicious queries
- [ ] Enable Vercel alerts for deployment failures

---

## Troubleshooting

### Build Fails
1. Check build logs in Vercel Dashboard
2. Verify all imports are correct
3. Ensure no TypeScript errors
4. Test locally with `npm run build`
5. Check for missing environment variables

### App Blank/404
1. Check browser console for errors
2. Verify environment variables are set
3. Check network requests in DevTools
4. Verify Supabase is accessible
5. Check Vercel deployment status

### Auth Not Working
1. Verify Supabase URL and key
2. Check Supabase Auth is enabled
3. Add Vercel domain to Auth → Redirect URLs
4. Check browser cookies/localStorage

### Payment Not Working
1. Verify Razorpay keys (test vs live)
2. Check backend URL is correct
3. Verify backend function is deployed
4. Check Razorpay plan IDs exist and are correct

---

## Monitoring & Maintenance

### Weekly
- [ ] Check Vercel Analytics
- [ ] Review error logs
- [ ] Monitor uptime

### Monthly
- [ ] Update dependencies: `npm update`
- [ ] Review Supabase usage metrics
- [ ] Check for security updates
- [ ] Backup critical data

### Quarterly
- [ ] Review and optimize performance
- [ ] Audit environment variables
- [ ] Update documentation
- [ ] Test backup/recovery procedures

---

## Success Indicators

✅ When deployment is successful, you should see:

- App loads at `https://your-project.vercel.app`
- All pages accessible without 404 errors
- Auth flows work (sign-up, sign-in, sign-out)
- Data persists in Supabase
- Charts and analytics display correctly
- Payment flow works with test credentials
- No errors in browser console or Vercel logs
- Deployment shows "Ready" status

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "Cannot find module '@supabase/supabase-js'" | Run `npm install` before deploying |
| "VITE_SUPABASE_URL is not defined" | Add environment variable in Vercel dashboard |
| Blank page on load | Check browser console, verify Supabase connection |
| Payment button 404 | Verify `VITE_BACKEND_URL` and backend is deployed |
| Auth redirect loop | Add Vercel domain to Supabase Auth → Redirect URLs |

---

## Deployment Summary

**Total Setup Time:** ~15-30 minutes

**What You've Accomplished:**
✅ Code prepared for Vercel  
✅ Environment variables configured  
✅ Supabase backend ready  
✅ App deployed to Vercel  
✅ Custom domain configured (optional)  
✅ Auto-deployments enabled  

**Next Steps:**
1. Invite team members to Vercel project
2. Set up analytics monitoring
3. Create runbook for common issues
4. Plan regular maintenance schedule

---

## Support Resources

- 📖 [Vercel Docs](https://vercel.com/docs)
- 📖 [Supabase Docs](https://supabase.com/docs)
- 🎥 [Vite Deployment](https://vitejs.dev/guide/static-deploy.html)
- 💬 [Vercel Community](https://github.com/vercel/next.js/discussions)

---

**Status:** Ready for Vercel Deployment 🚀
