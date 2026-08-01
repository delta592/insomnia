import fs from 'node:fs';
import path from 'node:path';

import { generateOpenAPI } from '@techspokes/typescript-wsdl-client';
import type { OpenAPIV3 } from 'openapi-types';
import { describe, expect, it } from 'vitest';

import { wsdlToOpenApi } from './wsdl-to-openapi';

const fixturesPath = path.join(__dirname, '../fixtures/wsdl');
const expectedOpenApiPath = path.join(fixturesPath, 'expected-openapi');

const fixtureNames = [
  'addition-input.wsdl',
  'soap12-input.wsdl',
  'multiport-input.wsdl',
  'multifile-input.wsdl',
  'deep-xsd-input.wsdl',
];

describe('Stage B — WSDL to OpenAPI spike', () => {
  it('documents TechSpokes REST OpenAPI gaps vs SOAP needs', async () => {
    const wsdlPath = path.join(fixturesPath, 'addition-input.wsdl');
    const { doc } = await generateOpenAPI({ wsdl: wsdlPath, validate: false, skipValidate: true });

    expect(doc.paths?.['/add']?.post?.requestBody?.content?.['application/json']).toBeDefined();
    expect(doc.paths?.['/add']?.post?.requestBody?.content?.['text/xml']).toBeUndefined();
    expect(doc.servers?.[0]?.url).toBe('/');
  });

  it.each(fixtureNames)('produces SOAP OpenAPI for %s', async fixtureName => {
    const wsdlPath = path.join(fixturesPath, fixtureName);
    const content = fs.readFileSync(wsdlPath, 'utf8');
    const document = await wsdlToOpenApi(wsdlPath, content);
    const soapDocument = document as OpenAPIV3.Document & Record<string, unknown>;

    expect(soapDocument.openapi).toMatch(/^3\.1\./);
    expect(soapDocument['x-insomnia-soap']).toBe(true);
    expect(document.servers?.[0]?.url).toBeTruthy();

    const operations = Object.values(document.paths ?? {}).flatMap(pathItem => Object.values(pathItem ?? {}));
    expect(operations.length).toBeGreaterThan(0);

    for (const operation of operations) {
      if (!operation || typeof operation !== 'object' || !('requestBody' in operation)) {
        continue;
      }
      const requestBody = operation.requestBody as OpenAPIV3.RequestBodyObject | undefined;
      const contentTypes = Object.keys(requestBody?.content ?? {});
      expect(contentTypes.some(type => type.includes('xml'))).toBe(true);
      const xmlExample = contentTypes
        .map(type => requestBody?.content?.[type]?.example)
        .find(example => typeof example === 'string');
      expect(xmlExample).toContain('Envelope');
      expect(operation.parameters?.some(param => 'name' in param && param.name === 'SOAPAction')).toBe(true);
    }
  });

  it('matches multiport fixture to SOAP 1.1 endpoint per mapping spec', async () => {
    const wsdlPath = path.join(fixturesPath, 'multiport-input.wsdl');
    const content = fs.readFileSync(wsdlPath, 'utf8');
    const document = await wsdlToOpenApi(wsdlPath, content);

    expect(document.servers?.[0]?.url).toBe('http://example.com/multiport/soap11');
  });

  it('resolves multifile XSD import with oriFilePath', async () => {
    const wsdlPath = path.join(fixturesPath, 'multifile-input.wsdl');
    const content = fs.readFileSync(wsdlPath, 'utf8');
    const document = await wsdlToOpenApi(wsdlPath, content);

    expect(Object.keys(document.paths ?? {})).toContain('/Lookup');
  });
});

describe('Stage B — expected OpenAPI artifacts', () => {
  it('has checked-in TechSpokes REST reference artifact', () => {
    const artifact = path.join(expectedOpenApiPath, 'techspokes-rest-addition.json');
    expect(fs.existsSync(artifact)).toBe(true);
    const doc = JSON.parse(fs.readFileSync(artifact, 'utf8'));
    expect(doc.paths).toBeDefined();
  });
});
