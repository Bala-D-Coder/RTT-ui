# Voice Notes — UI (React 19 + TypeScript)

React frontend for the Procucev AI Tech hiring assignment: a **notes app whose primary input is speech**.
Watch words appear as you speak, and they become notes you can
edit, pin, tag, remind against, export, and recycle.

---

## 🚀 Running the UI

```bash
# 1. Install dependencies
npm install

# 2. Local verification (typecheck, lint, build)
npm run typecheck    # tsc -b
npm run lint         # oxlint
npm run build        # production build with vite

# 3. Development server
# Run against mock (in-browser localStorage demo):
npm run dev

# OR run against the live Spring Boot API:
VITE_DATA_SOURCE=http npm run dev
```

---

## 🔌 Data Source Seam: Mock vs HTTP

The UI is built strictly around the `DataSource` abstraction ([`src/types/datasource.ts`](src/types/datasource.ts)):

```
           ┌───────────────────────┐
           │      Components       │
           │ (Home, Notes, Editor) │
           └───────────┬───────────┘
                       │
           ┌───────────▼───────────┐
           │   DataSource (Seam)   │
           └─────┬───────────┬─────┘
                 │           │
   VITE_DATA_SOURCE=mock     VITE_DATA_SOURCE=http
                 │           │
     ┌───────────▼──┐     ┌──▼───────────────────────────┐
     │MockDataSource│     │ HttpDataSource (apiFetch)    │
     │ localStorage │     │ Bearer + httpOnly cookie     │
     └──────────────┘     │ Q1 Diffing on note edits     │
                          │ Real-time Ticket WebSocket   │
                          └──────────────────────────────┘
```

1. **`MockDataSource`**: Uses `localStorage`, runs 100% offline with seeded demo notes and browser Web Speech recognition. No server required.
2. **`HttpDataSource`**: Connects to the Spring Boot REST API at `http://localhost:8080`:
   - Single-flight token refresh on `401 Unauthorized`.
   - **Q1 Diffing Algorithm**: Note block updates compute changed text (`PUT /blocks/:id`), missing blocks (`DELETE /blocks/:id`), and metadata (`PATCH /notes/:id`), never dumping whole arrays to the server.
   - Dual-token auth (short-lived JWT access token in memory/localStorage + `refreshToken` in httpOnly cookie).

---

## 📜 Contract Synchronization & OpenAPI Generation

To guarantee contract honesty without manual copy-paste errors:
- **REST endpoints**: The backend publishes its OpenAPI 3.1 specification (generated via SpringDoc to `target/openapi.json`). TypeScript types are generated via `npx openapi-typescript target/openapi.json -o src/types/api.gen.ts`.
- **WebSocket events**: OpenAPI specifies HTTP REST APIs, not WebSocket framing. WebSocket wire events (`WsTranscribeEvent`, `WsNotificationEvent`) are hand-mirrored in [`src/types/contracts.ts`](src/types/contracts.ts) and verified against the backend DTOs.
- **CI Drift Check**: In CI, `git diff --exit-code src/types/api.gen.ts` guarantees that API schema changes require explicit UI type updates.

---

## 🖥️ Application Screens & Navigation

| Route | View | Description |
|---|---|---|
| `/` | **Home** | "What did I capture today?" Greeting, capture buttons, and today's timeline with speech provenance indicators. |
| `/notes` | **Notes** | Search (debounced), tag filters, sort options (edited / created / title), grid ⇄ list views, and a dedicated **Voice** chip filtering dictated notes. |
| `/notes/:id` | **Note Editor** | Block editor with autosave, colour picker, tag pills, per-block editing, note download/export (`.md`, `.txt`, `.json`), and reminder management. |
| `/bin` | **Bin** | Soft-deleted notes with 7-day countdown, restore, permanent purge, and empty bin. |
| `/settings` | **Settings** | Light/dark theme switch, engine switch, data source status, retention policy info, and session logout. |
| `/login` | **Login** | Email & password form with demo account quick-fill (`demo@apex.in`) and 4 server error envelopes (`invalid_credentials`, `account_locked`, `credentials_expired`, `account_disabled`). |
| `/admin` | **Admin** | Restricted to `role: admin`. Manage issued credentials (issue new token, extend +24h, disable/enable, revoke) and reseed database sample data (`POST /api/v1/admin/reseed`). |

---

## 🎙️ Speech Input & Dictation

- Audio capture is managed via `useRecorder` and `RecorderBar`:
  - When on `http`: fetches single-use 30s ticket from `POST /api/v1/realtime/ticket`, establishes `/ws/transcribe`, streams 16 kHz PCM16 frames, and appends a dictated block (`source: 'dictation'`).
  - When on `mock`: runs browser `SpeechRecognition` or replay mode without network.
- Blocks carry clear source provenance: `'dictation'` blocks feature a microphone indicator and feed the Home page timeline and Voice filter.
