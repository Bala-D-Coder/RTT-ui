# Voice Notes — UI

React frontend for the Procucev AI Tech hiring assignment: a **notes app whose primary input is speech**.
Watch words appear as you speak, and they become notes you can
edit, pin, tag, remind against, and recycle.

This repository is the **UI milestone**. Everything you see and click is real product code; the two things it
stands in for are the server (persistence) and the streaming ASR engine. See
[What is real and what is mocked](#what-is-real-and-what-is-mocked).

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production bundle
npm run lint       # oxlint
```

No API key, no database, no docker. Seeded demo data (realistic Hinglish notes and reminders)
is written to `localStorage` on first load. **Reset it any time from Settings → Reset demo data.**

---

## The screens

| Route | What it answers |
|---|---|
| `/` **Home** | *What did I capture today?* Greeting, the two capture buttons, and today's note grid. Nothing else — no stat cards, no derived minutes. |
| `/notes` **Notes** | Every live note. Search (debounced), tag filter pills, sort (edited / created / title), grid ⇄ list. |
| `/notes/:id` **Note** | Block editor: title autosave, colour, tags you can add and remove, per-block editing and delete, and **the reminders that belong to this note** — schedule (repeat: once, daily, weekly, weekdays), *Snooze 1 h*, *Complete*, delete. A reminder is a property of a note, so this is the only place one is created. |
| `/bin` **Bin** | The recycle bin: 30-day countdown per note, restore, delete forever, empty bin. Purging itself is automatic. |
| `/settings` **Settings** | Theme (light / dark), engine switch (live mic vs replay), data-source and support readout, retention, reset demo data. |

## The recorder

A fixed bar at the bottom of every screen: status, level meter, live interim ticker, elapsed time,
transcript panel and start/stop. There is **no language picker** — the engine listens in your browser's
language, and the bar prints which one it resolved. Press **Stop** and the bar reveals the
decision: **Save as new note**, **Add to open note** (when a note is on screen) or **Discard** — you never
have to navigate anywhere to keep a dictation. The sidebar mic button and the **Dictate / Text note**
buttons create a note and drop straight into it.

Speech is transcribed and stored as note text. There is no audio file and no session log to keep.


---

## What is real and what is mocked

**Real product code**

- The whole CRUD surface: create, edit, autosave, pin, tag (add and remove), colour, soft delete, restore,
  purge, empty bin, per-note reminders with scheduling/snooze/complete.
- **Live speech-to-text** via the browser `SpeechRecognition` API — real microphone, real word-by-word
  interim results, no key and no quota. Language resolved from the browser locale, per-error messaging
  (`not-allowed`, `audio-capture`, `network`), and an `AnalyserNode` level meter that analyses the mic stream
  without ever routing it to output.
- The 30-day recycle-bin policy, the reminder scheduler tick, the toast channel, optimistic invalidation,
  loading / empty / error states on every screen, `prefers-reduced-motion`, `aria-live` transcript,
  two-step destructive confirms, code-split routes.
- Two complete themes (light and dark) from one token set: nothing is mixed, the choice is stored in
  `localStorage`, follows `prefers-color-scheme` until you pick, and is applied before the first paint.

**Stood in for, by design**

| Instead of | This milestone | Later (API milestone) |
|---|---|---|
| PostgreSQL + REST | `MockDataSource` on `localStorage` behind the `DataSource` interface | `HttpDataSource`; components and page services unchanged |
| Streaming server ASR (faster-whisper / Gemini Live) | browser Web Speech, or a replay take in browsers with no mic | `/ws/transcribe` with PCM frames behind the same `TranscriptionDriver` interface |
| WebSocket + FCM push | in-tab scanner + toasts, emitting the exact `WsNotificationEvent` shape | `/ws/notifications` for the open tab, FCM for closed apps |
| Daily server recycler job | purge sweep on boot and every 60 s while a tab is open | `DELETE FROM notes WHERE purge_at <= now()` in the worker |
| JWT auth | none — one seeded demo user, single tenant | email/password + JWT, per-user scoping |

Two seams absorb every mock/real difference and are the reason the backend will not need UI rework:

```ts
interface DataSource      // src/types/datasource.ts   — persistence
interface TranscriptionDriver  // src/services/transcription.ts — dictation engine
```

**Honest limits**

- Data is per-browser. Nothing is on a server yet, so "a relational DB stores the transcription" is not met by this milestone.
- Browser Web Speech handles one language per session, so the language comes from your browser locale and there is no picker. Server-side Whisper finals are what genuinely fix code-switching inside one take.
- `SpeechRecognition` is Chromium/Safari only. Firefox falls back to the replay engine with a visible notice.
- The mic needs a secure context: `localhost` qualifies, a plain-IP `http://` deployment will show a dead record button.
- The client-side purge sweep only runs while a tab is open, so a note can sit in the Bin past 30 days if the app is never loaded. `purgeAt` is stored on the row so the UI countdown and the future server job can never disagree.

---

## Structure

House style: `Docs/LAZY-LOADING_STRUCTURE.md` — Vite + React Router `createBrowserRouter`, CSS Modules with
global custom-property tokens, no Tailwind and no component kit.

```
src/
  pages/<Name>/        <Name>.tsx · <Name>.module.css · <Name>.routes.tsx · <Name>Api.services.ts · index.ts
    pages/<Child>/     nested route (Notes → ViewNote), with its own components/ (ReminderForm, ReminderRow)
  pages/shared/components/   Capture, NoteCard — used by more than one page
  components/          Sidebar, RecorderBar, Button, PageLoader, Toaster — app-wide primitives
  context/             RecorderContext, NotificationsContext
  layout/              AppLayout (rail + centered content shell + recorder bar)
  route/               app.route.tsx, route.helpers.tsx (createLazyRoute + Suspense)
  services/            data-source, mock-data-source, seed-data, transcription, web-speech, level-meter, reminder-scanner, theme
  constants/           env (Zod-validated), navLinks, bin, recorderLabels
  types/               contracts.ts (DTOs), datasource.ts (the seam)
  hooks/ utils/        usePageTitle, useCapture, useDictationCommit, useBinCount, useTheme, format, queryKeys
```

`src/types/contracts.ts` is the single source of truth for shapes; the API milestone mirrors it into
`RTT-api` and drift-checks it in CI. Note truth for the recycle bin lives in `deletedAt` + `purgeAt` only —
there is deliberately no parallel `status` enum that could disagree with it.

Environment (`.env.example`): `VITE_DATA_SOURCE=mock|http`, `VITE_TRANSCRIBE=webspeech|replay`
(also switchable at runtime in Settings).

## Tests and CI

Not in this milestone: the engine is browser-dependent, so Playwright would test a fake. It lands with the
API milestone driving the `mock` engine, where the whole flow is deterministic and keyless.
