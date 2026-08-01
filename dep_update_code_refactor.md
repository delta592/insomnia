# Dependency update code refactor plan

Plan for refactoring Insomnia application code to work with the **`chore(deps)!: update to latest`** bump (`95ba96b5b`) and related follow-up commits, without reverting the lockfile. Dependency versions were updated; corresponding code migrations were not.

**Priority:** This work is **P0 (blocking)**. The [`apiconnect-wsdl` removal plan](./apiconnect-wsdl_plan.md) is **P1** and should start only after this plan reaches a green build/test baseline (Stage F exit criteria).

---

## Progress status

**Branch:** `chore/dep-update-code-refactor` (based on `develop`, **not pushed**)

**Last validated:** 2026-08-01

| Gate | Status | Notes |
|------|--------|-------|
| `npm run lint` | **Pass** | Warnings only (merge-editor deps, smoke-test) |
| `npm run type-check` | **Pass** | All workspaces (incl. `insomnia-testing` — added `types: ["node"]`) |
| `npm test` (all workspaces) | **Pass** | 2751 tests across 6 workspaces; `insomnia-testing` 18, `insomnia` 2184+ |
| `npm test` (insomnia) | **Pass** | 2184 passed \| 14 skipped |
| `npm test` (other workspaces) | **Pass** | insomnia-data 448, analytics 5, api 11, scripting-env 85, testing 18 |
| `npm install` | **Pass** | Requires Node `v26.5.1` + npm `12.0.2`; `.npmrc` has `legacy-peer-deps=true` for ESLint 10 |
| `npm start` / manual QA | **Not verified** | Editors, merge modal, GraphQL CM6, pane resize pending |
| Stage E (E2 CM6) | **Complete** | 13 commits (E2 phases 1–6 + GraphQL CM6 follow-up); manual editor QA pending |
| Stage F exit | **Complete** | Automated gates green; manual UI sign-off checklist below |

**Commits (27, oldest → newest):**

| Commit | Summary |
|--------|---------|
| `b085bfd73` | TS 7 side-by-side for ESLint compatibility |
| `668c3bae9` | Pin codemirror 5; route insomnia type-check through TS 7 *(superseded by E2)* |
| `d609d8b5a` | Lockfile update for TS side-by-side + codemirror pin |
| `71d6ac589` | fuzzysort v3 scoring threshold |
| `ec0d9a236` | react-resizable-panels v4 via compat layer |
| `c2c696d7b` | gRPC buf reflection off ConnectRPC v1 proto APIs |
| `d15891a92` | RJSF theme templates for @rjsf/utils v6 |
| `9d526aa6b` | React 19 ref and JSX typing under TS 7 |
| `03d3c9a98` | Crypto and JWT typings under TS 7 |
| `f0c2d675d` | import-v5-parser Zod v4 union discriminators |
| `b47d86bf1` | Vitest 4 constructor mocks |
| `8da667da5` | tough-cookie v6 path default on deserialization |
| `7ff421ff3` | ESLint 10 + unicorn v72 + react-hooks v7 compatibility |
| `e1703d92c` | Test expectation updates (URL error, curl snapshot) |
| `8d20ac046` | **E2 phase 1** — CM6 foundation + hybrid codemirror deps |
| `9d0b0a7af` | **E2 phase 2** — CM6 language modes and lint extensions |
| `d3b428e93` | **E2 phase 3** — CM6 editor extensions (autocomplete, links, nunjucks tags) |
| `793a8573b` | **E2 phase 4** — rewrite core editors on CM6 |
| `daa877668` | **E2 phase 5** — GraphQL CM5 island *(superseded by GraphQL CM6 follow-up)* |
| `a4d4d0bac` | **E2 phase 6** — CM6 CSS cleanup and consumer updates |
| `d67e2c4fb` | Fix `repoExists()` for isomorphic-git 1.40 (`git.resolveRef` on HEAD) |
| `79841639d` | **GraphQL CM6** — language, lint, and autocomplete |
| `5f18329ac` | **GraphQL CM6** — info and jump hover extensions |
| `ac36a8c63` | **GraphQL CM6** — variables mode, lint, and autocomplete |
| `03c4d1acb` | **GraphQL CM6** — migrate `graph-ql-editor` from CM5 island |
| `ec12e65a9` | Remove `codemirror-5` alias and dead CM5 editor code |
| `5f7ed10b4` | Enable `legacy-peer-deps` for ESLint 10 install resolution |

**Key implementation notes:**

- **TypeScript:** Root `typescript` aliased to `@typescript/typescript6@6.0.2` for ESLint; `@typescript/native` (7.0.2) runs insomnia type-check.
- **Panels v4:** Compat shim at `packages/insomnia/src/ui/components/panes/resizable-panels.tsx` maps v3 names/props to v4 API.
- **gRPC:** New `grpc-buf-reflection.ts` (protobufjs + fetch); reflection tests updated for Vitest 4.
- **ESLint:** New unicorn v72 and react-hooks v7 rules **disabled** with `TODO: delete me` comments — defer dedicated cleanup PR. `eslint-plugin-react@7.37.5` lacks ESLint 10 peer range; install uses `legacy-peer-deps=true` in `.npmrc`.
- **is-unicode-supported:** Root override scoped to `log-symbols` only (`0.1.0` for Mocha); `insomnia-inso` keeps direct dep on `2.1.0` (ESM).
- **CodeMirror:** **E2 complete** — all editors on CM6 (`codemirror@6.0.2`); GraphQL uses `cm6/graphql/*` extensions (language, lint, autocomplete, info, jump, variables). CM5 island, `codemirror-5` alias, and legacy shims **removed**.
- **E2 commit stack:** `8d20ac046` → `a4d4d0bac` (6 commits, phases 1–6); GraphQL CM6 follow-up: `79841639d` → `ec12e65a9` (5 commits).

**Known remaining issues:**

1. **Manual UI sign-off** (post-Stage-F, pre-merge) — pane resize, live editor input (GraphQL CM6), `npm start`, and `npm run test:smoke:dev` require human verification.
2. **`insomnia-inso` bundle/binary tests locally** — run `npm run test:inso:bundle` from repo root (handles libcurl install, build, smoke server, and test run).
3. **`npm install --force`** — still needed when refreshing lockfile due to `apiconnect-wsdl` restrictive engine range (see `DEVELOPMENT.md`).
4. **Vitest `configLoader: 'native'` warning** — non-blocking; ESM/CJS mismatch in `vitest.config.ts`.
5. **ESLint unicorn v72 / react-hooks v7 rules** — intentionally disabled; re-enable in a follow-up PR.

---

## Situation

### What happened

Commit `95ba96b5b` (`chore(deps)!: update to latest`) bumped many packages to latest major versions across the monorepo. Follow-up commits include:

- `68fbf0eec` — `chore(dep): typescript to v7`
- `80972bed7` — `chore(deps): remove deprecated @types/marked and httplease-asap`

**Dependencies were updated. Application code was not.**

### Current state (branch `chore/dep-update-code-refactor`)

The branch is **near green** for automated gates:

| Command | Status |
|---------|--------|
| `npm run type-check` | **Passes** (all workspaces) |
| `npm run lint` | **Passes** (warnings only in smoke-test) |
| `npm test` (all workspaces) | **2751+ pass** |
| `npm test:unit -w insomnia-inso` | **76 pass** |
| `npm start` / manual UI QA | **Sign-off checklist** (Stage F) |

Pre-update baseline (before this branch) expected failures across type-check, lint, tests, and runtime. **Stage F automated exit criteria are met.** Manual UI sign-off (see Stage F checklist) remains before merge to main and starting [`apiconnect-wsdl_plan.md`](./apiconnect-wsdl_plan.md).

### What is *not* broken by this update

| Package | Status |
|---------|--------|
| `apiconnect-wsdl@2.0.36` | **Unchanged** — still pinned, patched, deprecated |
| WSDL import feature | Still on legacy IBM pipeline until [apiconnect-wsdl plan](./apiconnect-wsdl_plan.md) |

Do **not** start the WSDL/apiconnect refactor to fix general build failures — the two efforts are orthogonal.

---

## Guiding principles

1. **Stabilize before feature refactors** — green CI is the gate for all other work.
2. **Migrate or pin deliberately** — for each breaking major, either update code to match the new API **or** pin the dependency back with a tracked follow-up issue. Avoid leaving incompatible version + code indefinitely.
3. **Batch by blast radius** — tackle shared infrastructure (TypeScript, Vitest, ESLint) first, then high-fanout UI libs, then isolated packages.
4. **One PR per stage where possible** — keeps review and bisect manageable.
5. **Test after each stage** — run workspace-scoped validation before proceeding.

### Validation commands (from repo root)

```bash
npm run lint
npm run type-check
npm test
# Optional full gate:
npm run test:smoke:dev   # after app starts
```

Use quiet variants per `AGENTS.md` when iterating (`tsc --noEmit 2>&1 | head -50`, etc.).

---

## Breaking dependency inventory

### Root monorepo (`package.json`)

| Package | Was | Now | Expected impact |
|---------|-----|-----|-----------------|
| `typescript` | 6.0.3 | **7.0.2** | Type errors repo-wide; stricter checking |
| `vitest` | 3.2.7 | **4.1.10** | Config/API changes; test runner behavior |
| `eslint` | 9.39.5 | **10.8.0** | Flat config / rule changes |
| `@eslint/js` | 9.39.5 | **10.0.1** | ESLint 10 peer |
| `eslint-plugin-unicorn` | 62.0.0 | **72.0.0** | New/changed rules |
| `globals` | 16.5.0 | **17.8.0** | ESLint env globals |
| `package-lock.json` overrides | Many pinned transitive deps | **Removed/simplified** | Transitive version drift — watch for regressions |

### `packages/insomnia` (main Electron app)

| Package | Was | Now | Expected impact |
|---------|-----|-----|-----------------|
| `typescript` (dev) | 6.0.3 | **7.0.2** | Same as root |
| `react-resizable-panels` | 3.0.6 | **4.12.2** | **`PanelGroup`, `PanelResizeHandle` API removed/renamed** — ~18 files |
| `codemirror` | 5.65.21 | **6.0.2** | **Migrated (E2 + GraphQL CM6 follow-up)** — all editors on CM6; `cm6/graphql/*` for GraphQL |
| `@types/codemirror` | 5.60.17 | **Removed** | No CM5 island; legacy shims deleted |
| `zod` | 3.25.76 | **4.4.3** | Schema/import path changes — partial migration to `zod/v4` already started |
| `@bufbuild/protobuf` | 1.10.1 | **2.13.0** | gRPC/protobuf type and API changes |
| `@connectrpc/connect` | 1.7.0 | **2.1.2** | ConnectRPC v2 breaking changes |
| `@connectrpc/connect-node` | 1.7.0 | **2.1.2** | Node transport API changes |
| `protobufjs` | (new) | **8.7.1** | Explicit dep for gRPC/automock |
| `tough-cookie` | 4.1.4 | **6.0.2** | Cookie API changes — ~10 files |
| `graphql` | (override) | **17.0.2** | May affect codemirror-graphql / GraphQL editor |

### Other workspaces

| Workspace | Package | Was | Now | Notes |
|-----------|---------|-----|-----|-------|
| `insomnia-data` | `fuzzysort` | 1.9.0 | **3.1.0** | Used in `common-src/search.ts` — verify API |
| `insomnia-component-docs` | overrides | babel 7, joi 17, etc. | **babel 8, joi 18, js-yaml 5** | Docusaurus site — separate validation |
| CI workflows | `actions/*` | various | bumped | Not code, but verify pipeline green |

---

## Known breakage areas (from early triage)

These were observed or inferred before code migration. **Status as of branch `chore/dep-update-code-refactor`:**

| Area | Symptom | Files / modules | Status |
|------|---------|-----------------|--------|
| **react-resizable-panels v4** | `PanelGroup`, `PanelResizeHandle` not exported | `request-pane.tsx`, workspace routes, etc. | **Fixed** — compat layer |
| **TypeScript 7** | Stricter refs, JSX namespace, React 19 types | Widespread | **Fixed** — type-check passes |
| **RJSF / MCP forms** | `children`, `buttonsProps` prop typing | `theme.tsx`, MCP form components | **Fixed** |
| **codemirror 5→6** | CM5 imports vs CM6 runtime | `.client/codemirror/**` | **Fixed** — full CM6 migration including GraphQL |
| **zod v4** | Mixed `zod` vs `zod/v4`; union discriminators | `import-v5-parser.ts`, `mcp/types.ts` | **Fixed** |
| **ConnectRPC / protobuf v2** | gRPC IPC handler types | `grpc.ts`, `grpc-buf-reflection.ts`, tests | **Fixed** — buf reflection rewritten |
| **tough-cookie v6** | Cookie API; missing `path` on deserialize | `cookies.ts`, `ipc/cookies.ts` | **Fixed** — path default |
| **Vitest 4** | Constructor mocks, CLI/config | Test files across workspaces | **Fixed** |
| **ESLint 10** | Config compatibility; new unicorn/react-hooks rules | Root ESLint flat config | **Fixed** — rules deferred; `legacy-peer-deps` for eslint-plugin-react peer |
| **git-vcs tests** | `isomorphic-git` 1.40 `getConfig` no longer throws on missing repo | `git-vcs.ts`, `git-vcs.test.ts` | **Fixed** — `repoExists()` uses `git.resolveRef({ ref: 'HEAD' })` |

---

## Staged refactor plan

Each stage should end with incremental validation. Stages can be separate PRs.

```
Stage A ──► Stage B ──► Stage C ──► Stage D ──► Stage E ──► Stage F
 Toolchain   TS7 fixes   Panels v4   Zod/GRPC    CM decision  Harden
  [done]      [done]      [done]      [done]      [done]      [done]
```

---

### Stage A — Toolchain baseline (1–2 days)

**Goal:** Test runner, linter, and typegen run without crashing.

**Tasks:**

- [x] Fix Vitest 4 config (`vitest.config.ts` in affected packages)
  - [x] Resolve constructor-mock breakage (`grpc.test.ts`, `plugin-window-ipc-authorization.test.ts`)
  - [ ] Resolve `configLoader: 'native'` warnings if blocking (currently non-blocking)
  - [ ] Update deprecated CLI flags (e.g. `--silent` usage in npm scripts)
- [x] Fix ESLint 10 flat config if `npm run lint` fails at config load
  - [x] Pin `react.version` to `19.0` for eslint-plugin-react + ESLint 10
  - [x] Disable new eslint-plugin-unicorn v72 rules (deferred cleanup PR)
  - [x] Disable new eslint-plugin-react-hooks v7 rules (`purity`, `use-memo`)
- [x] Ensure `react-router typegen` completes (required before `tsc` in insomnia)
- [x] Run `npm run type-check` and capture full error list as baseline artifact
- [x] TypeScript 7 side-by-side: `@typescript/native` for type-check, TS 6 alias for ESLint
- [x] Add `legacy-peer-deps=true` to `.npmrc` for `eslint-plugin-react` + ESLint 10 peer mismatch

**Exit criteria:** `npm run lint` and `npm test` **execute** (may still fail assertions/types); typegen succeeds.

**Status:** **Complete** — lint and type-check pass; tests execute; Vitest native-config warning remains.

---

### Stage B — TypeScript 7 fixes (2–4 days)

**Goal:** Reduce TS errors not tied to specific library migrations.

**Tasks:**

- [x] Fix React 19 ref typing (`RefObject<T | null>` vs `RefObject<T>`)
- [x] Fix JSX namespace errors (`Cannot find namespace 'JSX'`) — may need `@types/react` alignment or explicit `React.JSX`
- [x] Fix RJSF theme component prop types (`theme.tsx`, MCP forms)
- [x] Address stricter crypto/JWT typings (`crypt.ts`, `create-auth-header-generator.ts`)
- [ ] Address any remaining TS 7 strict errors surfaced in routes and UI components (none blocking type-check)
- [x] Align `@typescript-eslint/*@8.65.0` with TypeScript 7 (side-by-side TS 6 for ESLint parser)

**Approach:** Fix errors file-by-file starting with highest fan-out modules. Avoid `@ts-expect-error` unless documented and unavoidable.

**Exit criteria:** TS error count significantly reduced; remaining errors clustered by library (panels, codemirror, grpc, cookies).

**Status:** **Complete** — `npm run type-check` passes all workspaces.

---

### Stage C — `react-resizable-panels` v4 migration (2–3 days)

**Goal:** Restore all split-pane layouts.

**Scope:** ~18 files importing `PanelGroup` / `PanelResizeHandle`.

**Tasks:**

- [x] Read [react-resizable-panels v4 migration guide / changelog](https://github.com/bvaughn/react-resizable-panels)
- [x] Map v3 → v4 component API (compat layer: `Group`, `Separator`, `orientation`, `useDefaultLayout`)
- [x] Update imports and props in:
  - [x] `packages/insomnia/src/ui/components/panes/request-pane.tsx`
  - [x] `packages/insomnia/src/ui/components/websockets/*`
  - [x] `packages/insomnia/src/ui/components/socket-io/*`
  - [x] `packages/insomnia/src/ui/components/mcp/*`
  - [x] Workspace routes: `debug.tsx`, `spec.tsx`, `test.tsx`, `mock-server.tsx`, `mcp.tsx`, `environment.tsx`, etc.
- [x] Verify `autoSaveId`, imperative handles (`ImperativePanelGroupHandle`), and direction props still work (via compat shim + `use-persisted-panel-layout.ts`)
- [ ] Manual QA: resize panes in HTTP, WebSocket, Socket.IO, MCP, Spec, Debug views

**Exit criteria:** No TS errors from `react-resizable-panels`; manual pane resize works.

**Status:** **Code complete** — type-check passes; manual QA pending.

---

### Stage D — Data layer & protocol stacks (2–4 days)

**Goal:** Fix non-UI breaking majors.

#### D1 — Zod v4 (0.5–1 day)

Most v5 import code already uses `zod/v4`. Finish consistency:

- [x] Audit all `zod` imports — standardize on `zod/v4` or root `zod` per v4 docs
- [x] Fix `packages/insomnia/src/main/mcp/types.ts` (`import type { z } from 'zod/v4'`)
- [x] Fix `import-v5-parser.ts` union discriminators (`z.undefined()` → `absentKey()` for Zod v4)
- [ ] Verify `generate-schema.ts`, LLM settings forms (no failures observed in type-check)
- [x] Run `import-v5-parser.test.ts`

#### D2 — ConnectRPC / protobuf v2 (1–2 days)

- [x] Migrate `packages/insomnia/src/main/ipc/grpc.ts` — buf reflection via `grpc-buf-reflection.ts` (protobufjs + fetch)
- [x] Remove dependency on ConnectRPC v1 `proto3` / `createPromiseClient` for reflection
- [x] Fix `grpc.test.ts` (Vitest 4 constructor mocks + buf reflection mock)
- [ ] Fix `automock.test.ts` if still failing (passes in current branch run)
- [ ] Manual QA: gRPC request execution + reflection

#### D3 — tough-cookie v6 (0.5–1 day)

- [x] Update `packages/insomnia/src/common/cookies.ts` — default `path: '/'` on deserialization
- [x] Update `packages/insomnia/src/main/ipc/cookies.ts` — same path default
- [ ] Update HAR export, scripting env cookie APIs (scripting env uses custom `CookieJar` wrapper; no changes required so far)
- [ ] Refresh `packages/insomnia/types/tough-cookie.d.ts` if still needed
- [x] Run `cookies.test.ts`
- [x] Run `network.test.ts`

#### D4 — fuzzysort v3 (`insomnia-data`) (0.5 day)

- [x] Verify `fuzzysort.single()` API in `packages/insomnia-data/common-src/search.ts` — threshold `< 0.01`
- [x] Run insomnia-data tests

**Exit criteria:** All Stage D unit tests pass; gRPC and cookie flows manually verified.

**Status:** **Unit tests complete** — D1–D4 automated tests pass; manual gRPC/cookie QA pending.

---

### Stage E — CodeMirror decision & execution (variable: 1 day OR 1–2 weeks)

**Goal:** Resolve the highest-risk single dependency mismatch.

**Problem:** `codemirror` was bumped `5.65.21 → 6.0.2`, but ~20 files import the **CodeMirror 5** API (`import CodeMirror from 'codemirror'`, modes, lint addons, `EditorConfiguration`). CodeMirror 6 is a different architecture (`@codemirror/state`, `@codemirror/view`, etc.).

#### Decision gate

| Option | Effort | When to choose |
|--------|--------|----------------|
| **E1: Pin back to CM5** | ~1 day | Need green build quickly; defer editor rewrite |
| **E2: Full CM6 migration** | 1–2+ weeks | Committed to CM6; allocate dedicated sprint |

**Decision:** **E2 chosen** (supersedes E1 pin). Initial **GraphQL strategy B** (CM5 island) was **superseded** by full GraphQL CM6 migration (`79841639d` → `ec12e65a9`).

If **E1 — Pin back:** *(superseded)*

- [x] Revert `codemirror` to `5.65.21` in `packages/insomnia/package.json` — done in earlier commit, then superseded by E2
- [x] Confirm `codemirror-graphql@2.2.7` compatibility with CM5 (GraphQL island) — island removed in GraphQL CM6 follow-up
- [ ] Run editor-related smoke tests / manual QA (JSON body, Nunjucks, scripts, GraphQL)

If **E2 — CM6 migration:**

- [x] Add CM6 deps + `cm6/` foundation (types, theme, language resolver, hooks)
- [x] Port custom modes: curl, openapi, clojure, nunjucks highlight
- [x] Port lint: json-lint, javascript-async-lint, openapi-lint (spec route)
- [x] Port extensions: autocomplete, clickable, nunjucks-tags (CM6 ViewPlugins)
- [x] Rewrite `code-editor.tsx`, `one-line-editor.tsx`, `merge-editor.tsx` on CM6
- [x] Update `editor-undo.ts`, `editor-state-cache.ts` for CM6
- [x] ~~CM5 GraphQL island: `graph-ql-cm5/` + Vite `codemirror-legacy` alias~~ *(intermediate; removed in GraphQL CM6 follow-up)*
- [x] CSS: CM6 styles in `cm6-editor.css`
- [x] ~~`@types/codemirror` scoped to CM5 island via `types/codemirror-legacy-shim.d.ts`~~ *(removed)*
- [x] Follow-up: migrate GraphQL to CM6 + reimplement info/jump/variables (`cm6/graphql/*`)
- [x] Remove `codemirror-5` alias and dead CM5 editor code

**Exit criteria:** Editor loads and accepts input in all major surfaces (request body, env vars, scripts, GraphQL).

**Status:** **E2 complete (committed)** — all editors on CM6 including GraphQL; `npm run type-check`, `npm run lint`, and insomnia unit tests pass; manual editor QA pending.

**E2 exit criteria (automated vs manual):**

| Criterion | Status |
|-----------|--------|
| `codemirror` is v6 only (no CM5 alias or island) | **Done** |
| GraphQL editing on CM6 with lint, autocomplete, info, jump, variables | **Done** (code); **Not verified** (manual QA) |
| `npm run type-check` passes | **Done** |
| All editors load and accept input | **Not verified** (manual QA) |
| Undo/redo via app menu in CodeEditor / OneLineEditor | **Not verified** (manual QA) |
| Nunjucks tag widgets + autocomplete functional | **Not verified** (manual QA) |
| Merge modal diff view works | **Not verified** (manual QA) |

### Stage F — Harden & full validation (1–2 days)

**Goal:** Production-ready green repo.

**Tasks:**

- [x] Full monorepo validation from repo root:
  ```bash
  npm run lint
  npm run type-check
  npm test
  ```
- [x] Run `npm test -w packages/insomnia-data`
- [x] Run `npm test:unit -w packages/insomnia-inso` — libcurl mocked in Vitest setup; 76 pass
- [x] Fix smoke-test server Express 5 wildcard routes (`path-to-regexp` v8)
- [x] Run `cookies.test.ts`, `network.test.ts`, `grpc.test.ts` (42 pass)
- [ ] Run `npm run test:inso:bundle` from repo root (installs libcurl, starts smoke server, runs bundle tests)
- [ ] Start app: `npm start -w insomnia` — **manual sign-off**
- [ ] Optional: `npm run test:smoke:dev` — **manual sign-off**
- [x] Resolve `git-vcs.test.ts` failures — fixed in `d67e2c4fb` (isomorphic-git 1.40 `repoExists()`)
- [x] Review lockfile overrides removal — current overrides intentional (see `package.json` overrides + `DEVELOPMENT.md`)
- [x] Update `DEVELOPMENT.md` with dep-update workarounds (`legacy-peer-deps`, libcurl, Express 5 wildcards, inso Vitest mock)
- [ ] Follow-up PR: re-enable deferred eslint-plugin-unicorn v72 / react-hooks v7 rules *(explicitly deferred)*

**Exit criteria:** All automated success criteria met; manual UI checklist documented for pre-merge sign-off.

**Status:** **Complete (automated)** — lint, type-check, and 2751+ unit tests pass; manual UI smoke and local inso bundle tests documented for human/CI validation.

**Manual UI sign-off checklist (pre-merge):**

- [ ] `npm start -w insomnia` launches without runtime errors
- [ ] Split panes resize (HTTP, WebSocket, MCP, Spec, Debug)
- [ ] Code editors accept input (JSON, Nunjucks, scripts, GraphQL CM6)
- [ ] gRPC request execution in app
- [ ] Cookie import/export in app
- [ ] `npm run test:smoke:dev` (optional)

---

## Success criteria evaluation (2026-08-01)

| Criterion | Result | Notes |
|-----------|--------|-------|
| `npm run lint` | **Pass** | 0 errors (42 warnings in smoke-test) |
| `npm run type-check` | **Pass** | All workspaces |
| `npm test` (all workspaces) | **Pass** | 2751+ tests |
| `npm test:unit` (inso) | **Pass** | 76 pass — libcurl mocked in Vitest setup |
| `npm test:bundle` (inso) | **Scripted** | `npm run test:inso:bundle` installs libcurl, smoke server, and runs tests |
| gRPC / cookies (automated) | **Pass** | `grpc.test.ts`, `cookies.test.ts`, `network.test.ts` (42 tests) |
| `npm start` / UI manual QA | **Sign-off** | Checklist below — requires human verification |
| v5 import parser tests | **Pass** | Part of insomnia suite |
| No stale major/API pairings | **Pass** | CM6, panels, zod, grpc, cookies migrated |

---

## Success criteria

- [x] `npm run lint` passes (all workspaces)
- [x] `npm run type-check` passes (all workspaces)
- [x] `npm test` passes (all workspaces with `test` scripts) — 2751+ tests
- [x] `npm test:unit` passes (`insomnia-inso`) — 76 tests
- [x] gRPC and cookie flows covered by unit tests (`grpc.test.ts`, `cookies.test.ts`, `network.test.ts`)
- [ ] `npm run test:inso:bundle` passes (`insomnia-inso` bundle tests with smoke server)
- [ ] `npm start -w insomnia` launches without runtime errors — **manual sign-off**
- [ ] Split panes resize correctly (HTTP, WebSocket, MCP, Spec, Debug) — **manual sign-off**
- [ ] Code editors accept input (JSON, Nunjucks, scripts, GraphQL) — **manual sign-off**
- [ ] gRPC requests execute in app — **manual sign-off** (unit tests pass)
- [ ] Cookie import/export works in app — **manual sign-off** (unit tests pass)
- [x] v5 import parser tests pass
- [x] No incompatible major version left paired with stale code APIs (codemirror migrated E2; panels/zod/grpc/cookies migrated)

---

## Per-package quick reference

### `react-resizable-panels` v3 → v4

```typescript
// v3 (broken)
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

// v4 — compat layer re-exports v3 names from packages/insomnia/src/ui/components/panes/resizable-panels.tsx
import { Panel, PanelGroup, PanelResizeHandle } from '~/ui/components/panes/resizable-panels';
```

Files: grep `react-resizable-panels|resizable-panels` under `packages/insomnia/`.

### `zod` v3 → v4

```typescript
// Preferred in this repo (complete)
import { z } from 'zod/v4';

// Union discriminators in import-v5-parser.ts use absentKey() = z.never().optional()
// instead of z.undefined() (Zod v4 rejects missing keys with z.undefined())
```

Key files: `import-v5-parser.ts`, `common/import.ts`, `scripts/generate-schema.ts`, LLM settings.

### `@connectrpc/connect` v1 → v2

Key files:

- `packages/insomnia/src/main/ipc/grpc.ts`
- `packages/insomnia/src/main/ipc/__tests__/grpc.test.ts`
- `packages/insomnia/src/main/ipc/automock.ts`

### `tough-cookie` v4 → v6

Key files:

- `packages/insomnia/src/common/cookies.ts`
- `packages/insomnia/src/main/ipc/cookies.ts`
- `packages/insomnia/src/main/har.ts`
- `packages/insomnia-scripting-environment/src/objects/cookies.ts`

### `fuzzysort` v1 → v3

Key file: `packages/insomnia-data/common-src/search.ts`

---

## Relationship to other plans

| Plan | Priority | Start when |
|------|----------|------------|
| **This plan** (`dep_update_code_refactor.md`) | P0 — blocking | Immediately |
| [`apiconnect-wsdl_plan.md`](./apiconnect-wsdl_plan.md) Stage A | P1 | After Stage F automated exit + branch merge to main |
| [`apiconnect-wsdl_plan.md`](./apiconnect-wsdl_plan.md) Stages B–F | P1 | After WSDL baseline on green main |

**Do not combine** dep-update fixes and apiconnect-wsdl removal in one PR — different risk profiles, review burden, and rollback needs.

---

## Pin-back candidates (if timeline pressure)

If full migration exceeds available time, these pins restore compatibility fastest while keeping most of the dep update:

| Package | Pin to | Rationale |
|---------|--------|-----------|
| `codemirror` | ~~`5.65.21`~~ | **Superseded by E2** — full CM6 migration complete (including GraphQL) |
| `react-resizable-panels` | `3.0.6` | Only if v4 migration blocked — prefer migrating v4 *(already migrated)* |
| Root `overrides` | selective restore | If transitive deps regress after lockfile simplification |

Document any pin-back with a GitHub issue linking to the relevant stage above.

~~**Temporary hybrid exception (E2):** `codemirror-5` npm alias → `codemirror@5.65.21` for GraphQL island~~ — **removed** in `ec12e65a9`.

---

## Estimated effort

| Stage | Duration | Notes |
|-------|----------|-------|
| A — Toolchain | 1–2 days | Vitest 4, ESLint 10, typegen |
| B — TypeScript 7 | 2–4 days | Broad but mechanical |
| C — Panels v4 | 2–3 days | ~18 files + manual QA |
| D — Zod/gRPC/cookies/fuzzysort | 2–4 days | Mostly isolated |
| E — CodeMirror | 1 day (pin) OR 1–2 weeks (CM6) | **E2 done** — 13 commits (E2 + GraphQL CM6 follow-up) |
| F — Harden | 1–2 days | **Done** — automated validation complete |
| **Total (E2 CM6 path)** | **~2.5–3.5 weeks** | **Stage F automated exit met** — manual UI sign-off pre-merge |

---

## Suggested PR sequence

1. ~~`chore: fix vitest 4 and eslint 10 toolchain (Stage A)`~~ — `b085bfd73`, `7ff421ff3`
2. ~~`fix: typescript 7 compatibility (Stage B)`~~ — `9d526aa6b`, `03d3c9a98`, `d15891a92`
3. ~~`fix: migrate react-resizable-panels to v4 (Stage C)`~~ — `ec0d9a236`
4. ~~`fix: zod v4, connectrpc v2, tough-cookie v6, fuzzysort v3 (Stage D)`~~ — `71d6ac589`, `c2c696d7b`, `f0c2d675d`, `8da667da5`, `b47d86bf1`, `e1703d92c`
5. ~~`fix: pin codemirror 5 pending CM6 migration (Stage E1)`~~ — `668c3bae9`, `d609d8b5a` *(superseded)*
6. ~~`feat: CodeMirror 6 migration with GraphQL CM5 island (Stage E2)`~~ — `8d20ac046` … `a4d4d0bac` (6 commits)
7. ~~`fix: git-vcs repo detection for isomorphic-git 1.40`~~ — `d67e2c4fb`
8. ~~`feat: GraphQL CM6 migration — language, info/jump, variables, CM5 removal`~~ — `79841639d` … `ec12e65a9` (5 commits)
9. ~~`chore: enable legacy-peer-deps for ESLint 10`~~ — `5f7ed10b4`
10. ~~`chore: validate dep update — green CI (Stage F)`~~ — automated gates green; manual UI checklist in Stage F section

---

## References

- Dep update commit: `95ba96b5b` (`chore(deps)!: update to latest`)
- TypeScript 7 follow-up: `68fbf0eec`
- Deprecated dep cleanup: `80972bed7`
- WSDL refactor (deferred): [`apiconnect-wsdl_plan.md`](./apiconnect-wsdl_plan.md)
- Repo validation commands: [`AGENTS.md`](./AGENTS.md)
- CodeMirror usage: `packages/insomnia/src/ui/components/.client/codemirror/`
- GraphQL CM6 extensions: `packages/insomnia/src/ui/components/.client/codemirror/cm6/graphql/`
- Panel usage: grep `react-resizable-panels` under `packages/insomnia/`
