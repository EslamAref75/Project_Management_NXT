import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'
import { getAllPermissions } from '../src/lib/permissions'

const prisma = new PrismaClient()

async function main() {
    console.log('🔧 Seeding Admin User Only...\n')

    // 1. Create all permissions
    console.log('📋 Creating Permissions...')
    const allPermissionKeys = getAllPermissions()

    const createdPermissions = []
    for (const key of allPermissionKeys) {
        const [module, ...actionParts] = key.split('.')
        const action = actionParts.join('.')
        const name = action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        const category = actionParts.length > 1 ? actionParts[0] : null

        const existing = await prisma.permission.findUnique({ where: { key } })
        if (!existing) {
            const p = await prisma.permission.create({
                data: {
                    key,
                    name,
                    description: `Permission to ${action.replace(/_/g, ' ')}`,
                    module,
                    category,
                },
            })
            createdPermissions.push(p)
        } else {
            createdPermissions.push(existing)
        }
    }
    console.log(`✅ Ensured ${createdPermissions.length} permissions exist\n`)

    // 2. Create admin role (if it doesn't exist)
    console.log('👤 Creating Admin Role...')
    let adminRole = await prisma.role.findUnique({
        where: { name: 'admin' }
    })

    if (!adminRole) {
        adminRole = await prisma.role.create({
            data: {
                name: 'admin',
                description: 'System Administrator with full access',
                isSystemRole: true,
            },
        })
        console.log('✅ Created admin role')
    } else {
        console.log('✅ Admin role already exists')
    }

    // 3. Assign all permissions to admin role
    console.log('🔗 Assigning permissions to admin role...')

    // Clear existing permissions first
    await prisma.rolePermission.deleteMany({
        where: { roleId: adminRole.id }
    })

    for (const perm of createdPermissions) {
        await prisma.rolePermission.create({
            data: { roleId: adminRole.id, permissionId: perm.id },
        })
    }
    console.log(`✅ Assigned ${createdPermissions.length} permissions to admin\n`)

    // 4. Create admin user
    console.log('👨‍💼 Creating Admin User...')
    const defaultPassword = await bcrypt.hash('password123', 10)

    let adminUser = await prisma.user.findUnique({
        where: { username: 'admin' }
    })

    if (!adminUser) {
        adminUser = await prisma.user.create({
            data: {
                username: 'admin',
                email: 'admin@example.com',
                passwordHash: defaultPassword,
                role: 'admin',
            },
        })
        console.log('✅ Created admin user')
    } else {
        console.log('✅ Admin user already exists')
    }

    // 5. Assign admin role to admin user (global scope)
    console.log('🔑 Assigning role to admin user...')

    const existingUserRole = await prisma.userRole.findFirst({
        where: {
            userId: adminUser.id,
            roleId: adminRole.id,
            scopeType: 'global',
        }
    })

    if (!existingUserRole) {
        await prisma.userRole.create({
            data: {
                userId: adminUser.id,
                roleId: adminRole.id,
                scopeType: 'global',
                scopeId: null,
            },
        })
        console.log('✅ Assigned admin role to user')
    } else {
        console.log('✅ Admin user already has admin role')
    }

    console.log('\n🎉 Admin setup complete!\n')
    console.log('📝 Login credentials:')
    console.log('   Username: admin')
    console.log('   Email: admin@example.com')
    console.log('   Password: password123\n')

    await prisma.$disconnect()
}

main()
    .catch((e) => {
        console.error('❌ Error:', e)
        process.exit(1)
    })
