import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { config } from 'dotenv'

config()

const prisma = new PrismaClient({
    adapter: new PrismaNeon({
        connectionString: process.env.DATABASE_URL
    })
})

async function checkData() {
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
