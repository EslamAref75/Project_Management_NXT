# Quick Resource Check

Run this quick check to verify the fixes are working:

## 1. Check Browser Network Tab

1. Open http://localhost:3000 in your browser
2. Press F12 to open DevTools
3. Go to Network tab
4. Filter by: `notifications`
5. Verify: Requests happen every ~30 seconds (not 5-10s)

## 2. Check for Intervals

Open Browser Console and run:

```javascript
// This will show any active intervals (should be minimal)
console.log('Active timers:', window.setInterval.length || 'N/A')

// Navigate to a page with notifications, wait 60 seconds
// Then navigate away - network requests should stop
```

## 3. Quick Memory Check

In DevTools → Memory:
- Take snapshot
- Navigate between 5-10 pages
- Take another snapshot  
- Compare: Memory should not grow significantly

## 4. Local Server Check

Your dev server should show:
- ✅ No continuous output when idle
- ✅ Output only when you make requests
- ✅ No error loops

## Quick Test Results

**Expected Behavior:**
- ⏱️ Polling interval: 30 seconds
- 💾 Memory: Stable (not climbing)
- 🔄 Intervals: Stop when component unmounts
- 🖥️ Server: Quiet when no requests

**Before the fixes:** 
- ⚠️ Polling every 5-10 seconds
- ⚠️ Memory slowly climbing
- ⚠️ Rate limiter interval always running

**After the fixes:**
- ✅ Polling every 30 seconds
- ✅ Memory stable
- ✅ No background intervals on server
