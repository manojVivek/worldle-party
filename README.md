# Worldle Multiplayer

A multiplayer version of the country guessing game Worldle, built with Next.js, TypeScript, and Supabase.

## Features

- 🌍 Country guessing game with 10 rounds per session
- 👥 Multiplayer rooms with shareable room codes
- ⚡ Real-time synchronization using Supabase
- 📊 Live scoring and results
- 🎯 Host controls for starting new rounds
- 🗺️ Accurate country boundary SVGs for all 195 countries
- 🎨 Beautiful country shapes with visual feedback

## Tech Stack

- **Frontend:** Next.js 14+ with TypeScript
- **Styling:** Tailwind CSS
- **Database & Real-time:** Supabase
- **Deployment:** Vercel

## Development Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

### Environment Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables in `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

### Database Setup

#### For Remote Database (Production)
```bash
# Login to Supabase CLI
supabase login

# Push migrations to remote project
npm run db:migrate
# or
./scripts/migrate.sh remote
```

#### For Local Development
```bash
# Reset and run migrations locally
npm run db:migrate:local
# or
./scripts/migrate.sh local
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:migrate` - Push migrations to remote Supabase
- `npm run db:migrate:local` - Reset local database with migrations
- `npm run db:generate-types` - Generate TypeScript types from database schema

### Database Migrations

Use Supabase CLI directly for database management:

```bash
# Local migrations
supabase db reset

# Remote migrations  
supabase db push

# Generate types
supabase gen types typescript --local > src/types/database.types.ts
```

## Database Schema

- **rooms** - Game sessions with room codes
- **players** - Participants in each room
- **game_rounds** - Each country guessing round
- **player_guesses** - Individual player responses
- **game_results** - Final scores and rankings

## Getting Started

1. Set up environment variables
2. Run database migrations
3. Start development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) to view the app

## Country Shape Data

The game uses accurate country boundary SVGs stored in `/public/country-shapes/`. These provide:

- ✅ All 195 countries covered (193 UN members + 2 observers)
- ✅ Accurate geographical boundaries
- ✅ Optimized SVG files for web performance
- ✅ Consistent styling and coloring
- ✅ Responsive scaling for different screen sizes

## Contributing

1. Create a feature branch
2. Run migrations locally for testing
3. Test multiplayer functionality
4. Submit pull request
