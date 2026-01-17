# NEXTAUTH_SECRET Setup Instructions

## ⚠️ IMPORTANT - DO THIS FIRST

Your Next.js application currently has an insecure authentication secret that allows session hijacking and token forgery attacks.

**Status:** 🔴 MUST FIX - Blocks production deployment

---

## Step 1: Generate a Strong Secret

Choose ONE of the following methods:

### Option A: Using OpenSSL (Recommended)
```bash
openssl rand -base64 32
```

**Example Output:**
```
abcDEF123456+/==GHIJKLMNOPQRSTUVWXYZabcdefgh
```

### Option B: Using Node.js
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Option C: Using Online Generator
Visit: https://generate-secret.vercel.app/

---

## Step 2: Update Environment Variables

### For Local Development

**File:** `.env.local`

```env
# BEFORE (❌ INSECURE)
# NEXTAUTH_SECRET=secret
# or no NEXTAUTH_SECRET at all

# AFTER (✅ SECURE)
NEXTAUTH_SECRET=<paste-your-generated-secret-here>
```

**Example:**
```env
NEXTAUTH_SECRET=abcDEF123456+/==GHIJKLMNOPQRSTUVWXYZabcdefgh
NEXTAUTH_URL=http://localhost:3000
```

### For Production

**File:** `.env.production` (or use environment variable in deployment platform)

```env
NEXTAUTH_SECRET=<paste-your-generated-secret-here>
NEXTAUTH_URL=https://your-domain.com
```

**OR set as environment variable in your deployment:**

**Vercel:**
```bash
vercel env add NEXTAUTH_SECRET
# Paste the secret when prompted
```

**Docker/Container:**
```bash
export NEXTAUTH_SECRET="your-secret-here"
```

**AWS/Other cloud platforms:**
- Set in Secrets Manager or Environment Variables
- Make sure it's not logged or visible in build logs

---

## Step 3: Verify Configuration

```bash
# Test that the secret is properly configured
npx ts-node scripts/test-nextauth-secret.ts
```

**Expected Output:**
```
✅ NEXTAUTH_SECRET is set
✅ NEXTAUTH_SECRET is not using the default value
✅ NEXTAUTH_SECRET is long enough (44 characters)

🎉 NEXTAUTH_SECRET is properly configured!
```

**If you see errors:**
- Make sure `.env.local` is in the root directory
- Make sure the secret is pasted correctly
- Make sure there are no extra spaces
- Run `npm run dev` to reload environment

---

## Step 4: Invalidate Old Sessions (After Deploying)

After the secret is deployed to production, all old sessions using the previous secret must be invalidated:

```bash
# This will delete all existing sessions
# Users will need to login again
npx ts-node scripts/invalidate-old-sessions.ts
```

**When to run this:**
- After deploying the new secret to production
- OR immediately after updating .env.local locally

**Expected Output:**
```
✅ Successfully invalidated 42 sessions
📋 All users must re-login with the new secret

⚠️  IMPORTANT:
- Old tokens will no longer be valid
- Users will see logout message on next page load
- They will need to re-login with their credentials
- New sessions will use the new NEXTAUTH_SECRET
```

---

## Step 5: Test Login

### Locally
```bash
npm run dev
# Visit http://localhost:3000/login
# Try to login with test credentials
# Should work normally with the new secret
```

### Check in Logs
```
[Auth] Successfully authenticated user: testuser (Role: admin)
```

---

## Verification Checklist

- [ ] Generated strong secret (32+ characters)
- [ ] Added to `.env.local`
- [ ] Verified with test script (`npm run test-nextauth-secret`)
- [ ] Test login works locally
- [ ] (If deploying) Updated `.env.production` or platform secrets
- [ ] (If deploying) Invalidated old sessions on production
- [ ] (If deploying) Users notified they need to re-login

---

## 🔐 Security Best Practices

✅ **DO:**
- Generate a new strong secret (32+ chars)
- Store in environment variables (never in code)
- Use different secrets for dev/staging/production
- Rotate secrets periodically (3-6 months)
- Keep secrets in secure vaults/managers

❌ **DON'T:**
- Use hardcoded secrets in code
- Use weak passwords as secrets
- Commit secrets to version control
- Share secrets in chat/email
- Reuse same secret across environments

---

## Troubleshooting

### Issue: "NEXTAUTH_SECRET is not set"
**Solution:** Make sure `.env.local` exists and has the secret set

```bash
# Check if file exists
ls -la .env.local

# Check if secret is there
grep NEXTAUTH_SECRET .env.local

# If empty, add it
echo "NEXTAUTH_SECRET=<your-secret>" >> .env.local
```

### Issue: Login fails after updating secret
**Solution:** Clear browser cookies and try again

```bash
# Browser: Open DevTools → Application → Cookies → Delete all
# Then reload page and login again
```

### Issue: "secret is too short"
**Solution:** Generate a longer secret (minimum 32 characters)

```bash
# Current length too short
openssl rand -base64 32  # Generate new one (longer)
```

### Issue: Tests failing after secret change
**Solution:** Restart dev server to reload environment

```bash
# Stop current npm run dev (Ctrl+C)
npm run dev  # Start again
```

---

## What's Been Changed

✅ **Updated:** `src/lib/auth.ts`
- Removed insecure fallback secret
- Now requires NEXTAUTH_SECRET environment variable

✅ **Created:** `scripts/invalidate-old-sessions.ts`
- Script to invalidate all existing sessions
- Run after deploying new secret to production

✅ **Created:** `scripts/test-nextauth-secret.ts`
- Script to verify secret is properly configured
- Checks length, presence, security

---

## Next Steps

1. **NOW:** Complete steps 1-3 above
2. **Test locally:** Make sure login still works
3. **If deploying:** Update production secrets
4. **If deploying:** Run invalidate-old-sessions.ts
5. **Move to Fix #2:** File Upload Validation

---

**Estimated Time:** 15-30 minutes  
**Difficulty:** ⭐ Easy (just updating environment variables)  
**Impact:** 🔐 Critical (prevents session hijacking)  
**Status:** Ready to implement ✅

