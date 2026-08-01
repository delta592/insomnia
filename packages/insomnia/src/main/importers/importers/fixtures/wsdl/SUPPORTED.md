# WSDL import support matrix

## Supported

- **WSDL 1.1** with SOAP **1.1** or **1.2** HTTP bindings
- **Document/literal** and **RPC/literal** message encoding (WS-I Basic Profile aligned)
- **SOAP encoded** bindings (`use="encoded"`) with `xsi:type` example bodies
- **Nested XSD complex types** and **unbounded arrays** (single example item per array)
- Single-file and **multi-file** WSDL (file import, companion files in the same import batch, or remote WSDL URL)
- **Remote WSDL URLs** via file path, import URL tab, or `oriFileName` when fetching WSDL by URL
- **OpenAPI 3.1 export** — download the generated SOAP OpenAPI document from WSDL scan results
- WS-Security example headers **only when** WS-Policy or operation security is present in WSDL

## Limitations

- **WSDL 2.0** — not supported (TechSpokes compiler is WSDL 1.1 only)
- Pasted WSDL with relative XSD imports requires **companion files in the same import batch** (select WSDL + XSD together) or use file/URL import
- Multiple ports — **SOAP 1.1 port preferred** when both 1.1 and 1.2 ports exist

## Import path

```
WSDL → TechSpokes catalog → SOAP OpenAPI 3.1 → openapi-3 importer → Insomnia requests
                                                              ↘ Download OpenAPI (optional)
```
