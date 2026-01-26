import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const permissions = await prisma.permission.findMany({
        select: { module: true },
        distinct: ['module']
    })

    console.log('\nModules in database:')
    permissions.forEach((p, i) => {
        console.log(`${i + 1}. ${p.module}`)
    })
    console.log(`\nTotal: ${permissions.length} modules`)

    const expected = ['user', 'team', 'project', 'task', 'dependency', 'today_task', 'settings', 'notification', 'log', 'role', 'report']
    console.log(`\nExpected: ${expected.length} modules`)
    console.log('\nMissing modules:')
    expected.forEach(m => {
        if (!permissions.find(p => p.module === m)) {
            console.log(`  - ${m}`)
        }
    })

    await prisma.$disconnect()
}

main()
