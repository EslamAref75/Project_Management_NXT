# Automatic Daily Reset - Setup Guide

## Overview

The Today's Focus board now automatically clears at midnight Cairo time (UTC+2) every day.

## Components

### 1. Server Action
- **File**: `src/app/actions/focus.ts`
- **Function**: `clearAllUsersFocus()`
- Clears all users' tasks from today's focus
- Logs activity for audit trail

### 2. Cron Scheduler
- **File**: `src/lib/cron.ts`
- Runs daily at 22:00 UTC (00:00 Cairo time)
- Uses node-cron for scheduling
- Logs execution details to console

### 3. Instrumentation
- **File**: `src/instrumentation.ts`
- Initializes cron jobs when server starts
- Only runs in Node.js runtime (not Edge)

### 4. API Endpoint
- **Endpoint**: `POST /api/cron/reset-focus`
- Alternative for serverless platforms
- Requires `CRON_SECRET` in environment variables

## Environment Variables

Add to `.env` file:

```bash
# Optional: For external cron services or manual triggers
CRON_SECRET=your-secure-random-string-here
```

Generate a secure secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Deployment Options

### Option 1: Self-Hosted / VPS (Recommended)
The cron job runs automatically when the server starts. No additional configuration needed.

**Verify it's working:**
```bash
# Check server logs for:
🕐 Initializing cron jobs...
📅 Today's Focus reset scheduled for: 0 22 * * * UTC (00:00 Cairo time)
✅ Cron jobs initialized successfully
```

### Option 2: Vercel / Serverless
Use Vercel Cron Jobs or external cron service.

**Vercel Cron (requires Pro plan):**
Create `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/reset-focus",
    "schedule": "0 22 * * *"
  }]
}
```

**External Cron Service (free):**
1. Sign up at [cron-job.org](https://cron-job.org)
2. Create new cron job:
   - URL: `https://your-app.com/api/cron/reset-focus`
   - Schedule: Daily at 22:00 UTC
   - Method: POST
   - Header: `Authorization: Bearer YOUR_CRON_SECRET`

## Testing

### Manual Test via API
```bash
# Replace with your CRON_SECRET and domain
curl -X POST http://localhost:3000/api/cron/reset-focus \
  -H "Authorization: Bearer your-cron-secret"

# Expected response:
# {"success":true,"message":"Cleared X tasks from today's focus","tasksCleared":X}
```

### Check Status
```bash
curl http://localhost:3000/api/cron/reset-focus \
  -H "Authorization: Bearer your-cron-secret"

# Shows current time and next scheduled reset
```

### Test Cron Execution
Temporarily change the schedule in `src/lib/cron.ts` for testing:
```typescript
// Change from '0 22 * * *' to run every minute
const resetSchedule = '* * * * *'
```

## Monitoring

Check server logs for daily execution:
```
🔄 Running automatic Today's Focus reset...
⏰ Cairo time: Monday, January 20, 2026 at 12:00:00 AM Eastern European Standard Time
✅ Successfully cleared X tasks from today's focus
```

Activity logs are also stored in the database:
- **Action Type**: `system_reset_focus`
- **Category**: `today_task`
- **Details**: Number of tasks cleared, timestamp, timezone

## Troubleshooting

**Cron not running?**
- Check that `experimental.instrumentationHook: true` is in `next.config.ts`
- Ensure `instrumentation.ts` is in the `src` directory
- Verify server logs show "Cron jobs initialized successfully"

**Wrong timezone?**
- Cron runs at 22:00 UTC = 00:00 Cairo (UTC+2)
- Does not adjust for daylight saving time
- Modify `resetSchedule` in `src/lib/cron.ts` if needed

**Tasks not clearing?**
- Check database activity logs for execution records
- Run manual test via API endpoint
- Verify `clearAllUsersFocus()` returns success

## Files Modified/Created

- ✅ `src/app/actions/focus.ts` - Added `clearAllUsersFocus()`
- ✅ `src/lib/cron.ts` - Cron scheduler
- ✅ `src/instrumentation.ts` - Server initialization
- ✅ `src/app/api/cron/reset-focus/route.ts` - API endpoint
- ✅ `next.config.ts` - Enabled instrumentation
- ✅ `package.json` - Added node-cron dependency
