# WSDL import support matrix

## Supported

- **WSDL 1.1** with SOAP **1.1** or **1.2** HTTP bindings
- **Document/literal** message encoding (primary, WS-I Basic Profile aligned)
- **RPC/literal** body shape (best-effort)
- Single-file and **multi-file** WSDL (via file import — `oriFilePath` resolves XSD/WSDL imports)
- WS-Security example headers **only when** WS-Policy or operation security is present in WSDL

## Limitations

- **SOAP encoded** bindings (`use="encoded"`) — not supported; import fails with a clear error
- **Pasted WSDL text** — no relative import resolution; use file picker for multi-file services
- **WSDL 2.0** — not supported
- Multiple ports — **SOAP 1.1 port preferred** when both 1.1 and 1.2 ports exist

## Import path

```
WSDL → TechSpokes catalog → SOAP OpenAPI 3.1 → openapi-3 importer → Insomnia requests
```
