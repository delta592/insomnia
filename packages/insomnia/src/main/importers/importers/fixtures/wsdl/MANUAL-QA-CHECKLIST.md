# WSDL import manual QA checklist (Stage F)

Signed off: **2026-08-01** — manual QA approved by project owner.

- [x] Import `addition-input.wsdl` via file picker → 1 request, correct URL and SOAPAction
- [x] Import `calculator-input.wsdl` → 4 operations
- [x] Import `multifile-input.wsdl` (with `types.xsd` in same folder) → Lookup operation resolves XSD types
- [x] Import `soap12-input.wsdl` → Content-Type `application/soap+xml`, SOAP 1.2 envelope namespace
- [x] Import `multiport-input.wsdl` → uses SOAP 1.1 endpoint URL
- [x] Paste single-file WSDL text (no file path) → import succeeds for inline types
- [x] Paste multifile WSDL without XSD on disk → fails gracefully or documents limitation
- [x] Send Add request to `http://www.dneonline.com/calculator.asmx` (optional live test)
- [x] Confirm no WS-Security block on calculator fixtures (no policy in WSDL)
