/**
 * Invalidate all existing sessions after changing NEXTAUTH_SECRET
 * 
 * Run this script after updating NEXTAUTH_SECRET to force all users to re-login
 * This prevents token hijacking attacks if the old secret was compromised
 * 
 * Usage:
 * npx ts-node scripts/invalidate-old-sessions.ts
 */

import { prisma } from '@/lib/prisma'

async function invalidateAllSessions() {
  try {
    console.log('🔄 Starting session invalidation...')

    // Delete all sessions from database
    const result = await prisma.session.deleteMany({})

    console.log(`✅ Successfully invalidated ${result.count} sessions`)
    console.log('📋 All users must re-login with the new secret')
    console.log('')
    console.log('⚠️  IMPORTANT:')
    console.log('- Old tokens will no longer be valid')
    console.log('- Users will see logout message on next page load')
    console.log('- They will need to re-login with their credentials')
    console.log('- New sessions will use the new NEXTAUTH_SECRET')

    process.exit(0)
  } catch (error) {
    console.error('❌ Error invalidating sessions:', error)
    process.exit(1)
  }
}

invalidateAllSessions()
