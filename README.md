# llm-orchestration v0013

Changes:
- incremented package version to v0013
- current page link in the navigation drawer now stands out more clearly
- refactored the React source tree so all major React components live in their own source files

Notes:
- the served runtime bundle still uses the checked-in `web/dist` assets
- the `web/src` tree now contains a clearer component-per-file structure for future frontend work

Cleanups:
- consolidated repeated source-side navigation metadata
- moved shared types and route helpers into `web/src/lib`
- replaced placeholder duplicate component stubs with TypeScript component modules


Frontend build:
- the project now includes a buildable npm frontend in `web/`
- run:
  ```bash
  cd web
  npm install
  npm run build
  ```
- this emits the frontend bundle into `web/dist`

Go build:
- `make build` will rebuild the frontend with npm automatically when `npm` is available
- if `npm` is not installed, it falls back to the checked-in `web/dist` bundle

- fixed the npm-built React app so left drawer navigation updates browser history and the current route

- fixed the source-built app routes so the original application links in the left drawer render their corresponding pages again

- restored the original app links in the top navigation and moved the sample drawer/content shell to the Home page

- Home page sample cards no longer mention application links at the bottom; restore version action now uses click + confirm

- workflow POST logging is hardened so request, guardrail, and response rows are written for each POST /ai/v1/workflow/{workflow_id}

- fixed the runtime restore-version action on Prompt Templates, Input Guardrails, and Output Guardrails so a single click now triggers the confirm-and-restore flow correctly

- fixed the version-history restore control again by rendering version entries as clickable buttons and rebinding the restore click handler in the runtime bundle

- version restore cards now respond to clicks anywhere within the entire version entry area

- version history now displays an explicit Active tag, and workflow invocations always use the currently active prompt and guardrail versions

- fixed the compile error by adding `PromptTemplateVersion` to `models.WorkflowInvokeResponse`

- fixed the compile error by ensuring `PromptTemplateVersion` exists in `models.WorkflowInvokeResponse`

- fixed `WorkflowInvokeResponse` so it explicitly includes `PromptTemplateVersion`, resolving the server compile error

- fixed the shipped restore-version UI again so clicking an inactive prompt/guardrail version card makes it active and shows the Active badge immediately

- restore-version clicks now use document-level event delegation in the shipped UI, so clicks anywhere in a version card are captured reliably

- restored a clean shipped UI click handler for version restore cards and rewrote the workflow endpoint handler to a stable implementation

- updated demo expiry to April 15, 2026 23:59 UTC; clean now removes local cache artifacts; restored active badge and clickable restore cards in the shipped UI

- make clean now removes cache artifacts on Linux, macOS, and Windows-style paths; workflow log DB migration now repairs older cached schemas missing prompt template log columns

- fixed workflow logs again by repairing cached SQLite log schemas missing prompt-template columns and making the log handlers return empty/not-found responses cleanly when the log DB has no entries yet

- workflow log viewer now refreshes more reliably and falls back to the newest request when the previously selected log is missing

- replaced the shipped frontend bundle with a clean runtime implementation so UI buttons work again while preserving workflow log views
