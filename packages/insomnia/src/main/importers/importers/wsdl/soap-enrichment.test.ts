import fs from 'node:fs';
import path from 'node:path';

import type { OpenAPIV3 } from 'openapi-types';
import { describe, expect, it } from 'vitest';

import { generateRootElementXml, generateTypeXml } from '../../soap/xsd-to-xml';
import { buildSoapOpenApiDocument, generateSoapEnvelope } from './soap-enrichment';
import { getPrimarySoapPort, parseWsdlDocument } from './wsdl-parser';

const fixturesPath = path.join(__dirname, '../fixtures/wsdl');

describe('Stage C — soap-enrichment', () => {
  it('uses SOAP 1.2 envelope namespace when port is 1.2', () => {
    const envelope = generateSoapEnvelope({
      bodyXml: '  <tns:Ping xmlns:tns="http://example.com/soap12"/>',
      includeWsSecurity: false,
      soapVersion: '1.2',
    });

    expect(envelope).toContain('xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"');
    expect(envelope).not.toContain('schemas.xmlsoap.org/soap/envelope');
  });

  it('omits WS-Security unless policy is present', () => {
    const wsdl = fs.readFileSync(path.join(fixturesPath, 'addition-input.wsdl'), 'utf8');
    const parsed = parseWsdlDocument(wsdl);
    const port = getPrimarySoapPort(parsed)!;

    const document = buildSoapOpenApiDocument(
      {
        serviceName: 'Calculator',
        wsdlTargetNS: 'http://tempuri.org/',
        types: [
          {
            name: 'Add',
            ns: 'http://tempuri.org/',
            elems: [{ name: 'intA', declaredType: 'xs:int', min: 1, max: 1 }],
          },
        ],
        operations: [{ name: 'Add', soapAction: 'http://tempuri.org/Add', inputTypeName: 'Add' }],
      },
      parsed,
      port,
    );

    const requestBody = document.paths?.['/Add']?.post?.requestBody as OpenAPIV3.RequestBodyObject | undefined;
    const example = requestBody?.content?.['text/xml']?.example as string;
    expect(example).not.toContain('wsse:Security');
  });

  it('generates SOAP encoded examples with xsi:type attributes', () => {
    const wsdl = fs.readFileSync(path.join(fixturesPath, 'soap-encoded-input.wsdl'), 'utf8');
    const parsed = parseWsdlDocument(wsdl);
    const port = getPrimarySoapPort(parsed)!;

    const document = buildSoapOpenApiDocument(
      {
        serviceName: 'Calculator',
        wsdlTargetNS: 'http://tempuri.org/',
        types: [
          {
            name: 'Add',
            ns: 'http://tempuri.org/',
            elems: [
              { name: 'intA', declaredType: 'xs:int', min: 1, max: 1 },
              { name: 'intB', declaredType: 'xs:int', min: 1, max: 1 },
            ],
          },
        ],
        operations: [{ name: 'Add', soapAction: 'http://tempuri.org/Add', inputTypeName: 'Add' }],
      },
      parsed,
      port,
    );

    const requestBody = document.paths?.['/Add']?.post?.requestBody as OpenAPIV3.RequestBodyObject | undefined;
    const example = requestBody?.content?.['text/xml']?.example as string;
    expect(example).toContain('xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"');
    expect(example).toContain('xsi:type="xsd:int"');
  });
});

describe('Stage C — xsd-to-xml', () => {
  it('throws when element limits are exceeded', () => {
    expect(() =>
      generateTypeXml(
        { name: 'Large', ns: 'http://example.com/', elems: [{ name: 'field', declaredType: 'xs:string' }] },
        { maxElements: 0 },
      ),
    ).toThrow(/maximum element count/);
  });

  it('generates rpc-style root without mandatory comment on wrapper', () => {
    const xml = generateRootElementXml(
      'Add',
      'http://tempuri.org/',
      {
        name: 'Add',
        ns: 'http://tempuri.org/',
        elems: [{ name: 'intA', declaredType: 'xs:int', min: 1, max: 1 }],
      },
      { style: 'rpc' },
    );

    expect(xml).toContain('<tns:Add xmlns:tns="http://tempuri.org/">');
    expect(xml).not.toMatch(/<tns:Add[^>]*><!-- mandatory -->/);
  });
});
