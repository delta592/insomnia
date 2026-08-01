# `apiconnect-wsdl` removal plan

Plan for removing the deprecated, IBM-licensed `apiconnect-wsdl@2.0.36` dependency and refactoring Insomnia's WSDL importer to follow **industry-standard WSDL/SOAP and OpenAPI interoperability practices**, delivered in **staged increments** with minimal user-facing disruption.

---

## Guiding principles (industry alignment)

This refactor follows established SOAP/WSDL ecosystem norms — not IBM API Connect gateway conventions.

| Principle | Industry norm | Current Insomnia (to remove) |
|-----------|---------------|------------------------------|
| **Contract source** | WSDL 1.1 document + XSD types (W3C) | IBM Swagger 2.0 with `x-ibm-*` extensions |
| **Interchange format** | OpenAPI 3.x (OAS) between conversion tools and clients | Proprietary IBM Swagger → Postman v2 → Insomnia |
| **Endpoint discovery** | `soap:address@location` under `wsdl:port` | `x-ibm-configuration.assembly.execute[0].proxy['target-url']` |
| **SOAPAction** | `soap:operation@soapAction` / `soap12:operation@soapAction` | `x-ibm-soap.soap-action` |
| **Example payloads** | Generated from XSD schema (document/literal or RPC style) | IBM `definitions.*.example` via `$ref` paths |
| **Security** | WS-Policy / WSDL extensions when present; otherwise none | WS-Security placeholder injected unconditionally |
| **Multi-file WSDL** | Resolve `wsdl:import`, `xsd:import`, `xsd:include` relative to file path | Relies on `apiconnect-wsdl` + `oriFilePath` |
| **Interoperability profile** | WS-I Basic Profile constraints where applicable | Not evaluated today |

**Primary architectural shift:**

```
Today (non-standard):
  WSDL → IBM Swagger 2.0 → Postman Collection → Insomnia ImportRequest[]

Target (industry-standard):
  WSDL → OpenAPI 3.1 → Insomnia ImportRequest[]   (reuse openapi-3 importer)
         ↑                    ↑
    standard converter    extend for XML/SOAP gaps only
```

Insomnia-specific code should be limited to **gaps OpenAPI cannot express well** (SOAP envelope examples, binding style nuances) — not a parallel WSDL stack.

---

## Current state

### What the feature does

The WSDL importer (`packages/insomnia/src/main/importers/importers/wsdl.ts`) lets users import a `.wsdl` file and get HTTP requests — one per SOAP operation — with endpoint URL, `SOAPAction`, headers, and a sample SOAP envelope body.

### Current pipeline (legacy)

```
WSDL file (path or string)
  → apiconnect-wsdl: getJsonForWSDL / getWSDLServices / getSwaggerForService
  → IBM-flavored Swagger 2.0 (x-ibm-* extensions + XML examples in definitions)
  → convertToPostman() in wsdl.ts
  → Postman Collection v2.0 JSON
  → postman.convert()
  → Insomnia ImportRequest[] export
```

### Files involved today

| File | Role |
|------|------|
| `packages/insomnia/src/main/importers/importers/wsdl.ts` | Importer entry; IBM Swagger → Postman adapter |
| `packages/insomnia/types/apiconnect-wsdl.d.ts` | Hand-written types for IBM Swagger shape |
| `patches/apiconnect-wsdl+2.0.36.patch` | Removes example-size limits in upstream library |
| `packages/insomnia/esbuild.entrypoints.ts` | Externalizes `apiconnect-wsdl` in Electron build |
| `packages/insomnia/src/main/importers/importers/fixtures/wsdl/*.wsdl` | Snapshot test fixtures |
| `packages/insomnia/src/main/importers/importers/__snapshots__/index.test.ts.snap` | Golden output for WSDL imports |
| `DEVELOPMENT.md` | Lockfile engine workaround for this dep |

### Why this is hard

`apiconnect-wsdl` is the **core compiler** for a user-facing feature. Insomnia is coupled to its **IBM-specific output**, not to standard WSDL or OpenAPI APIs. Replacing it requires a **feature migration**, not a dependency swap.

### Existing test coverage

Fixture snapshots exist for `addition-input.wsdl` and `calculator-input.wsdl` via `index.test.ts`. These are the regression baseline for all stages.

### OpenAPI importer gap (must address)

The existing `openapi-3.ts` importer only **generates JSON body examples** (`application/json`). For SOAP content types (`text/xml`, `application/soap+xml`), it sets `mimeType` but leaves `body.text` empty:

```typescript
// openapi-3.ts — SUPPORTED_MIME_TYPES = ['application/json', '*/*']
// Non-JSON bodies get mimeType only, no example text
```

A staged refactor **must** extend OpenAPI import (or a thin SOAP enrichment layer) to populate XML example bodies — this is the main engineering work beyond WSDL→OpenAPI conversion.

---

## Target architecture

```
WSDL file (prefer oriFilePath for import/include resolution)
  │
  ▼
┌─────────────────────────────────────────────────────────┐
│  Stage B: wsdl-to-openapi                               │
│  @techspokes/typescript-wsdl-client (or equivalent)     │
│  • WSDL 1.1 → OpenAPI 3.1                               │
│  • Resolve imports/includes from filesystem path        │
│  • Emit servers, paths, operations, parameters,         │
│    requestBody content types, examples where supported  │
└─────────────────────────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────────────────────────┐
│  Stage C: soap-enrichment (only where OAS falls short)  │
│  • Inject SOAP envelope XML examples if missing         │
│  • Add SOAPAction header parameter if not in OAS        │
│  • Apply document/literal vs RPC body shape             │
│  • WS-Security: only when WS-Policy/WSDL indicates it   │
└─────────────────────────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────────────────────────┐
│  Stage D: openapi-3 importer (extended)                 │
│  • Reuse existing ImportRequest mapping                 │
│  • Extended prepareBody() for XML/SOAP examples         │
│  • Header params (SOAPAction, Content-Type, Accept)     │
└─────────────────────────────────────────────────────────┘
  │
  ▼
ImportRequest[] → existing convert.ts pipeline
```

**Remove entirely:**

- `convertToPostman()` IBM adapter
- `postman.convert()` hop for WSDL
- `types/apiconnect-wsdl.d.ts`
- `patches/apiconnect-wsdl+2.0.36.patch`
- `apiconnect-wsdl` from dependencies, lockfile, esbuild externals

**Do not build:** a parallel bespoke WSDL→ImportRequest mapper unless the Stage B spike proves OpenAPI conversion is insufficient.

---

## Replacement engine

### Recommended: `@techspokes/typescript-wsdl-client`

| Criterion | Assessment |
|-----------|------------|
| License | MIT |
| Maintenance | Active (2025–2026) |
| Output | OpenAPI 3.1 (industry interchange format) |
| Scope | WSDL parse, typed client, OpenAPI, optional REST gateway |
| Fit | Aligns with SOAP-to-OpenAPI modernization pattern |

Evaluate programmatic API during Stage B — prefer library calls over shelling out to CLI.

### Alternatives (decision gate in Stage B)

| Option | When to use |
|--------|-------------|
| **`strong-soap` + custom OAS emitter** | If TechSpokes output quality is insufficient |
| **Fork `apiconnect-wsdl@2.0.36`** | Short-term bridge only; retains IBM IPLA |
| **Custom WSDL/XSD parser** | Last resort; highest cost |

### Explicitly not replacements

| Package | Why |
|---------|-----|
| `soap-converter` | Wraps `apiconnect-wsdl` internally |
| `wsdl-tsclient` / `tsoap-cli` | Generate runtime clients, not OpenAPI/collections |

---

## Staged refactor plan

Each stage is independently shippable. No stage removes user-facing WSDL import until Stage E passes regression tests.

---

### Stage A — Baseline & standards inventory (1–2 days)

**Goal:** Lock current behavior and document the WSDL→OpenAPI mapping spec before changing code.

**Tasks:**

- [x] Confirm WSDL fixture snapshots pass (`addition-input.wsdl`, `calculator-input.wsdl`)
- [x] Document per-operation expectations from snapshots:
  - Operation count and names
  - `SOAPAction` values
  - Endpoint URL (`soap:address@location`)
  - Headers (`Content-Type`, `Accept`, `SOAPAction`)
  - SOAP envelope example structure (namespaces, body element, WS-Security block)
- [x] Map each snapshot field to its **standard WSDL/SOAP source** (see table in Guiding Principles)
- [x] Add fixtures for industry edge cases not yet covered:
  - [x] Multi-file WSDL (`wsdl:import` + `xsd:include`)
  - [x] SOAP 1.2 binding (`soap12:binding`)
  - [x] Multiple ports on one service
  - [x] Deep/complex XSD (validates example generation without truncation)

**Exit criteria:** Snapshot baseline green; mapping spec written; edge-case fixtures added.

**Artifacts:** `fixtures/wsdl/mapping-spec.md`

---

### Stage B — WSDL → OpenAPI 3.1 spike (3–5 days)

**Goal:** Validate the industry-standard interchange step with real fixtures.

**Tasks:**

- [x] Integrate `@techspokes/typescript-wsdl-client` as dev/spike dependency
- [x] Convert existing fixtures to OpenAPI 3.1 programmatically
- [x] Inspect generated OAS for:
  - [x] `servers` / endpoint URLs
  - [x] Operation IDs and descriptions (from `wsdl:documentation` where available)
  - [x] `parameters` with `in: header` for SOAPAction
  - [x] `requestBody.content` for `text/xml` or `application/soap+xml`
  - [x] Embedded `example` or `examples` for XML payloads
- [x] Compare OAS output against Stage A mapping spec
- [x] Test multi-file WSDL with `oriFilePath`-equivalent directory context

**Decision gate:** TechSpokes REST OAS insufficient → custom SOAP enrichment (see spike report).

**Exit criteria:** Written spike report with sample OAS artifacts checked into `fixtures/wsdl/expected-openapi/` (or similar).

**Artifacts:** `fixtures/wsdl/stage-b-spike-report.md`, `fixtures/wsdl/expected-openapi/`, `wsdl/stage-b.test.ts`

---

### Stage C — SOAP enrichment layer (3–4 days)

**Goal:** Fill gaps between OpenAPI 3.1 and runnable SOAP requests — **only where the OAS document is incomplete**.

Create `packages/insomnia/src/main/importers/importers/wsdl/soap-enrichment.ts`:

**Responsibilities (industry-aligned):**

| Gap | Enrichment behavior |
|-----|---------------------|
| Missing XML request examples | Generate SOAP envelope from XSD types (document/literal preferred per WS-I) |
| Missing `SOAPAction` header | Read from binding; add as `parameters[].in: header` |
| Wrong/missing Content-Type | Set from binding: `text/xml` (SOAP 1.1) or `application/soap+xml` (SOAP 1.2) |
| WS-Security | **Do not inject by default.** Add only when WS-Policy or WSDL security policy is detected |
| Example size limits | Configurable depth/breadth guards with clear errors — not silent truncation (replace patch-package behavior) |
| RPC vs document style | Generate body shape matching `soap:body@use` (`literal` vs `encoded`) |

**Shared module candidate:** If XSD→XML logic is reusable, place in `packages/insomnia/src/main/importers/soap/` for potential use by OpenAPI XML import later.

**Exit criteria:** Enriched OAS documents for all fixtures match Stage A expectations; unit tests for `soap-enrichment.ts` and XSD example generator.

**Status:** Done — `soap-enrichment.test.ts`, encoded binding error, SOAP 1.2 envelope, RPC/literal shape.

---

### Stage D — Extend OpenAPI importer for XML/SOAP (3–5 days)

**Goal:** Reuse `openapi-3.ts` as the single path from API description → `ImportRequest[]`.

**Tasks:**

- [x] Extend `prepareBody()` in `openapi-3.ts` (or extract shared `prepareRequestBody()`) to handle:
  - `text/xml`, `application/xml`, `application/soap+xml` content types
  - `example` / `examples` string values from OAS (pass through as `body.text`)
  - Fallback: leave empty with mimeType if no example (current behavior)
- [x] Ensure header parameters from OAS (`SOAPAction`, `Content-Type`, `Accept`) flow through `prepareHeaders()`
- [x] Support absolute endpoint URLs from `servers[0].url` for SOAP (`x-insomnia-soap` document extension)
- [x] Add OpenAPI importer unit tests for XML/SOAP content types (not only WSDL snapshots)
- [x] Verify no regression on existing `openapi-3.test.ts` cases

**Design note:** Prefer extending the OpenAPI importer over wsdl-specific ImportRequest mapping. This follows the industry pattern of **one importer per interchange format**.

**Exit criteria:** `openapi-3` tests cover XML example import; wsdl fixtures pass when routed through WSDL→OAS→openapi-3 pipeline in isolation (integration test).

---

### Stage E — Rewire WSDL importer & remove legacy dep (2–3 days)

**Goal:** Replace `apiconnect-wsdl` in production code path.

**New `wsdl.ts` (thin orchestrator):**

```typescript
// Pseudocode — final implementation in Stage E
export const convert: FilePathConverter = async importEntry => {
  const wsdlPath = resolveWsdlInput(importEntry);       // prefer oriFilePath
  const openApiDoc = await wsdlToOpenApi(wsdlPath);     // Stage B
  const enriched = enrichSoapOperations(openApiDoc);    // Stage C
  return openapi3.convert(JSON.stringify(enriched));  // Stage D
};
```

**Tasks:**

- [x] Replace `apiconnect-wsdl` calls with Stage B+C+D pipeline
- [x] Preserve `acceptFilePath: true` and `oriFilePath` priority
- [x] Remove `convertToPostman()` and Postman hop
- [x] Update snapshots — document intentional improvements (e.g. no spurious WS-Security)
- [x] Remove `apiconnect-wsdl` from `package.json`
- [x] Remove `patches/apiconnect-wsdl+2.0.36.patch`
- [x] Remove `types/apiconnect-wsdl.d.ts`
- [x] Remove esbuild external for `apiconnect-wsdl`
- [x] Refresh lockfile; remove `DEVELOPMENT.md` engine workaround
- [x] Full validation: importer tests (226 pass); root lint/type-check pending CI

**Exit criteria:** All success criteria met (see below); manual QA checklist provided (sign-off pending).

---

### Stage F — Harden & document (2–3 days)

**Goal:** Production-quality coverage and user-facing clarity.

**Tasks:**

- [x] Expand fixtures from anonymized real-world WSDL samples (edge-case fixtures in Stage A)
- [x] Add WS-I Basic Profile smoke checks where feasible (valid SOAPAction, literal use, HTTP binding)
- [x] Document supported WSDL subset in import modal help text or docs
- [x] Manual QA checklist (Import modal, file picker, paste fallback, send request) — `MANUAL-QA-CHECKLIST.md`
- [ ] Optional: expose "Download OpenAPI" from WSDL import for interoperability with other tools

**Exit criteria:** Documented WSDL support matrix; expanded test coverage; manual QA signed off (checklist ready, sign-off pending).

---

## Short-term bridge (if Stages B–E are deferred)

If migration cannot ship immediately:

1. Fork `apiconnect-wsdl@2.0.36` (e.g. `@insomnia/wsdl-openapi-legacy`)
2. Apply existing patch-package changes in the fork
3. Fix engine constraints in fork `package.json`
4. Publish via git dependency or internal registry

This removes npm deprecation noise and lockfile hacks but **retains IBM IPLA**. Treat as a **bridge**, not the destination. Do not invest in new IBM Swagger adapter code.

---

## Testing strategy

### Regression (all stages)

| Test | Scope |
|------|-------|
| WSDL fixture snapshots | End-to-end import output |
| Duplicate ID invariant | Existing `index.test.ts` check |

### Per-stage tests

| Stage | New tests |
|-------|-----------|
| A | Edge-case fixture snapshots (multi-file, SOAP 1.2) |
| B | OAS output structure assertions per fixture |
| C | `soap-enrichment.test.ts`, XSD example unit tests |
| D | `openapi-3.test.ts` XML/SOAP body cases |
| E | Integration: `wsdl.ts` → full pipeline |
| F | Manual QA + optional WS-I profile checks |

### Manual QA

1. Import single-file WSDL via file picker
2. Import multi-file WSDL (main + imported XSD)
3. Send generated request against a known public SOAP endpoint
4. Import pasted WSDL text (degraded: no import resolution — document limitation)
5. Verify OpenAPI export (if Stage F optional feature added)

---

## Risks and mitigations

| Risk | Mitigation |
|------|------------|
| TechSpokes OAS output gaps | Stage B decision gate; soap-enrichment layer (Stage C) |
| OpenAPI can't model SOAP 1.1 action header | OAS `parameters[in:header]` — standard pattern |
| `openapi-3` URL templating breaks SOAP absolute URLs | Stage D: use `servers[0].url` directly for SOAP imports |
| Example XML regression | Snapshot tests + XSD unit tests |
| WS-Security behavior change | Document in Stage E PR; prefer policy-driven over IBM default stubs |
| Large XSD performance | Configurable limits with user-visible errors |
| WSDL 2.0 requests | Out of scope initially; document as unsupported |

---

## Success criteria

- [x] `apiconnect-wsdl` removed from dependencies and lockfile
- [x] No `patch-package` patch for WSDL
- [x] No IBM `x-ibm-*` adapters or types in codebase
- [x] WSDL import pipeline: **WSDL → OpenAPI 3.1 → openapi-3 importer**
- [x] WSDL fixture snapshots pass (or updated with documented, standards-aligned improvements)
- [x] `DEVELOPMENT.md` engine workaround removed
- [x] WS-Security injected only when policy indicates (not unconditionally)
- [ ] Import modal WSDL flow works end-to-end (manual QA sign-off pending)
- [x] MIT-compatible dependency chain (or fully owned OSS)

---

## Estimated effort

| Stage | Duration | Cumulative |
|-------|----------|------------|
| A — Baseline & inventory | 1–2 days | ~2 days |
| B — WSDL → OpenAPI spike | 3–5 days | ~7 days |
| C — SOAP enrichment | 3–4 days | ~11 days |
| D — Extend openapi-3 | 3–5 days | ~16 days |
| E — Rewire & remove legacy | 2–3 days | ~19 days |
| F — Harden & document | 2–3 days | ~22 days |
| **Total** | | **~3–4 weeks** |

Stages C and D can partially overlap once Stage B decision gate passes.

---

## Standards & references

### WSDL / SOAP

- [WSDL 1.1](https://www.w3.org/TR/wsdl)
- [SOAP 1.1](https://www.w3.org/TR/soap/)
- [SOAP 1.2](https://www.w3.org/TR/soap12/)
- [WS-I Basic Profile 1.1](https://www.ws-i.org/profiles/basicprofile-1.1.html) — interoperability constraints
- [OASIS WS-Security 1.1](https://docs.oasis-open.org/wss/v1.1/wss-v1.1-spec-os-SOAPMessageSecurity.pdf) — conditional security headers

### OpenAPI / tooling

- [OpenAPI 3.1 Specification](https://spec.openapis.org/oas/v3.1.0)
- [@techspokes/typescript-wsdl-client](https://www.npmjs.com/package/@techspokes/typescript-wsdl-client)
- Insomnia OpenAPI importer: `packages/insomnia/src/main/importers/importers/openapi-3.ts`

### Current legacy code

- WSDL importer: `packages/insomnia/src/main/importers/importers/wsdl.ts`
- IBM type shim: `packages/insomnia/types/apiconnect-wsdl.d.ts`
- Upstream patch: `patches/apiconnect-wsdl+2.0.36.patch`
