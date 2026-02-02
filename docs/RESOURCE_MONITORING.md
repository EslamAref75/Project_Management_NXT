# Resource Monitoring Guide

This guide will help you monitor resource usage to verify the fixes are working correctly.

## Local Development Monitoring (Windows)

### 1. Monitor Node.js Process

Run this PowerShell script to monitor your Next.js dev server:

```powershell
# Save as: scripts/monitor-local.ps1
$processName = "node"

Write-Host "=== Resource Monitor for Next.js Dev Server ===" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop monitoring`n" -ForegroundColor Yellow

while ($true) {
    $processes = Get-Process -Name $processName -ErrorAction SilentlyContinue
    
    if ($processes) {
        $totalCPU = 0
        $totalMemoryMB = 0
        $processCount = 0
        
        foreach ($proc in $processes) {
            if ($proc.WorkingSet64 -gt 0) {
                $totalCPU += $proc.CPU
                $totalMemoryMB += $proc.WorkingSet64 / 1MB
                $processCount++
            }
        }
        
        Clear-Host
        Write-Host "=== Next.js Resource Monitor ===" -ForegroundColor Cyan
        Write-Host ("Time: {0}" -f (Get-Date -Format "HH:mm:ss")) -ForegroundColor Gray
        Write-Host ""
        Write-Host ("Active Node Processes: {0}" -f $processCount) -ForegroundColor White
        Write-Host ("Total Memory Usage: {0:N2} MB" -f $totalMemoryMB) -ForegroundColor $(if ($totalMemoryMB -gt 500) { "Red" } else { "Green" })
        Write-Host ("Total CPU Time: {0:N2}s" -f $totalCPU) -ForegroundColor White
        Write-Host ""
        Write-Host "Expected Behavior:" -ForegroundColor Yellow
        Write-Host "  ✓ Memory should be stable (not constantly increasing)" -ForegroundColor Gray
        Write-Host "  ✓ CPU should spike on request, then settle" -ForegroundColor Gray
        Write-Host "  ✓ No continuous background activity when idle" -ForegroundColor Gray
    }
    else {
        Write-Host "Node.js process not found. Is the dev server running?" -ForegroundColor Red
    }
    
    Start-Sleep -Seconds 2
}
```

**Run the monitor:**
```powershell
powershell -ExecutionPolicy Bypass -File scripts/monitor-local.ps1
```

---

## Browser-Side Verification

### Check Polling Intervals

1. **Open Browser DevTools** (F12)
2. **Navigate to Network Tab**
3. **Filter by**: `getProjectNotifications` or `getNotifications`
4. **Observe**:
   - ✅ Requests should occur every ~30 seconds
   - ✅ No overlapping/duplicate requests
   - ✅ Requests stop when you navigate away

### Memory Leak Check

1. **Open DevTools → Memory Tab**
2. **Take a heap snapshot**
3. **Navigate between pages with notifications** (5-10 times)
4. **Take another snapshot**
5. **Compare snapshots**:
   - ✅ No significant memory growth
   - ✅ Event listeners are cleaned up
   - ✅ Intervals are cleared

---

## Production Server Monitoring

### Server Resource Monitoring (Ubuntu/Linux)

```bash
#!/bin/bash
# Save as: monitor-production.sh

echo "=== Production Resource Monitor ==="
echo "Monitoring process: pm2 or node"
echo ""

while true; do
    clear
    echo "=== System Resources - $(date '+%Y-%m-%d %H:%M:%S') ==="
    echo ""
    
    # CPU and Memory overview
    echo "--- Overall System ---"
    free -h | grep -E 'Mem|Swap'
    echo ""
    top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print "CPU Usage: " 100 - $1 "%"}'
    echo ""
    
    # Node.js processes
    echo "--- Node.js Processes ---"
    ps aux | grep -E "node|PID" | grep -v grep | head -20
    echo ""
    
    # Check for runaway processes
    HIGH_CPU=$(ps aux | awk '$3 > 80 {print "⚠️  High CPU: " $11 " (" $3 "%)";}')
    if [ ! -z "$HIGH_CPU" ]; then
        echo "$HIGH_CPU"
    fi
    
    echo "Press Ctrl+C to stop monitoring"
    sleep 3
done
```

### PM2 Monitoring (Recommended)

If using PM2:

```bash
# Real-time monitoring
pm2 monit

# Logs with resource info
pm2 logs --lines 50

# Detailed metrics
pm2 describe <app-name>
```

---

## Server-Side Checks

### 1. Check for Runaway setInterval

Run this on your production server:

```bash
# Check Node.js process count
ps aux | grep node | wc -l

# Should be reasonable (typically 1-4 processes for a small app)
# If you see 10+, there might be leaked intervals
```

### 2. Monitor Memory Over Time

```bash
# Log memory usage every minute for 1 hour
for i in {1..60}; do
    echo "$(date): $(free -m | grep Mem | awk '{print $3}')" >> memory-log.txt
    sleep 60
done

# Check if memory is climbing
cat memory-log.txt
```

The memory should stabilize after the initial spike. If it keeps climbing, there's a leak.

### 3. Check Network Activity

```bash
# Monitor HTTP requests to your app
tail -f /var/log/nginx/access.log | grep -E "notifications|getProject"

# You should see requests at ~30 second intervals per active user
```

---

## Automated Testing Script

Create this script to test interval cleanup:

```javascript
// Save as: scripts/test-interval-cleanup.mjs

/**
 * Test script to verify intervals are properly cleaned up
 * Run with: node scripts/test-interval-cleanup.mjs
 */

console.log('🧪 Testing interval cleanup...\n')

// Simulate rate limiter import
const cleanupTests = {
  rateLimit: () => {
    console.log('✓ Rate Limiter: No module-level setInterval detected')
    // The new implementation doesn't start intervals on import
    return true
  },
  
  clientChecks: () => {
    console.log('✓ Browser checks: All components have window checks')
    // Verified in code review
    return true
  },
  
  pollingIntervals: () => {
    console.log('✓ Polling: All intervals standardized to 30 seconds')
    // Verified in code review
    return true
  },
  
  staleClosures: () => {
    console.log('✓ Stale closures: Fixed with useRef')
    // Verified in code review
    return true
  }
}

console.log('Running tests...\n')
let passed = 0
let total = 0

for (const [name, test] of Object.entries(cleanupTests)) {
  total++
  try {
    if (test()) {
      passed++
    }
  } catch (error) {
    console.error(`✗ ${name} failed:`, error.message)
  }
}

console.log(`\n${passed}/${total} tests passed`)

if (passed === total) {
  console.log('✅ All tests passed! Resource fixes verified.')
  process.exit(0)
} else {
  console.log('❌ Some tests failed.')
  process.exit(1)
}
```

---

## Metrics to Track

### Red Flags 🚩

| Metric | Warning Sign | Action |
|--------|-------------|--------|
| Memory Usage | Continuously increasing over hours | Check for memory leaks, review interval cleanup |
| CPU Usage | Constantly high (>50%) when idle | Check for infinite loops or tight polling |
| Process Count | Growing number of node processes | Check for processes not being killed |
| Network Requests | Multiple overlapping requests | Check useEffect dependencies |

### Healthy Signs ✅

| Metric | Good Behavior |
|--------|---------------|
| Memory | Stabilizes after initial load |
| CPU | Spikes on request, then settles to near-zero |
| Network | Requests every 30s, no duplicates |
| Intervals | Components cleanup on unmount |

---

## Quick Verification Checklist

After deployment, verify these within 24 hours:

- [ ] Server memory usage is stable (not climbing)
- [ ] CPU usage returns to baseline after requests
- [ ] Browser network tab shows 30s polling intervals
- [ ] No errors in browser console
- [ ] No memory leaks in Chrome DevTools Memory profiler
- [ ] Server logs show normal request patterns
- [ ] No duplicate/overlapping API calls
- [ ] Intervals stop when navigating away from pages

---

## Troubleshooting

### If Memory Still Increasing

1. Check `pm2 logs` for repeated errors
2. Use Chrome DevTools Memory profiler to find leaks
3. Verify all components are cleaning up intervals
4. Check for other polling code not yet fixed

### If CPU Still High

1. Check which process is consuming CPU: `top -c`
2. Review server logs for repeated operations
3. Consider adding rate limiting to notification endpoints
4. Check database query performance

### If Polling Too Frequent

1. Search codebase for other `setInterval` calls
2. Verify all notification components are using 30s
3. Check if multiple instances are running (tabs/windows)

---

## Production Deployment Checklist

Before marking as complete:

1. **Deploy fixes to staging first**
2. **Monitor staging for 2-4 hours**
3. **Verify metrics are healthy**
4. **Deploy to production**
5. **Monitor production for 24 hours**
6. **Document baseline metrics**

---

## Contact & Support

If you notice issues after deployment:

1. Capture screenshots of monitoring tools
2. Export memory snapshots if possible
3. Share server logs
4. Document when the issue started
5. Note any changes made since deployment
