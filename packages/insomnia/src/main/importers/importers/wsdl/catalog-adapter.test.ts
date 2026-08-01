import { describe, expect, it } from 'vitest';

import { generateRootElementXml, generateTypeXml } from '../../soap/xsd-to-xml';
import { adaptTechSpokesCatalog, buildTypeLookup } from './catalog-adapter';

describe('catalog-adapter', () => {
  it('maps nested TechSpokes types to complex type references', () => {
    const catalog = adaptTechSpokesCatalog({
      wsdlTargetNS: 'http://example.com/deep',
      types: [
        {
          name: 'Level3',
          ns: 'http://example.com/deep',
          elems: [{ name: 'value', tsType: 'string', min: 1, max: 1, declaredType: 'xs:string' }],
        },
        {
          name: 'Level1',
          ns: 'http://example.com/deep',
          elems: [
            {
              name: 'level2',
              tsType: 'Level2',
              min: 1,
              max: 1,
              declaredType: '{http://example.com/deep}Level2',
            },
          ],
        },
        {
          name: 'Level2',
          ns: 'http://example.com/deep',
          elems: [
            {
              name: 'level3',
              tsType: 'Level3',
              min: 1,
              max: 1,
              declaredType: '{http://example.com/deep}Level3',
            },
          ],
        },
        {
          name: 'Process',
          ns: 'http://example.com/deep',
          elems: [
            {
              name: 'level1',
              tsType: 'Level1',
              min: 1,
              max: 1,
              declaredType: '{http://example.com/deep}Level1',
            },
            { name: 'count', tsType: 'number', min: 1, max: 1, declaredType: 'xs:int' },
          ],
        },
      ],
      operations: [],
    });

    const processType = catalog.types.find(type => type.name === 'Process')!;
    expect(processType.elems[0]?.typeName).toBe('Level1');
    expect(processType.elems[1]?.declaredType).toBe('xs:int');

    const typeLookup = buildTypeLookup(catalog.types);
    const xml = generateRootElementXml('Process', catalog.wsdlTargetNS, processType, { typeLookup });

    expect(xml).toContain('<tns:level1>');
    expect(xml).toContain('<tns:level2>');
    expect(xml).toContain('<tns:level3>');
    expect(xml).toContain('<tns:value>');
  });

  it('generates a single item for unbounded array elements', () => {
    const catalog = adaptTechSpokesCatalog({
      wsdlTargetNS: 'http://example.com/',
      types: [
        {
          name: 'Root',
          ns: 'http://example.com/',
          elems: [
            {
              name: 'item',
              tsType: 'string',
              min: 0,
              max: 'unbounded',
              declaredType: 'xs:string',
            },
          ],
        },
      ],
      operations: [],
    });

    const root = catalog.types[0];
    const xml = generateTypeXml(root, { typeLookup: buildTypeLookup(catalog.types), depth: 1 });
    expect(xml.match(/<tns:item>/g)?.length).toBe(1);
  });
});
