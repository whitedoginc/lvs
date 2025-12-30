# Transcript Vault

A personal knowledge base for storing, processing, and searching conversation transcripts using AI-powered analysis and semantic search.

## Features

- **Upload & Process**: Paste or upload transcripts (.txt, .md) for automatic AI analysis
- **AI-Powered Analysis**: Uses Claude to extract titles, summaries, key points, action items, and notable quotes
- **Semantic Search**: Find conversations by meaning using OpenAI embeddings (e.g., "what did we say about pricing strategy?")
- **Topic Management**: Automatic topic categorization with the ability to create, merge, and manage topics
- **Multi-user Support**: Supabase Auth with email/password login for shared access

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Hosting**: Vercel
- **Database**: Supabase (Postgres + pgvector for semantic search)
- **Auth**: Supabase Auth
- **AI Processing**: Claude API (Anthropic)
- **Embeddings**: OpenAI embeddings API (text-embedding-3-small)
- **Styling**: Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project
- Anthropic API key
- OpenAI API key

### Setup

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

Required environment variables:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- `ANTHROPIC_API_KEY` - Your Anthropic API key
- `OPENAI_API_KEY` - Your OpenAI API key

3. Set up the database by running the SQL migration in `supabase/migrations/001_initial_schema.sql` in your Supabase SQL editor. This will:
   - Enable the pgvector extension
   - Create the required tables (transcripts, topics, transcript_topics)
   - Set up Row Level Security policies
   - Create the semantic search function

4. Create user accounts in Supabase Auth (no signup page - accounts are created manually)

5. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Pages

- `/` - Dashboard with stats, search, and recent transcripts
- `/upload` - Upload or paste transcripts for processing
- `/transcript/[id]` - View a processed transcript with all extracted data
- `/search` - Semantic search with topic and date filters
- `/topics` - Manage and browse topics
- `/settings` - User profile information

## How It Works

1. **Upload**: Paste or upload a transcript
2. **Process**: The app saves the raw content immediately, then sends it to Claude for analysis
3. **Analyze**: Claude extracts structure: title, summary, key points, action items, quotes, speakers, and suggested topics
4. **Embed**: OpenAI generates a vector embedding from the summary and key points
5. **Store**: Everything is saved to Supabase with topic associations
6. **Search**: Query the vector embeddings for semantic similarity search

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```
