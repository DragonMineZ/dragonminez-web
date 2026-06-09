import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/client/client'
import { config } from 'dotenv'

config()

const prisma = new PrismaClient({
    adapter: new PrismaPg({
        connectionString: process.env.DATABASE_URL!
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
    console.log('Iniciando carga de categorías del blog...')

    const blogCategories: { name: string; slug: string; children: { name: string; slug: string }[] }[] = [
        {
            name: 'Noticias', slug: 'noticias', children: [
                { name: 'Anuncios', slug: 'anuncios' },
                { name: 'Notas de Parche', slug: 'notas-de-parche' },
            ]
        },
        {
            name: 'Guías', slug: 'guias', children: [
                { name: 'Primeros Pasos', slug: 'primeros-pasos' },
                { name: 'Razas y Transformaciones', slug: 'razas-y-transformaciones' },
                { name: 'Técnicas', slug: 'tecnicas' },
            ]
        },
        {
            name: 'Comunidad', slug: 'comunidad', children: [
                { name: 'Eventos', slug: 'eventos' },
                { name: 'Creaciones', slug: 'creaciones' },
            ]
        },
    ]

    for (const { name, slug, children } of blogCategories) {
        let parent = await prisma.blogCategory.findUnique({ where: { slug } })
        if (!parent) {
            parent = await prisma.blogCategory.create({ data: { name, slug } })
            console.log(`Categoría de blog creada: ${name}`)
        }

        for (const child of children) {
            const existing = await prisma.blogCategory.findUnique({ where: { slug: child.slug } })
            if (!existing) {
                await prisma.blogCategory.create({
                    data: { name: child.name, slug: child.slug, parentId: parent.id_category }
                })
                console.log(`Subcategoría de blog creada: ${name} → ${child.name}`)
            }
        }
    }

    console.log('Carga de categorías del blog finalizada.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
