import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkPermissions() {
  try {
    console.log('🔍 Checking permissions in database...\n')

    // Get all permissions
    const permissions = await prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { name: 'asc' }],
    })

    console.log(`Total permissions: ${permissions.length}\n`)

    // Group by module
    const grouped: Record<string, typeof permissions> = {}
    for (const perm of permissions) {
      if (!grouped[perm.module]) {
        grouped[perm.module] = []
      }
      grouped[perm.module].push(perm)
    }

    // Display grouped permissions
    console.log('📊 Permissions grouped by module:')
    console.log('=' .repeat(60))
    
    const moduleKeys = Object.keys(grouped).sort()
    console.log(`\nFound ${moduleKeys.length} modules:\n`)

    moduleKeys.forEach((module, index) => {
      console.log(`${index + 1}. ${module.toUpperCase()} (${grouped[module].length} permissions)`)
      grouped[module].forEach(perm => {
        console.log(`   - ${perm.key}`)
      })
      console.log('')
    })

    console.log('=' .repeat(60))
    console.log('\n✅ Module Summary:')
    moduleKeys.forEach((module, index) => {
      console.log(`${index + 1}. ${module}`)
    })

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkPermissions()
