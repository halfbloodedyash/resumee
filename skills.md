# Resume Matcher – Full Clone Roadmap & Architecture Reference

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      BROWSER                                │
│  Next.js 16 + React 19 + Tailwind CSS v4                   │
│  Swiss International Style Design System                    │
│                                                             │
│  Pages: Dashboard │ Builder │ Tailor │ Resume │ Settings    │
│  Print: /print/resumes/[id] │ /print/cover-letter/[id]     │
└────────────────────────┬────────────────────────────────────┘
                         │ /api/* (Next.js rewrite proxy)
┌────────────────────────▼────────────────────────────────────┐
│                  FastAPI :8000                               │
│  Routers: health │ config │ resumes │ jobs │ enrichment     │
│  Services: parser │ improver │ refiner │ cover_letter       │
│  LLM: LiteLLM (OpenAI/Anthropic/Gemini/DeepSeek/Ollama)    │
│  DB: TinyDB (JSON file)    PDF: Playwright (headless Chrome)│
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 0: Environment Setup (Day 1)

### Prerequisites

| Tool | Version |
|------|---------|
| Python | 3.13+ |
| Node.js | 22+ |
| npm | 10+ |
| Git | any |

### Steps

1. **Init monorepo** structure:
   ```
   my-resume-matcher/
   ├── apps/
   │   ├── backend/
   │   └── frontend/
   ├── docker-compose.yml
   ├── Dockerfile
   └── package.json  (root — npm workspaces optional)
   ```

2. **Backend setup**:
   ```bash
   cd apps/backend
   python -m venv .venv && source .venv/bin/activate
   pip install fastapi uvicorn pydantic pydantic-settings tinydb litellm markitdown[docx] playwright python-dotenv
   playwright install chromium
   ```

3. **Frontend setup**:
   ```bash
   cd apps/frontend
   npx create-next-app@latest . --ts --tailwind --app --src=no
   npm install clsx tailwind-merge isomorphic-dompurify lucide-react @tiptap/react @tiptap/starter-kit @dnd-kit/core @dnd-kit/sortable
   ```

4. **Root `package.json` scripts**:
   ```json
   {
     "scripts": {
       "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
       "dev:backend": "cd apps/backend && uvicorn app.main:app --reload --port 8000",
       "dev:frontend": "cd apps/frontend && npm run dev"
     }
   }
   ```

---

## Phase 1: Backend – Database & Config (Days 2-3)

### 1.1 Config System (`app/config.py`)

- Use `pydantic-settings` with `BaseSettings` to load from `.env`
- Fields: `llm_provider`, `llm_model`, `llm_api_key`, `llm_api_base`, `host`, `port`, `cors_origins`, `data_dir`, `log_level`
- Add `config.json` persistence for API keys (survive restarts without env vars)
- Supported LLM providers: `openai | anthropic | openrouter | gemini | deepseek | ollama`

### 1.2 Database Layer (`app/database.py`)

- **TinyDB** – zero-config JSON file database (no SQL, no migrations)
- **3 tables**: `resumes`, `jobs`, `improvements`
- **Resume schema** (stored as JSON):
  ```python
  {
    "resume_id": "uuid4",
    "content": "raw markdown",
    "content_type": "md",
    "filename": "resume.pdf",
    "is_master": True/False,
    "parent_id": None | "uuid4",
    "processed_data": { ...ResumeData JSON... },
    "processing_status": "pending|processing|ready|failed",
    "cover_letter": "text",
    "outreach_message": "text",
    "title": "Role @ Company",
    "created_at": "ISO 8601",
    "updated_at": "ISO 8601"
  }
  ```
- **Job schema**: `{ job_id, content, resume_id, created_at }`
- **Improvement schema**: `{ request_id, original_resume_id, tailored_resume_id, job_id, improvements[], created_at }`
- Key feature: **atomic master assignment** with `asyncio.Lock` – first uploaded resume auto-becomes master; failed masters auto-recover

### 1.3 FastAPI Entrypoint (`app/main.py`)

- CORS middleware with configurable origins
- Lifespan manager for startup (create data dir) / shutdown (close DB, close PDF renderer)
- Mount all routers under `/api/v1`

---

## Phase 2: Backend – LLM Integration (Days 4-5)

### 2.1 LLM Wrapper (`app/llm.py`)

- Wrap **LiteLLM** for unified multi-provider interface
- Two core functions:
  - `complete(messages, temperature, max_tokens)` → plain text
  - `complete_json(messages, temperature, max_tokens)` → parsed JSON dict
- JSON mode: auto-enabled for supporting providers, fallback to text + extraction
- **Retry logic**: 2 retries with increasing temperature for JSON parsing failures
- **Robust JSON extraction**: handle markdown fences, unbalanced braces, nested structures
- **Adaptive timeouts**: 30s (health), 120s (completion), 180s (JSON)
- API keys passed via `api_key=` parameter (never `os.environ`)

### 2.2 Prompt Templates (`app/prompts/`)

- `PARSE_RESUME_PROMPT` – converts markdown resume to structured JSON
- `EXTRACT_KEYWORDS_PROMPT` – extracts structured keywords from job description
- 3 tailoring prompt tiers:
  - **Nudge** – minimal edits, preserve original phrasing
  - **Keywords** – rephrase using JD keywords (default)
  - **Full** – comprehensive rewrite with action verbs
- Each includes `CRITICAL_TRUTHFULNESS_RULES` (8 rules preventing fabrication)
- `COVER_LETTER_PROMPT`, `OUTREACH_MESSAGE_PROMPT`, `GENERATE_TITLE_PROMPT`
- Enrichment prompts: analyze, enhance, regenerate
- Refinement prompts: keyword injection, AI phrase removal blacklist

---

## Phase 3: Backend – Core Services (Days 6-9)

### 3.1 Document Parser (`app/services/parser.py`)

- `parse_document(content_bytes, filename)` → markdown string
  - Uses **markitdown** library to convert PDF/DOCX to markdown
- `parse_resume_to_json(markdown)` → `ResumeData` dict
  - Sends markdown + `PARSE_RESUME_PROMPT` → LLM → structured JSON

### 3.2 Resume Improver (`app/services/improver.py`)

- `extract_job_keywords(jd_text)` → structured keywords dict
- `improve_resume(original, jd, keywords, language, prompt_id)` → tailored resume JSON
- `calculate_resume_diff(original, improved)` → field-level diffs
  - Uses `SequenceMatcher` for description-level diffs
  - Set comparison for skills/certs
- Input sanitization against prompt injection

### 3.3 Multi-Pass Refiner (`app/services/refiner.py`)

- **Pass 1**: Keyword gap analysis + injection (LLM-powered)
- **Pass 2**: AI phrase removal (local – no LLM, uses blacklist/replacements)
- **Pass 3**: Master alignment validation – detect fabricated skills/certs/companies (LLM-powered)
- Calculates keyword match percentage

### 3.4 Content Generator (`app/services/cover_letter.py`)

- `generate_cover_letter(resume_data, jd, language)` → 100-150 word letter
- `generate_outreach_message(resume_data, jd, language)` → 70-100 word message
- `generate_resume_title(jd, language)` → "Role @ Company" format

### 3.5 PDF Renderer (`app/pdf.py`)

- Launches headless Chromium via **Playwright**
- Navigates to `http://localhost:3000/print/resumes/{id}?...template_params`
- Renders page to PDF bytes with configurable margins & page size (A4/Letter)
- Lazy browser init with `asyncio.Lock`, fallback to system Chrome

---

## Phase 4: Backend – API Routers (Days 10-13)

### 4.1 Health Router (`/api/v1/health`, `/api/v1/status`)

- `GET /health` → LLM connectivity check
- `GET /status` → LLM config, master resume info, DB stats

### 4.2 Config Router (`/api/v1/config/*`)

- CRUD for LLM config (provider/model/key)
- `POST /llm-test` – test LLM connection
- Feature toggles (cover letter, outreach message)
- Language settings (UI + content language)
- Prompt style selection (nudge/keywords/full)
- Multi-provider API key management
- Database reset

### 4.3 Resume Router (`/api/v1/resumes/*`) – 17 endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /upload` | Upload PDF/DOCX → parse → store |
| `GET /` | Fetch resume by ID |
| `GET /list` | List all resumes |
| `POST /improve/preview` | Preview tailored resume (no persist) |
| `POST /improve/confirm` | Confirm & persist (hash validation) |
| `POST /improve` | One-shot tailor + persist |
| `PATCH /{id}` | Update structured data |
| `GET /{id}/pdf` | Generate PDF |
| `DELETE /{id}` | Delete resume |
| `POST /{id}/retry-processing` | Retry failed LLM parsing |
| `PATCH /{id}/cover-letter` | Update cover letter |
| `PATCH /{id}/outreach-message` | Update outreach message |
| `PATCH /{id}/title` | Rename resume |
| `POST /{id}/generate-cover-letter` | AI-generate cover letter |
| `POST /{id}/generate-outreach` | AI-generate outreach message |
| `GET /{id}/job-description` | Get JD for tailored resume |
| `GET /{id}/cover-letter/pdf` | Cover letter PDF |

**Key pattern**: Preview/confirm flow with content hash validation to prevent stale data.

### 4.4 Jobs Router (`/api/v1/jobs/*`)

- `POST /upload` – upload job descriptions
- `GET /{job_id}` – fetch JD by ID

### 4.5 Enrichment Router (`/api/v1/enrichment/*`)

- `POST /analyze/{id}` – AI finds weak descriptions
- `POST /enhance` – generate enhanced bullets from user answers
- `POST /apply/{id}` – apply enhancements to master
- `POST /regenerate` – AI-regenerate items (parallel)
- `POST /apply-regenerated/{id}` – apply with conflict detection

---

## Phase 5: Pydantic Schemas (Days 10-13, parallel with routers)

### Core Data Model (`ResumeData`)

```python
ResumeData:
  personalInfo: PersonalInfo  # name, title, email, phone, location, linkedin, github, portfolio
  summary: str
  experience: list[Experience]  # company, title, location, startDate, endDate, description[]
  education: list[Education]    # school, degree, field, startDate, endDate, gpa, description[]
  projects: list[Project]       # name, technologies[], startDate, endDate, description[]
  additionalInfo: AdditionalInfo  # technicalSkills[], languages[], certifications[], interests[]
  sectionMeta: dict[str, SectionMeta]  # order, visible, label per section
  customSections: list[CustomSection]  # type=text|itemList|stringList, with items
```

### Section Types (Custom Sections)

| Type | Data Structure |
|------|---------------|
| `personalInfo` | Always first, not custom |
| `text` | Single text block |
| `itemList` | Items with title, subtitle, years, description[] |
| `stringList` | Simple string array |

---

## Phase 6: Frontend – Foundation (Days 14-17)

### 6.1 Next.js App Router Setup

- `app/layout.tsx` – root layout with fonts (Geist Sans + Space Grotesk), `bg-[#F0F0E8]`
- `app/(default)/layout.tsx` – client wrapper with providers
- `app/print/` – server-rendered routes (no providers)

### 6.2 API Client (`lib/api/`)

- `client.ts` – core `apiFetch`, `apiPost`, `apiPatch`, `apiPut`, `apiDelete`
- Resolves `NEXT_PUBLIC_API_URL` (defaults to same-origin)
- `next.config.ts` – rewrite proxy: `/api/*` → `http://127.0.0.1:8000/api/*`

### 6.3 Design System (`components/ui/`)

Build 13 primitive components following **Swiss International Style**:

- **Colors**: Canvas `#F0F0E8`, Ink `#000`, Hyper Blue `#1D4ED8`, Signal Green `#15803D`, Alert Orange `#F97316`, Alert Red `#DC2626`
- **Typography**: `font-serif` headers, `font-sans` body, `font-mono` metadata
- **Borders**: `rounded-none`, 1px black, hard shadows `shadow-[2px_2px_0px_0px_#000]`
- Components: `Button`, `Card`, `Dialog`, `Input`, `Label`, `Textarea`, `Dropdown`, `ConfirmDialog`, `LinkDialog`, `RetroTabs`, `ToggleSwitch`, `RichTextEditor` (Tiptap), `RichTextToolbar`

### 6.4 State Management (Context-based, no external library)

- `StatusCacheProvider` – caches system status, auto-refresh every 30 min, optimistic counter updates
- `LanguageProvider` – manages UI language (localStorage) + content language (synced to backend)
- `ResumePreviewProvider` – passes tailored resume data between pages

### 6.5 i18n System (Zero-dependency, custom)

- `messages/*.json` – translation files for `en`, `es`, `zh`, `ja`, `pt`
- Client: `useTranslations()` hook → `{ t, messages, locale }`
- Server: `translate(locale, key, params)` function
- Dot-notation key lookup with `{placeholder}` replacement

---

## Phase 7: Frontend – Pages (Days 18-25)

### 7.1 Landing Page (`/`)

- `Hero` component + `SwissGrid` decorative grid

### 7.2 Dashboard (`/dashboard`)

- Shows master resume card or upload prompt
- Lists all tailored resumes as cards
- Upload dialog (drag-and-drop, accepts PDF/DOCX)
- Delete resume with confirmation
- Links to builder, tailor, individual resume pages

### 7.3 Resume Builder (`/builder`)

- Full form editor for `ResumeData`
- Section-based forms: PersonalInfo, Summary, Experience, Education, Projects, Additional
- **Custom sections**: add/rename/delete/hide/reorder via `@dnd-kit`
- **Item reordering**: drag-and-drop within sections
- **Template selector**: 4 templates (swiss-single, swiss-two-column, modern, modern-two-column)
- **Formatting controls**: margins (5-25mm), spacing (1-5), font size (1-5), header scale, page size, accent color
- **Live preview**: paginated resume preview beside the form
- **Regenerate wizard**: select items → give instructions → AI rewrites → diff preview → apply
- Cover letter & outreach message editors

### 7.4 Tailor Page (`/tailor`)

- Paste/upload job description
- Choose prompt style (nudge/keywords/full)
- Preview diff (before/after comparison)
- Confirm to persist tailored resume
- `DiffPreviewModal` component

### 7.5 Resume Viewer (`/resumes/[id]`)

- View resume with template
- Download as PDF
- Rename, delete
- Enrichment wizard (analyze → answer questions → preview → apply)
- View/edit cover letter & outreach message

### 7.6 Settings Page (`/settings`)

- LLM provider/model configuration
- API key management per provider
- Test LLM connection
- Feature toggles (cover letter, outreach)
- Language settings (UI + content)
- Prompt style config
- Database reset (with double confirmation)

### 7.7 Print Pages (Server-rendered for PDF)

- `/print/resumes/[id]` – renders resume with template settings from query params
- `/print/cover-letter/[id]` – renders cover letter
- No client-side JS; Playwright screenshots these pages to produce PDFs

---

## Phase 8: Frontend – Resume Templates (Days 26-28)

### 4 Template Components

| Template | File | Layout |
|----------|------|--------|
| Swiss Single | `resume-single-column.tsx` | Single column, classic |
| Swiss Two-Column | `resume-two-column.tsx` | 65%/35% split |
| Modern | `resume-modern.tsx` | Single column, modern typography |
| Modern Two-Column | `resume-modern-two-column.tsx` | Two column, modern |

### Template System

- **CSS Modules** for print-safe scoped styles (no Tailwind leaking)
- Token-based design (`_tokens.css` for spacing/font variables)
- `DynamicResumeSection` renders any section type
- `SafeHtml` for DOMPurify-sanitized HTML rendering
- `PaginatedPreview` with `usePagination` hook for page-break calculation
- `TemplateSettings` type with `DEFAULT_TEMPLATE_SETTINGS`

---

## Phase 9: Frontend – Advanced Features (Days 29-33)

### 9.1 Enrichment Wizard

- `useEnrichmentWizard` – `useReducer`-based state machine (12 action types, 9 steps)
- Flow: idle → analyzing → questions → generating → preview → applying → complete
- `EnrichmentModal`, `QuestionStep`, `PreviewStep`, `LoadingSteps` components

### 9.2 Regenerate Wizard

- `useRegenerateWizard` – `useState`-based (5 steps)
- Flow: select items → instructions → generating → diff preview → apply
- `RegenerateWizard`, `RegenerateDialog`, `RegenerateDiffPreview` components

### 9.3 File Upload Hook

- `useFileUpload` – drag-and-drop with validation (maxFiles, maxSize, accept)
- Returns `[state, actions]` tuple

### 9.4 JD Comparison View

- `HighlightedResumeView` – highlights JD keywords in resume text
- `JdComparisonView` – side-by-side layout
- `keyword-matcher.ts` utility for matching

---

## Phase 10: Deployment & Docker (Days 34-35)

### Multi-stage Dockerfile

```
Stage 1: Node 22 bookworm → build Next.js (standalone output)
Stage 2: Python 3.13-slim → install deps + Playwright Chromium
         Copy built frontend + backend
         Entrypoint: start.sh (uvicorn + node both)
```

### docker-compose.yml

```yaml
services:
  resume-matcher:
    build: .
    ports: ["3000:3000"]
    volumes: [resume-data:/app/backend/data]
    environment:
      - LLM_PROVIDER=openai
      - LLM_API_KEY=${LLM_API_KEY}
```

### Startup script (`docker/start.sh`)

- Starts FastAPI (uvicorn) on :8000 in background
- Starts Next.js (node server.js) on :3000 in foreground
- Single container serves both

---

## Dependency Summary

### Backend (`requirements.txt`)

```
fastapi==0.128.4
uvicorn==0.40.0
pydantic==2.12.5
pydantic-settings==2.12.0
tinydb==4.8.2
litellm==1.81.8
markitdown[docx]==0.1.4
playwright==1.58.0
python-dotenv==1.2.1
```

### Frontend (`package.json` key deps)

```
next: ^16.1.6
react: ^19.2.4
tailwindcss: v4
@tiptap/react: ^3.20
@dnd-kit/core: ^6.3
lucide-react: ^0.575
clsx + tailwind-merge
isomorphic-dompurify
```

---

## Build Order (Critical Path)

```
Phase 0  ──► Phase 1 ──► Phase 2 ──► Phase 3 ──► Phase 4
 Setup       DB+Config    LLM         Services    Routers
                                                     │
Phase 6  ◄───────────────────────────────────────────┘
 FE Foundation
    │
Phase 7 ──► Phase 8 ──► Phase 9 ──► Phase 10
 Pages      Templates    Wizards     Docker
```

**Estimated total: ~5-6 weeks** for a solo developer familiar with the stack.

---

## Quick-Start (Run Existing Clone)

```bash
git clone https://github.com/srbhr/Resume-Matcher.git
cd Resume-Matcher
npm run install    # installs both frontend + backend deps
npm run dev        # starts FastAPI :8000 + Next.js :3000
```

Then open `http://localhost:3000`, go to Settings, configure your LLM API key, and start uploading resumes.

---

## Backend File-by-File Reference

### Infrastructure

| File | Purpose | Key Exports |
|------|---------|-------------|
| `app/main.py` | FastAPI entry point, CORS, lifespan | `app` |
| `app/config.py` | Pydantic settings, API key persistence | `Settings`, `settings` |
| `app/database.py` | TinyDB wrapper (resumes/jobs/improvements) | `Database`, `db` |
| `app/llm.py` | LiteLLM wrapper, multi-provider AI | `LLMConfig`, `get_llm_config()`, `complete()`, `complete_json()` |
| `app/pdf.py` | Playwright PDF rendering | `render_resume_pdf()`, `PDFRenderError` |

### Routers

| File | Prefix | Endpoint Count | Key Operations |
|------|--------|----------------|----------------|
| `app/routers/health.py` | `/api/v1` | 2 | Health check, system status |
| `app/routers/config.py` | `/api/v1/config` | 13 | LLM config, API keys, features, language, prompts, reset |
| `app/routers/resumes.py` | `/api/v1/resumes` | 17 | Upload, CRUD, improve, PDF, cover letter, outreach |
| `app/routers/jobs.py` | `/api/v1/jobs` | 2 | Upload JD, fetch JD |
| `app/routers/enrichment.py` | `/api/v1/enrichment` | 5 | Analyze, enhance, apply, regenerate |

### Services

| File | Purpose | Key Functions |
|------|---------|---------------|
| `app/services/parser.py` | PDF/DOCX → markdown → JSON | `parse_document()`, `parse_resume_to_json()` |
| `app/services/improver.py` | Resume tailoring + diff | `extract_job_keywords()`, `improve_resume()`, `calculate_resume_diff()` |
| `app/services/refiner.py` | 3-pass refinement pipeline | `refine_resume()`, `analyze_keyword_gaps()`, `remove_ai_phrases()`, `validate_master_alignment()` |
| `app/services/cover_letter.py` | Auxiliary content generation | `generate_cover_letter()`, `generate_outreach_message()`, `generate_resume_title()` |

### Schemas

| File | Key Models |
|------|------------|
| `app/schemas/models.py` | `ResumeData`, `PersonalInfo`, `Experience`, `Education`, `Project`, `AdditionalInfo`, `SectionMeta`, `CustomSection`, all API request/response models |
| `app/schemas/enrichment.py` | `AnalysisResponse`, `EnhancementPreview`, `RegenerateRequest`, `RegenerateResponse` |
| `app/schemas/refinement.py` | `RefinementConfig`, `KeywordGapAnalysis`, `AlignmentReport`, `RefinementResult` |

### Prompts

| File | Key Prompts |
|------|-------------|
| `app/prompts/templates.py` | `PARSE_RESUME_PROMPT`, `EXTRACT_KEYWORDS_PROMPT`, `IMPROVE_RESUME_PROMPT_*` (3 tiers), `COVER_LETTER_PROMPT`, `OUTREACH_MESSAGE_PROMPT` |
| `app/prompts/enrichment.py` | `ANALYZE_RESUME_PROMPT`, `ENHANCE_DESCRIPTION_PROMPT`, `REGENERATE_ITEM_PROMPT` |
| `app/prompts/refinement.py` | `AI_PHRASE_BLACKLIST`, `AI_PHRASE_REPLACEMENTS`, `KEYWORD_INJECTION_PROMPT` |

---

## Frontend File-by-File Reference

### Pages / Routes

| Route | File | Description |
|-------|------|-------------|
| `/` | `app/(default)/page.tsx` | Landing page with `Hero` + `SwissGrid` |
| `/dashboard` | `app/(default)/dashboard/page.tsx` | Master resume, tailored list, upload |
| `/builder` | `app/(default)/builder/page.tsx` | Resume form editor + live preview |
| `/tailor` | `app/(default)/tailor/page.tsx` | JD paste → prompt select → diff → confirm |
| `/resumes/[id]` | `app/(default)/resumes/[id]/page.tsx` | Resume viewer, PDF download, enrich |
| `/settings` | `app/(default)/settings/page.tsx` | LLM config, API keys, language, features |
| `/print/resumes/[id]` | `app/print/resumes/[id]/page.tsx` | Server-rendered for PDF capture |
| `/print/cover-letter/[id]` | `app/print/cover-letter/[id]/page.tsx` | Server-rendered cover letter PDF |

### Components

| Directory | Count | Key Components |
|-----------|-------|----------------|
| `components/builder/` | 22 files | `ResumeBuilder`, `ResumeForm`, `SectionHeader`, `DynamicSectionForm`, `DraggableSectionWrapper`, `TemplateSelector`, `FormattingControls`, `RegenerateWizard`, `CoverLetterEditor`, `OutreachEditor` |
| `components/builder/forms/` | 9 files | `PersonalInfoForm`, `SummaryForm`, `ExperienceForm`, `EducationForm`, `ProjectsForm`, `AdditionalForm`, `GenericItemForm`, `GenericListForm`, `GenericTextForm` |
| `components/resume/` | 8 files | `ResumeSingleColumn`, `ResumeTwoColumn`, `ResumeModern`, `ResumeModernTwoColumn`, `DynamicResumeSection`, `SafeHtml` |
| `components/preview/` | 4 files | `PageContainer`, `PaginatedPreview`, `usePagination` |
| `components/ui/` | 13 files | `Button`, `Card`, `Dialog`, `Input`, `Textarea`, `Dropdown`, `ConfirmDialog`, `RichTextEditor`, `ToggleSwitch`, etc. |
| `components/common/` | 2 files | `ResumePreviewProvider`, `LocalizedErrorBoundary` |
| `components/dashboard/` | 3 files | `ResumeCard`, `Resume`, `ResumeUploadDialog` |
| `components/enrichment/` | 4 files | `EnrichmentModal`, `LoadingSteps`, `PreviewStep`, `QuestionStep` |
| `components/tailor/` | 1 file | `DiffPreviewModal` |
| `components/home/` | 2 files | `Hero`, `SwissGrid` |
| `components/settings/` | 1 file | `ApiKeyMenu` |

### Hooks

| Hook | Purpose |
|------|---------|
| `useEnrichmentWizard` | `useReducer` state machine — 12 actions, 9 steps |
| `useRegenerateWizard` | `useState` — 5-step AI rewrite flow |
| `useFileUpload` | Drag-and-drop with validation |
| `usePagination` | Page-break calculation for preview |

### API Client (`lib/api/`)

| Module | Key Functions |
|--------|---------------|
| `client.ts` | `apiFetch`, `apiPost`, `apiPatch`, `apiPut`, `apiDelete`, `API_BASE` |
| `resume.ts` | `uploadJobDescriptions`, `improveResume`, `previewImproveResume`, `confirmImproveResume`, `fetchResume`, `fetchResumeList`, `updateResume`, `downloadResumePdf`, `deleteResume` |
| `config.ts` | `fetchLlmConfig`, `updateLlmConfig`, `testLlmConnection`, `fetchSystemStatus`, `fetchFeatureConfig`, `updateFeatureConfig`, `fetchLanguageConfig`, `updateLanguageConfig`, `fetchPromptConfig`, `updatePromptConfig`, `fetchApiKeyStatus`, `updateApiKeys`, `deleteApiKey`, `clearAllApiKeys`, `resetDatabase` |
| `enrichment.ts` | `analyzeResume`, `generateEnhancements`, `applyEnhancements`, `regenerateItems`, `applyRegeneratedItems` |

### State Management (No external library)

| Provider | Scope | Purpose |
|----------|-------|---------|
| `StatusCacheProvider` | App-wide | System status cache, optimistic counter updates, 30-min auto-refresh |
| `LanguageProvider` | App-wide | UI language (localStorage) + content language (backend sync) |
| `ResumePreviewProvider` | App-wide | Pass tailored resume data between Tailor → Resume pages |

### i18n (Custom zero-dependency)

| File | Role |
|------|------|
| `i18n/config.ts` | Locales: `en`, `es`, `zh`, `ja`, `pt` |
| `lib/i18n/translations.ts` | Client hook: `useTranslations()` → `{ t, messages, locale }` |
| `lib/i18n/server.ts` | Server function: `translate(locale, key, params)` |
| `lib/i18n/messages.ts` | Static imports of all JSON message files |
| `messages/*.json` | Translation files |

### Types & Constants

| File | Key Exports |
|------|-------------|
| `lib/types/template-settings.ts` | `TemplateType`, `PageSize`, `MarginSettings`, `TemplateSettings`, `DEFAULT_TEMPLATE_SETTINGS` |
| `lib/config/version.ts` | `APP_VERSION`, `APP_CODENAME`, `APP_NAME` |
| `lib/constants/page-dimensions.ts` | `PAGE_DIMENSIONS`, `mmToPx()`, `calculatePreviewScale()` |
| `lib/utils.ts` | `cn()` (clsx + tailwind-merge), `formatDateRange()` |
| `lib/utils/download.ts` | `downloadBlobAsFile()`, `sanitizeFilename()` |
| `lib/utils/section-helpers.ts` | `DEFAULT_SECTION_META`, section ordering helpers |

---

## Key Design Patterns

1. **Swiss International Style** – `rounded-none`, 1px black borders, hard shadows, `font-serif` headers, `font-mono` metadata, canvas `#F0F0E8`
2. **Proxy-based API** – Next.js rewrites proxy `/api/*` to backend; no CORS issues
3. **Server components for PDF** – Print routes are server-rendered for Playwright PDF capture
4. **Preview/confirm flow** – Hash-based validation ensures confirmed data matches preview
5. **Multi-pass refinement** – Keyword injection → AI phrase removal → alignment validation
6. **Truthfulness guardrails** – Prompt injection sanitization, fabrication detection, master alignment
7. **Atomic master resume** – `asyncio.Lock` prevents race conditions on concurrent uploads
8. **CSS Modules for templates** – Print-safe scoped styles that don't leak
9. **Optimistic UI updates** – `StatusCacheProvider` counter methods update UI before API confirms
10. **Dual i18n** – UI language (localStorage) vs content language (synced to backend for LLM output)
