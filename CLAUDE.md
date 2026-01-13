# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI-powered video classroom quality analysis system for 51Talk. Processes classroom video recordings and automatically evaluates teaching quality using AI services (ASR + LLM + image analysis).

**Technology Stack:**
- **Backend**: FastAPI, PostgreSQL, SQLAlchemy, Python 3.9+
- **Frontend**: React 18 (TypeScript), Vite, TailwindCSS, shadcn/ui, TanStack Query
- **AI Services**: Alibaba Tingwu (ASR), ByteDance Doubao (LLM), Alibaba OSS (storage)
- **Infrastructure**: Docker, Docker Compose

## Development Commands

### Docker (Primary Development Method)
```bash
docker-compose up -d                    # Start all services
docker-compose logs -f backend          # Backend logs
docker-compose logs -f frontend         # Frontend logs
docker-compose restart backend          # Restart after code changes
docker-compose down                     # Stop all services
```

### Frontend (standalone)
```bash
cd frontend
npm install                             # First time only
npm run dev                             # Dev server at localhost:5173
npm run lint                            # Run ESLint
npm run build                           # Production build
```

### Backend (standalone)
```bash
cd backend
pip install -r requirements.txt         # First time only
uvicorn app.main:app --reload           # Dev server at localhost:8000
```

### Database
```bash
# Initialize (first time)
psql -U postgres -d video_analysis -f backend/init_database.sql

# Run migrations
psql -d video_analysis -f backend/migrations/<migration_file>.sql
```

## Architecture

### Backend (`/backend/app`)
- `main.py` - FastAPI app entry, registers routers: auth, videos, tasks, categories, statistics
- `config.py` - Pydantic Settings for environment variables (validates SECRET_KEY at startup)
- `database.py` - SQLAlchemy session management
- `routers/` - API endpoints:
  - `/api/auth` - Authentication (login, register)
  - `/api/videos` - Video CRUD and management
  - `/api/tasks` - Processing task management
  - `/api/categories` - Evaluation categories
  - `/api/statistics` - Analytics and metrics
- `models/` - SQLAlchemy models (video, user, evaluation, transcript, category)
- `schemas/` - Pydantic request/response schemas
- `services/video_processor.py` - Core 9-step video processing pipeline
- `services/task_manager.py` - Async task queue management
- `services/report_generator.py` - Report generation
- `utils/retry_helper.py` - `@retry_on_network_error` decorator with exponential backoff
- `external/` - External service clients:
  - `tingwu_asr.py` - Alibaba Tingwu ASR client
  - `asr_processor.py` - ASR result parsing and formatting
  - `doubao_model.py` - ByteDance Doubao LLM
  - `oss_uploader.py` - Alibaba OSS
  - `frame_extractor.py` - OpenCV video frame extraction
  - `video_downloader.py` - Video download handler

### Frontend (`/frontend/src`)
- `App.tsx` - React Router setup with protected routes
- `pages/` - Route components:
  - `Login.tsx` - Authentication page
  - `Dashboard.tsx` - Main video list view (`/dashboard`)
  - `StatisticsDashboard.tsx` - Analytics and metrics (`/statistics`)
  - `Upload.tsx` - Video upload interface (`/upload`)
  - `RecordDetail.tsx` - Individual video analysis details (`/record/:id`)
  - `ManualReview.tsx` - Human review interface (`/manual-review`)
- `components/dashboard/` - Dashboard-specific components (FilterBar, ListView, CardView, UploadModal)
- `components/ui/` - shadcn/ui components
- `api/` - API client layer:
  - `client.ts` - Axios instance with auth interceptor
  - `auth.ts`, `videos.ts`, `categories.ts`, `statistics.ts` - Domain-specific API functions

### Video Processing Pipeline (9 steps)
```
1. ASR (Tingwu)       → Speech-to-text transcription
2. Parse ASR          → Format transcript with timestamps
3. Download Video     → Fetch video file locally
4. Extract Frames     → Strategic keyframe extraction (OpenCV)
5. Delete Video       → Clean up local video file
6. Upload OSS         → Upload frames to Alibaba OSS
7. LLM Analysis       → Doubao multimodal analysis (images + transcript)
8. Save Results       → Store evaluations to database
9. Cleanup Files      → Delete local frame images
```

Pipeline implemented in `backend/app/services/video_processor.py` with retry logic via `@retry_on_network_error` decorator.

## Configuration

### Environment Variables

**Backend (`/backend/.env`):**
```
POSTGRES_PASSWORD=<db_password>
DATABASE_URL=postgresql://postgres:<password>@localhost:5432/video_analysis
DASHSCOPE_API_KEY=<alibaba_tingwu_key>
TINGWU_APP_ID=<tingwu_app_id>
DOUBAO_API_KEY=<bytedance_doubao_key>
OSS_ACCESS_KEY_ID=<alibaba_oss_key>
OSS_ACCESS_KEY_SECRET=<alibaba_oss_secret>
```

**Frontend (`/frontend/.env`):**
```
VITE_API_BASE_URL=http://localhost:8000
```

### Default Login Credentials
- Username: `51talk`
- Password: `123456`

## Database Migrations

Manual SQL migrations in `backend/migrations/`:
1. Add schema changes to `backend/init_database.sql` for new setups
2. Create migration SQL file in `backend/migrations/`
3. Execute: `psql -d video_analysis -f backend/migrations/<file>.sql`

## Key Patterns

### Adding API Endpoints
1. Create route in `backend/app/routers/`
2. Add Pydantic schema in `backend/app/schemas/`
3. Add SQLAlchemy model if needed in `backend/app/models/`
4. Implement business logic in `backend/app/services/`
5. Add API client function in `frontend/src/api/`

### Error Handling
- External API calls use `@retry_on_network_error` decorator with exponential backoff
- LLM response parsing has built-in retry (up to 3 attempts)
- Failed tasks stored with `error_message` and `retry_count` fields
