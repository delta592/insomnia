import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { convertWsdlResources } from './index';
import { wsdlToOpenApi } from './wsdl-to-openapi';

const fixturesPath = path.join(__dirname, '../fixtures/wsdl');

describe('real-world WSDL import', () => {
  it('imports tempconvert WSDL with Fahrenheit and Celsius operations', async () => {
    const wsdlPath = path.join(fixturesPath, 'tempconvert-input.wsdl');
    const content = fs.readFileSync(wsdlPath, 'utf8');
    const resources = await convertWsdlResources(wsdlPath, content);
    const requests = resources.filter(r => r._type === 'request');

    expect(requests).toHaveLength(2);
    expect(requests.map(r => r.name).sort()).toEqual(['CelsiusToFahrenheit', 'FahrenheitToCelsius']);
    expect(requests[0]?.url).toContain('w3schools.com');
    expect(requests[0]?.body && typeof requests[0].body === 'object' && 'text' in requests[0].body ? requests[0].body.text : '').toContain(
      'Envelope',
    );
  });

  it('generates nested XSD XML for deep-xsd fixture', async () => {
    const wsdlPath = path.join(fixturesPath, 'deep-xsd-input.wsdl');
    const content = fs.readFileSync(wsdlPath, 'utf8');
    const document = await wsdlToOpenApi(wsdlPath, content);
    const example = document.paths?.['/Process']?.post?.requestBody as { content?: Record<string, { example?: string }> };
    const xml = example?.content?.['text/xml']?.example ?? '';

    expect(xml).toContain('<tns:level1>');
    expect(xml).toContain('<tns:level2>');
    expect(xml).toContain('<tns:level3>');
    expect(xml).toContain('<tns:value>');
  });

  it.skipIf(!process.env.WSDL_NETWORK_TESTS)(
    'imports live CountryInfo service (21 operations)',
    async () => {
      const wsdlUrl = 'http://webservices.oorsprong.org/websamples.countryinfo/CountryInfoService.wso?WSDL';
      const content = await fetch(wsdlUrl).then(r => r.text());
      const resources = await convertWsdlResources(wsdlUrl, content);
      const requests = resources.filter(r => r._type === 'request');

      expect(requests.length).toBeGreaterThanOrEqual(21);
    },
    30_000,
  );
});
