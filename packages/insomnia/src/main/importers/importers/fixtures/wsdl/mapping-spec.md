# WSDL import mapping spec (Stage A baseline)

This document locks expected import output fields and maps each to its **standard WSDL/SOAP source**. It is the regression baseline for Stages B–F.

## Fixtures covered

| Fixture | Operations | Endpoint | Binding |
|---------|------------|----------|---------|
| `addition-input.wsdl` | Add | `http://www.dneonline.com/calculator.asmx` | SOAP 1.1 document/literal |
| `calculator-input.wsdl` | Add, Subtract, Multiply, Divide | same | SOAP 1.1 document/literal |
| `soap12-input.wsdl` | Ping | `http://example.com/soap12` | SOAP 1.2 document/literal |
| `multiport-input.wsdl` | Echo | SOAP 1.1 port preferred when both exist | SOAP 1.1 + 1.2 ports |
| `multifile-input.wsdl` | Lookup | `http://example.com/multifile` | SOAP 1.1; types in `types.xsd` |
| `deep-xsd-input.wsdl` | Process | `http://example.com/deep` | Nested XSD (depth guard test) |

## Per-request expectations (all fixtures)

Each imported SOAP operation becomes one Insomnia `request` with:

| Import field | Standard WSDL/SOAP source | Notes |
|--------------|-------------------------|-------|
| `name` | `wsdl:operation@name` | Same as `operationId` |
| `method` | HTTP binding transport | Always `POST` for SOAP HTTP |
| `url` | `soap:address@location` / `soap12:address@location` | Absolute URL from selected port |
| `headers.SOAPAction` | `soap:operation@soapAction` / `soap12:operation@soapAction` | |
| `headers.Content-Type` | Binding version | `text/xml` (1.1) or `application/soap+xml` (1.2) |
| `headers.Accept` | Convention | `application/xml` |
| `body.text` | XSD input message (`wsdl:part` → `xs:element`) | SOAP envelope + document/literal body |
| `body.mimeType` | Insomnia raw body convention | `text/plain` (XML in `text` field) |
| `description` | `wsdl:documentation` | When present on operation |

## Intentional improvements vs legacy `apiconnect-wsdl`

| Legacy behavior | New behavior | Rationale |
|-----------------|--------------|-----------|
| WS-Security stub always in envelope | Only when WS-Policy / operation security present | WS-I / OASIS WS-Security alignment |
| IBM Swagger 2.0 intermediate | OpenAPI 3.1 intermediate | Industry interchange format |
| Postman collection hop | Direct `openapi-3` importer | Single importer per format |

## WS-Security

- **Source:** `wsp:Policy`, WS-Security WSDL extensions, or catalog `operation.security`
- **Default:** No security header block in example envelope
- **When enabled:** UsernameToken + Timestamp stub (same shape as legacy, with removal comment)

## Folder structure

Postman-compatible nesting preserved for snapshot stability:

1. Outer folder — service / collection name (`wsdl:service@name`)
2. Inner folder — same name (legacy Postman layout)
3. Requests — one per operation

## Edge-case fixture goals

| Fixture | Validates |
|---------|-----------|
| `soap12-input.wsdl` | SOAP 1.2 content type and envelope when no SOAP 1.1 port |
| `multiport-input.wsdl` | Primary port selection (SOAP 1.1 preferred) |
| `multifile-input.wsdl` + `types.xsd` | `oriFilePath` resolves XSD import |
| `deep-xsd-input.wsdl` | Example generation depth/element limits (no silent truncation) |
