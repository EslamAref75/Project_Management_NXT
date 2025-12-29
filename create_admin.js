const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
    const passwordHash = await bcrypt.hash('admin123', 10)

    const admin = await prisma.user.upsert({
        where: { username: 'admin' },
        update: {},
        create: {
            username: 'admin',
            email: 'admin@qeema.com',
            passwordHash: passwordHash,
            role: 'admin'
        },
    })

    console.log(`Created admin user: ${admin.username} (Role: ${admin.role})`)

    const users = await prisma.user.findMany()
    console.log("All users in DB:", users)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
