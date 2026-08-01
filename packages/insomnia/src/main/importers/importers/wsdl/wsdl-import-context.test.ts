import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { resolveWsdlImportContext } from './wsdl-import-context';

describe('wsdl-import-context', () => {
  it('uses remote WSDL URL from oriFileName when no file path is available', () => {
    const context = resolveWsdlImportContext({
      contentStr: '<wsdl:definitions xmlns:wsdl="http://schemas.xmlsoap.org/wsdl/"/>',
      oriFileName: 'https://example.com/service.wsdl',
    });

    expect(context.wsdlInput).toBe('https://example.com/service.wsdl');
  });

  it('writes companion XSD files into a temp directory for pasted multi-file imports', () => {
    const wsdlContent = fs.readFileSync(
      path.join(__dirname, '../fixtures/wsdl/multifile-input.wsdl'),
      'utf8',
    );
    const xsdContent = fs.readFileSync(path.join(__dirname, '../fixtures/wsdl/types.xsd'), 'utf8');

    const context = resolveWsdlImportContext({
      contentStr: wsdlContent,
      oriFileName: 'multifile-input.wsdl',
      relatedImportEntries: [{ contentStr: xsdContent, oriFileName: 'types.xsd' }],
    });

    try {
      expect(context.wsdlInput).toContain('insomnia-wsdl-');
      expect(fs.existsSync(path.join(path.dirname(context.wsdlInput), 'types.xsd'))).toBe(true);
    } finally {
      context.cleanup?.();
    }
  });
});
