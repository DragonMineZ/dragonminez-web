# DragonMineZ Web

[![Discord](https://img.shields.io/badge/Discord-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.com/servers/dragonmine-z-1216429657273012415)
[![GitHub](https://img.shields.io/badge/GitHub-24292E?style=for-the-badge&logo=github&logoColor=white)](https://github.com/DragonMineZ/dragonminez)

> Fan-made Minecraft mod that brings the Dragon Ball Z experience to life.

## Overview

DragonMineZ Web is the official website for the DragonMineZ Minecraft mod, featuring:

- **HairSalon** - Browse and share custom hair models with the community
- **3D Hair Viewer** - Real-time 3D preview of hair models with transformation effects
- **Download Center** - Get the mod from CurseForge or Modrinth

## Tech Stack

- **Framework**: [Astro](https://astro.build) with React integration
- **Styling**: Tailwind CSS
- **3D Rendering**: React Three Fiber (R3F) + Three.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Clerk
- **Deployment**: Docker + Dokploy

## Project Structure

```
src/
├── assets/              # Static assets (images, icons)
├── components/          # UI components
│   ├── features/       # Feature-specific components
│   │   ├── hairs/      # HairList, HairCard, etc.
│   │   └── viewer/     # 3D Hair Viewer components
│   └── ui/             # Reusable UI components
├── hooks/               # Custom React hooks
├── i18n/                # Internationalization
├── layouts/             # Astro layouts
├── lib/                 # Utilities and helpers
│   ├── api/             # API utilities, schemas, guards
│   └── nbt_reader.ts    # Minecraft NBT data parser
├── pages/               # Astro pages and API routes
│   ├── api/             # Backend API endpoints
│   ├── hairsalon.astro  # HairSalon page
│   ├── viewer.astro     # Hair Viewer page
│   └── createhair.astro # Create hair page
├── repositories/        # Data access layer (Prisma)
├── services/            # Business logic layer
└── types/               # TypeScript type definitions
```

## Getting Started

### Prerequisites

- Node.js 18+
- Bun (recommended) or npm
- PostgreSQL database

### Installation

```bash
# Clone the repository
git clone https://github.com/DragonMineZ/dragonminez-web.git
cd dragonminez-web

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Generate Prisma client
bun prisma generate

# Push schema to database
bun prisma db push

# Start development server
bun dev
```

### Environment Variables

```env
# Clerk Authentication
PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...

# Application
PUBLIC_APP_URL=https://dragonminez.com

# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Webhooks
CLERK_WEBHOOK_SIGNING_SECRET=whsec_...
```

### Building for Production

```bash
bun build
bun run start
```

Or with Docker:

```bash
docker build -t dragonminez-web .
docker run -p 4321:4321 dragonminez-web
```

## Features

### HairSalon

Browse thousands of custom hair models created by the community. Features include:

- Search and filter by categories
- Sort by recent, popularity, or oldest
- Like your favorite hairs
- View creator profiles

### 3D Hair Viewer

Interactive 3D viewer with:

- Real-time rendering of Minecraft hair models
- Transformation effects (Base, SSJ, SSJ2, SSJ3, Full)
- Custom color support
- Camera orbit controls
- Responsive design

### Authentication

Secure authentication powered by Clerk with:

- Discord OAuth integration
- Session management
- User profile synchronization

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/hairs` | GET | List hairs with pagination and filters |
| `/api/hairs` | POST | Create new hair (auth required) |
| `/api/hairs/[id]` | GET/PATCH/DELETE | Hair CRUD operations |
| `/api/hairs/[id]/like` | PUT/DELETE | Like/unlike hair |
| `/api/categories` | GET | List all categories |
| `/api/webhooks/clerk` | POST | Clerk webhook handler |
| `/api/users/me` | GET | Get current user profile |

## Database Schema

- **User** - User accounts linked to Clerk
- **Hair** - Custom hair models with code, image, and metadata
- **Category** - Hair categories (Base, SSJ, SSJ2, SSJ3, Full)
- **Like** - User hair likes

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is fan-made and for educational purposes. Dragon Ball Z is a trademark of Bandai Namco Entertainment, Toei Animation, and Fuji TV.

## Links

- [Discord Server](https://discord.com/servers/dragonmine-z-1216429657273012415)
- [CurseForge](https://www.curseforge.com/minecraft/mc-mods/dragonminez)
- [Modrinth](https://modrinth.com/mod/dragonminez)
- [GitHub (Mod)](https://github.com/DragonMineZ/dragonminez)
