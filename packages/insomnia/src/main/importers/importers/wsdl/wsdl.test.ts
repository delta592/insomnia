import fs from 'node:fs';
import path from 'node:path';

import type { OpenAPIV3 } from 'openapi-types';
import { describe, expect, it } from 'vitest';

import { generateRootElementXml, generateTypeXml } from '../../soap/xsd-to-xml';
import { buildSoapOpenApiDocument, generateSoapEnvelope } from './soap-enrichment';
import { getPrimarySoapPort, parseWsdlDocument } from './wsdl-parser';
import { wsdlToOpenApi } from './wsdl-to-openapi';

const fixturesPath = path.join(__dirname, '../fixtures/wsdl');

describe('wsdl-parser', () => {
  it('parses SOAP endpoint and binding metadata', () => {
    const wsdl = fs.readFileSync(path.join(fixturesPath, 'addition-input.wsdl'), 'utf8');
    const parsed = parseWsdlDocument(wsdl);
    const port = getPrimarySoapPort(parsed);

    expect(parsed.targetNamespace).toBe('http://tempuri.org/');
    expect(port?.endpointUrl).toBe('http://www.dneonline.com/calculator.asmx');
    expect(port?.soapVersion).toBe('1.1');
    expect(parsed.bindings.CalculatorSoap?.[0]?.soapAction).toBe('http://tempuri.org/Add');
    expect(parsed.hasWsSecurityPolicy).toBe(false);
  });
});

describe('xsd-to-xml', () => {
  it('generates document/literal XML with mandatory comments', () => {
    const xml = generateRootElementXml('Add', 'http://tempuri.org/', {
      name: 'Add',
      ns: 'http://tempuri.org/',
      elems: [
        { name: 'intA', declaredType: 'xs:int', min: 1, max: 1 },
        { name: 'intB', declaredType: 'xs:int', min: 1, max: 1 },
      ],
    });

    expect(xml).toContain('<tns:Add xmlns:tns="http://tempuri.org/"><!-- mandatory -->');
    expect(xml).toContain('<tns:intA><!-- mandatory -->3</tns:intA>');
    expect(xml).toContain('<tns:intB><!-- mandatory -->3</tns:intB>');
  });

  it('throws when element limits are exceeded', () => {
    expect(() =>
      generateTypeXml(
        {
          name: 'Large',
          ns: 'http://example.com/',
          elems: [{ name: 'field', declaredType: 'xs:string' }],
        },
        { maxElements: 0 },
      ),
    ).toThrow(/maximum element count/);
  });
});

describe('soap-enrichment', () => {
  it('builds SOAP OpenAPI with headers and XML example', () => {
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
            elems: [
              { name: 'intA', declaredType: 'xs:int', min: 1, max: 1 },
              { name: 'intB', declaredType: 'xs:int', min: 1, max: 1 },
            ],
          },
        ],
        operations: [
          {
            name: 'Add',
            soapAction: 'http://tempuri.org/Add',
            inputElement: { ns: 'http://tempuri.org/', local: 'Add' },
            inputTypeName: 'Add',
          },
        ],
      },
      parsed,
      port,
    );

    const operation = document.paths?.['/Add']?.post as OpenAPIV3.OperationObject | undefined;
    const soapActionParameter = operation?.parameters?.find(
      parameter => 'name' in parameter && parameter.name === 'SOAPAction',
    ) as OpenAPIV3.ParameterObject | undefined;
    const requestBody = operation?.requestBody as OpenAPIV3.RequestBodyObject | undefined;

    expect(document.servers?.[0]?.url).toBe('http://www.dneonline.com/calculator.asmx');
    expect(soapActionParameter).toBeDefined();
    expect(requestBody?.content?.['text/xml']?.example).toContain('<soapenv:Envelope');
    expect(requestBody?.content?.['text/xml']?.example).not.toContain('wsse:Security');
  });

  it('includes WS-Security only when policy is present', () => {
    const envelope = generateSoapEnvelope({
      bodyXml: '  <tns:Add xmlns:tns="http://tempuri.org/"/>',
      includeWsSecurity: true,
    });

    expect(envelope).toContain('wsse:Security');
  });
});

describe('wsdl-to-openapi', () => {
  it('converts calculator fixture to OpenAPI 3.1', async () => {
    const wsdlPath = path.join(fixturesPath, 'calculator-input.wsdl');
    const wsdl = fs.readFileSync(wsdlPath, 'utf8');
    const document = await wsdlToOpenApi(wsdlPath, wsdl);

    expect(document.openapi).toBe('3.1.0');
    expect(Object.keys(document.paths || {})).toHaveLength(4);
    expect(document.paths?.['/Add']?.post?.parameters?.find(
      parameter => 'name' in parameter && parameter.name === 'SOAPAction',
    )).toEqual(
      expect.objectContaining({
        schema: expect.objectContaining({ example: 'http://tempuri.org/Add' }),
      }),
    );
  });
});
