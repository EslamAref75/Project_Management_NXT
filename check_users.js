const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
    const users = await prisma.user.findMany()
    console.log('Users found:', users.length)
    users.forEach(u => {
        console.log(`- [${u.id}] ${u.username} (Role: ${u.role})`)
    })
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
