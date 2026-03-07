import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { config } from 'dotenv'

config()

const prisma = new PrismaClient({
    adapter: new PrismaNeon({
        connectionString: process.env.DATABASE_URL
    })
})

async function main() {
    console.log('Iniciando carga de categorías...')

    const categories = [
        'Base',
        'SSJ',
        'SSJ2',
        'SSJ3',
        'Full'
    ]

    for (const description of categories) {
        const existing = await prisma.category.findFirst({
            where: { description }
        })

        if (!existing) {
            await prisma.category.create({
                data: { description }
            })
            console.log(`Categoría creada: ${description}`)
        } else {
            console.log(`Categoría ya existe: ${description}`)
        }
    }

    console.log('Carga de categorías finalizada.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
