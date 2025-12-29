# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a full-stack AI-powered video classroom quality analysis system for 51Talk. The application processes classroom video recordings and automatically evaluates teaching quality across multiple dimensions using AI services.

**Technology Stack:**
- **Backend**: FastAPI (Python 3.13), PostgreSQL, SQLAlchemy
- **Frontend**: React 18 (TypeScript), Vite, TailwindCSS, shadcn/ui
- **AI Services**: Alibaba Tingwu (ASR), ByteDance Doubao (LLM), Alibaba OSS
- **Infrastructure**: Docker, Docker Compose

## Architecture

### Backend Structure (`/backend`)
```
app/
├── main.py              # FastAPI application entry point
├── config.py            # Configuration management with Pydantic Settings
├── database.py          # Database connection and session management
├── routers/             # API route handlers (auth, videos, evaluations)
├── models/              # SQLAlchemy database models
├── schemas/             # Pydantic validation schemas
├── services/            # Business logic layer (video processing, evaluation)
├── external/            # External service integrations (Tingwu, Doubao, OSS)
└── utils/               # Utility functions (timestamps, ID generation)
```

### Frontend Structure (`/frontend`)
```
src/
├── pages/               # Page components (Dashboard, Videos, Settings)
├── components/          # Reusable UI components (tables, dialogs, forms)
├── api/                # API client functions (axios)
├── hooks/              # Custom React hooks
├── types/              # TypeScript type definitions
└── lib/                # Utility functions
```

## Development Commands

### Local Development (Docker)
```bash
# Start all services (PostgreSQL, Backend, Frontend)
docker-compose up -d

# View logs
docker-compose logs -f backend  # Backend logs
docker-compose logs -f frontend # Frontend logs
docker-compose logs -f postgres # Database logs

# Restart services
docker-compose restart backend

# Stop all services
docker-compose down
```

### Frontend Development
```bash
cd frontend

# Install dependencies (first time only)
npm install

# Run development server
npm run dev

# Run linter
npm run lint

# Build for production
npm run build

# Preview production build
npm run preview
```

### Backend Development
```bash
cd backend

# Install dependencies (first time only)
pip install -r requirements.txt

# Run development server (if not using Docker)
uvicorn app.main:app --reload

# Initialize database (first time)
psql -U postgres -d video_analysis -f init_database.sql
```

## Key Development Tasks

### Database Migrations
The system uses manual SQL migrations. When adding fields or changing schema:

1. Add to `backend/init_database.sql` for new setups
2. Create migration SQL files in `backend/migrations/`
3. Follow the migration examples in `backend/migrations/README.md`

### Adding API Endpoints
1. Create route in `backend/app/routers/`
2. Add Pydantic schema in `backend/app/schemas/`
3. Add database model if needed in `backend/app/models/`
4. Implement business logic in `backend/app/services/`
5. Add frontend API client in `frontend/src/api/`

### Video Processing Pipeline
The video analysis follows a 9-step asynchronous pipeline:
1. Video upload/download
2. ASR transcription (Alibaba Tingwu)
3. Transcript formatting
4. Strategic frame extraction
5. Image upload to OSS
6. LLM analysis (ByteDance Doubao)
7. Result parsing and storage
8. Manual review availability
9. Compliance status update

The pipeline is implemented in `backend/app/services/video_processing.py` with task status tracking.

## Configuration

### Environment Variables Required
Create `.env` files in both backend and frontend directories:

**Backend (`/backend/.env`):**
- `POSTGRES_PASSWORD` - PostgreSQL password
- `DASHSCOPE_API_KEY` - Alibaba Tingwu ASR API key
- `TINGWU_APP_ID` - Tingwu App ID
- `DOUBAO_API_KEY` - ByteDance Doubao API key
- `OSS_ACCESS_KEY_ID` - Alibaba OSS access key
- `OSS_ACCESS_KEY_SECRET` - Alibaba OSS secret key

**Frontend (`/frontend/.env`):**
- `VITE_API_BASE_URL` - Backend API URL (default: http://localhost:8000)

### Default Credentials
After database initialization:
- **Admin Email**: 51talk
- **Admin Password**: 123456

## Testing

No automated tests are currently implemented. Testing is done manually through the frontend interface and API endpoints.

## Deployment

Production deployment uses Docker Compose with the same configuration. Configure production environment variables before deploying.

## Claude Code Setup

The repository includes `claude_code_env.sh` for setting up the Claude Code environment variables.

## Important Notes

- All AI API keys should be stored in environment variables, never in code
- The video processing pipeline runs asynchronously to avoid API timeouts
- Database updates use triggers to automatically manage `updated_at` timestamps
- The system supports multiple concurrent video processing tasks
- Error handling includes exponential backoff retry for external API failures
