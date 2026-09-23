# Forma AI - fixed portfolio version

## Objective coverage

### User Intake Dashboard
- `/dashboard` loads the latest active schema.
- `/form/:schemaId` loads a specific schema.
- AI Magic Input accepts freeform narrative and can pre-fill schema fields.
- Dynamic fields render from the stored JSON schema.
- `showIf` rules control conditional fields.
- Drafts can be saved locally and synced to the backend.
- Final submissions are persisted for reviewer/admin access.

### Admin & Reviewer Dashboard
- `/admin/dashboard` provides schema editing and revision restore for admins.
- Reviewers/admins can view submitted claims for the active schema.
- Submission rows expose status, average AI confidence, and manual-review flags.
- Existing immutable audit logging is preserved.

## Run

1. `npm install`
2. Copy `.env.example` to `.env`.
3. Set `JWT_SECRET`.
4. MongoDB is optional during local development because the backend falls back to the included in-memory mock database.
5. Start backend: `npm run server`
6. Start frontend in another terminal: `npm run dev`
7. Open the Vite URL, normally `http://localhost:5173/dashboard`.

## AI

Configure at least one provider in `.env` if you want AI extraction. The backend accepts the provider chain supported by `llmService.cjs` rather than requiring OpenAI specifically.
