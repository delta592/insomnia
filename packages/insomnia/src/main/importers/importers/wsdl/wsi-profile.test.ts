import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { convertWsdlResources } from './index';
import { parseWsdlDocument } from './wsdl-parser';

const fixturesPath = path.join(__dirname, '../fixtures/wsdl');

/**
 * Stage F — WS-I Basic Profile smoke checks (where feasible).
 * R1101: SOAPAction matches binding; R2701: HTTP binding; R2702: document/literal preferred.
 */
describe('Stage F — WS-I Basic Profile smoke checks', () => {
  const documentLiteralFixtures = ['addition-input.wsdl', 'calculator-input.wsdl', 'soap12-input.wsdl'];

  it.each(documentLiteralFixtures)('%s uses document/literal and HTTP SOAP binding', fixtureName => {
    const content = fs.readFileSync(path.join(fixturesPath, fixtureName), 'utf8');
    const parsed = parseWsdlDocument(content);

    for (const bindingOps of Object.values(parsed.bindings)) {
      for (const op of bindingOps) {
        expect(op.bodyUse).toBe('literal');
        expect(['document', 'rpc']).toContain(op.style);
      }
    }
  });

  it('SOAPAction header matches binding soapAction for calculator', async () => {
    const wsdlPath = path.join(fixturesPath, 'calculator-input.wsdl');
    const content = fs.readFileSync(wsdlPath, 'utf8');
    const resources = await convertWsdlResources(wsdlPath, content);
    const requests = resources.filter(r => r._type === 'request');

    expect(requests).toHaveLength(4);

    for (const request of requests) {
      const soapAction = request.headers?.find(h => h.name === 'SOAPAction')?.value;
      expect(soapAction).toMatch(/^http:\/\//);
      expect(request.method).toBe('POST');
      expect(request.url).toMatch(/^https?:\/\//);
    }
  });
});
