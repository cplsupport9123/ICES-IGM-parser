<!-- .github/copilot-instructions.md for ICES-IGM-parser -->
# Copilot instructions — ICES IGM Viewer & Generator

Purpose
- Help an AI coding agent become productive quickly in this repo by highlighting architecture, key files, workflows, and project-specific parsing conventions.

Quick facts
- App: Single-page React app (Vite) that parses ICES 1.5 IGM messages entirely client-side.
- Entry: `src/main.jsx` -> `src/App.jsx` (the parser + UI live in `src/App.jsx`).
- Scripts: Run `npm install` then `npm run dev` (see `package.json`).
- No backend: all parsing, grouping and file generation are done in-browser.

Architecture & data flow (big picture)
- Input: user uploads or pastes raw IGM text into the UI.
- Parser: `parseIGM` in `src/App.jsx` splits the manifest into `headerLines`, `vesinfoLines`, cargo records and container records.
- Vesinfo: `parseVesinfoFromLines` maps the F-record into a 26-field object (ICES SACHI01 Part A mapping).
- Cargo/containers: Cargo records (F-records inside `<cargo>` block) are collected into `cargos` by line number; container records (F or V within `<contain>`) are collected into `containers` and associated by line number.
- Output: UI allows filtering by Line / CFS / Container, previewing, and generating new IGM files (per-CFS or for selected lines).

Project-specific parsing conventions (important to follow)
- Record splitting: `splitRecord` handles GS (ASCII 29), the visible glyph `` (represented in files as `` or the glyph ``), or falls back to pipe `|`. Prefer using `splitRecord` when parsing any record.
- VESINFO: The code expects an F-record within the `<vesinfo>` block; fields are accessed by index and mapped into `field1_messageType`..`field26_terminalOperatorCode` in `parseVesinfoFromLines`.
- Cargo CFS extraction: The parser looks for token `LC` and takes the next part as the CFS. If not found, it heuristically looks for tokens like `INCCU`.
- Container records: container lines may start with `F` or `V`. Container properties are taken from predictable index positions (containerNo at parts[9], seal at parts[10], weight at parts[13]).
- Manifest markers: The app expects XML-ish section markers like `<manifest>`, `<vesinfo>`, `<end-vesinfo>`, `<cargo>`, `<END-cargo>`, `<contain>`, `<END-contain>`, and a `TREC` line. Keep those when generating or testing inputs.

Where to change behavior
- Parser tweaks: edit `parseIGM`, `parseVesinfoFromLines`, and `splitRecord` in `src/App.jsx`.
- UI/filters/download: `generateIGMForCFS`, `generateIGMSelectedLines`, and `previewForCFS` live in `src/App.jsx` and produce the downloadable blobs.
- Add helpers or tests: create modules under `src/` (e.g., `src/parse/igmlib.js`) and import into `App.jsx` to keep the single file smaller.

Build & debug workflow
- Install: `npm install` (project depends on `react`, `react-dom`, `xlsx` and dev tools listed in `package.json`).
- Dev server: `npm run dev` (Vite). Open browser at the port Vite prints (usually `http://localhost:5173`).
- Production build: `npm run build` and `npm run preview` for a local preview.
- Lint: `npm run lint`.

Conventions and patterns to follow
- Minimal state: `src/App.jsx` uses React `useState` and local functions — follow similar functional patterns for new components.
- Keep parser deterministic: functions assume fixed indexes for many fields; when adding robust parsing, preserve backward-compatible fallbacks.
- Single-file origin: authors placed parser + UI in `src/App.jsx`. Prefer extracting pure parsing logic into testable modules rather than adding complex code directly into the component.

Integration & external deps
- `xlsx` and `jszip` are used for spreadsheet/zip features (see README); they are client-side dependencies.
- No server communication — adding APIs will require adding a backend folder and clarifying CORS/auth assumptions.

Examples (copyable) — parsing a container record
```js
// from src/App.jsx
const parts = splitRecord(line).map(p => (p===undefined?"":p.trim()));
const containerNo = parts[9] || ""; // used widely in UI
const cfs = data.cargos[parts[7]]?.cfs || ""; // association by line number
```

Testing notes
- There are no automated tests in the repo. When extracting parser functions, add unit tests that feed representative IGM snippets (include GS char and variations) and assert output shapes (`vesinfoObj`, `cargos`, `containers`).

What not to change without asking
- The F-record field indexing in `parseVesinfoFromLines` and cargo/container extraction: changing index assumptions breaks generated IGM output and the UI filters.

Next steps for the agent (when assigned work)
- If asked to add features, first run `npm run dev` and test changes in-browser with sample IGM files from `README.md`.
- If refactoring, extract `parseIGM` into `src/parse/igmlib.js` and add unit tests under `test/`.

If anything here is unclear, tell me which area you'd like expanded (parsing, examples, or workflows).
