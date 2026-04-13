import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'

// ── Environment Configuration
config()

// ── Prisma Initialization
const prisma = new PrismaClient({
    log: ['query', 'error', 'warn']
})

async function checkData() {
    console.log('--- Probando conexión con Prisma ---')

    const users = await prisma.user.findMany()
    const hairs = await prisma.hair.findMany({ include: { artist: true } })

    console.log('--- USERS ---')
    console.log(JSON.stringify(users, null, 2))

    console.log('--- HAIRS (First 3) ---')
    console.log(JSON.stringify(hairs.slice(0, 3), null, 2))
}

checkData()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
