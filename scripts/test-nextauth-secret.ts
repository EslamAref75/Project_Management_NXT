/**
 * Test script to verify NEXTAUTH_SECRET is properly configured
 * 
 * This script checks:
 * 1. NEXTAUTH_SECRET environment variable is set
 * 2. It's not using the default insecure value
 * 3. It's long enough for security (min 32 chars)
 * 
 * Usage:
 * npx ts-node scripts/test-nextauth-secret.ts
 */

import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load environment variables from .env.local
const envPath = path.resolve(__dirname, '..', '.env.local')
dotenv.config({ path: envPath })

function testAuthSecret() {
  console.log('🔍 Checking NEXTAUTH_SECRET configuration...\n')

  const secret = process.env.NEXTAUTH_SECRET

  // Check 1: Secret is set
  if (!secret) {
    console.error('❌ NEXTAUTH_SECRET is not set!')
    console.error('   Please set NEXTAUTH_SECRET in your .env.local')
    process.exit(1)
  }

  console.log('✅ NEXTAUTH_SECRET is set')

  // Check 2: Not using the insecure default
  if (secret === 'fallback-secret-key-change-in-production') {
    console.error('❌ NEXTAUTH_SECRET is still using the default insecure value!')
    console.error('   Please generate a new secret: openssl rand -base64 32')
    process.exit(1)
  }

  console.log('✅ NEXTAUTH_SECRET is not using the default value')

  // Check 3: Secret is long enough
  if (secret.length < 32) {
    console.error(
      `❌ NEXTAUTH_SECRET is too short! Current: ${secret.length} chars, Required: 32+ chars`
    )
    process.exit(1)
  }

  console.log(`✅ NEXTAUTH_SECRET is long enough (${secret.length} characters)`)

  // All checks passed
  console.log('\n🎉 NEXTAUTH_SECRET is properly configured!')
  console.log(`\nSecret length: ${secret.length} characters`)
  console.log(`First 10 chars: ${secret.substring(0, 10)}...`)
  console.log(`Last 10 chars: ...${secret.substring(secret.length - 10)}`)

  process.exit(0)
}

testAuthSecret()
