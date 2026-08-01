import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { convertWsdlResources } from './index';

const fixturesPath = path.join(__dirname, '../fixtures/wsdl');

describe('Stage D — WSDL via openapi-3 importer', () => {
  it('routes addition fixture through full pipeline with absolute URL', async () => {
    const wsdlPath = path.join(fixturesPath, 'addition-input.wsdl');
    const content = fs.readFileSync(wsdlPath, 'utf8');
    const resources = await convertWsdlResources(wsdlPath, content);
    const request = resources.find(r => r._type === 'request' && r.name === 'Add');

    expect(request?.url).toBe('http://www.dneonline.com/calculator.asmx');
    expect(request?.body && typeof request.body === 'object' && 'text' in request.body ? request.body.text : '').toContain(
      'Envelope',
    );
    expect(request?.headers?.find(h => h.name === 'SOAPAction')?.value).toBe('http://tempuri.org/Add');
  });

  it('openapi-3 imports SOAP OpenAPI documents directly', async () => {
    const wsdlPath = path.join(fixturesPath, 'addition-input.wsdl');
    const content = fs.readFileSync(wsdlPath, 'utf8');
    const resources = await convertWsdlResources(wsdlPath, content);
    const request = resources.find(r => r._type === 'request');

    expect(
      request?.body && typeof request.body === 'object' && 'mimeType' in request.body ? request.body.mimeType : undefined,
    ).toBe('text/plain');
  });
});

describe('Stage E — legacy removal verification', () => {
  it('does not reference apiconnect-wsdl in wsdl entry', async () => {
    const source = fs.readFileSync(path.join(__dirname, '../wsdl.ts'), 'utf8');
    expect(source).not.toContain('apiconnect-wsdl');
    expect(source).not.toContain('postman.convert');
  });
});
