# WSDL import manual QA checklist (Stage F)

- [ ] Import `addition-input.wsdl` via file picker → 1 request, correct URL and SOAPAction
- [ ] Import `calculator-input.wsdl` → 4 operations
- [ ] Import `multifile-input.wsdl` (with `types.xsd` in same folder) → Lookup operation resolves XSD types
- [ ] Import `soap12-input.wsdl` → Content-Type `application/soap+xml`, SOAP 1.2 envelope namespace
- [ ] Import `multiport-input.wsdl` → uses SOAP 1.1 endpoint URL
- [ ] Paste single-file WSDL text (no file path) → import succeeds for inline types
- [ ] Paste multifile WSDL without XSD on disk → fails gracefully or documents limitation
- [ ] Send Add request to `http://www.dneonline.com/calculator.asmx` (optional live test)
- [ ] Confirm no WS-Security block on calculator fixtures (no policy in WSDL)
