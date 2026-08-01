# Stage B spike report: WSDL → OpenAPI 3.1

## Decision gate outcome

**Proceed to Stage C with custom SOAP OpenAPI enrichment.**

TechSpokes `generateOpenAPI()` produces a **REST gateway** specification (JSON request/response bodies, kebab-case paths, response envelopes). It does **not** emit runnable SOAP/XML request examples or `soap:address` endpoint semantics.

Insomnia therefore uses:

| Step | Tool | Output |
|------|------|--------|
| WSDL compile | `@techspokes/typescript-wsdl-client` `runGenerationPipeline` | `CompiledCatalog` (types, operations, soapAction) |
| SOAP OpenAPI | Insomnia `soap-enrichment.ts` | OpenAPI 3.1 with `text/xml` / `application/soap+xml` examples |
| Import | Insomnia `openapi-3.ts` | `ImportRequest[]` |

## TechSpokes REST OpenAPI (reference)

Artifact: `expected-openapi/techspokes-rest-addition.json`

| Check | TechSpokes REST OAS | Insomnia need |
|-------|---------------------|---------------|
| `servers` / endpoint URL | `"/"` placeholder | **Missing** — needs `soap:address@location` |
| Operation IDs | Yes (`Add`) | OK |
| `wsdl:documentation` | In `description` | OK |
| SOAPAction header | **Missing** | Required |
| `text/xml` request body | **Missing** (JSON only) | Required |
| XML payload examples | **Missing** | Required |

## Insomnia SOAP OpenAPI (target)

Validated programmatically in `stage-b.test.ts` via `wsdlToOpenApi()` for each fixture.

## Multi-file WSDL

`multifile-input.wsdl` + `types.xsd` resolves when `oriFilePath` points at the WSDL file (file import). Paste-only import cannot resolve relative XSD paths — documented in `SUPPORTED.md`.

## Alternatives considered

| Option | Verdict |
|--------|---------|
| TechSpokes `generateOpenAPI` alone | Insufficient for SOAP import |
| `strong-soap` + custom emitter | Not needed; TechSpokes catalog + enrichment sufficient for fixtures |
| Fork `apiconnect-wsdl` | Rejected — IBM IPLA, non-standard output |
