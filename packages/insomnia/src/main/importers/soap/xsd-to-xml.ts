export interface XsdElementMeta {
  name: string;
  declaredType?: string;
  /** Reference to a named complex type in the same catalog */
  typeName?: string;
  min?: number;
  max?: number | 'unbounded';
  nillable?: boolean;
}

export interface XsdTypeDefinition {
  name: string;
  ns: string;
  elems: XsdElementMeta[];
}

export interface GenerateXmlOptions {
  indent?: string;
  depth?: number;
  maxDepth?: number;
  maxElements?: number;
  style?: 'document' | 'rpc' | string;
  bodyUse?: 'literal' | 'encoded' | string;
  typeLookup?: Map<string, XsdTypeDefinition>;
}

const SOAPENC_NS = 'http://schemas.xmlsoap.org/soap/encoding/';

const soapEncodingType = (declaredType?: string, typeName?: string) => {
  if (typeName) {
    return `tns:${typeName}`;
  }
  if (declaredType?.startsWith('xs:')) {
    return declaredType.replace(/^xs:/, 'xsd:');
  }
  return 'xsd:string';
};

const xsiTypeAttribute = (element: XsdElementMeta, bodyUse?: string) => {
  if (bodyUse !== 'encoded') {
    return '';
  }
  return ` xsi:type="${soapEncodingType(element.declaredType, element.typeName)}"`;
};

const arrayWrapperAttributes = (element: XsdElementMeta, bodyUse?: string) => {
  if (bodyUse !== 'encoded' || !isArrayElement(element)) {
    return { openTagSuffix: '', closeTag: '' };
  }
  const itemType = soapEncodingType(element.declaredType, element.typeName);
  return {
    openTagSuffix: ` xsi:type="soapenc:Array" xmlns:soapenc="${SOAPENC_NS}" soapenc:arrayType="${itemType}[]"`,
    closeTag: '',
  };
};

const DEFAULT_MAX_DEPTH = 50;
const DEFAULT_MAX_ELEMENTS = 500;

const exampleValueForType = (declaredType?: string): string => {
  switch (declaredType) {
    case 'xs:int':
    case 'xs:integer':
    case 'xs:long':
    case 'xs:short':
    case 'xs:byte':
    case 'xs:unsignedInt':
    case 'xs:unsignedShort':
    case 'xs:unsignedByte':
    case 'xs:unsignedLong':
    case 'xs:positiveInteger':
    case 'xs:negativeInteger':
    case 'xs:nonPositiveInteger':
    case 'xs:nonNegativeInteger': {
      return '3';
    }
    case 'xs:decimal':
    case 'xs:float':
    case 'xs:double': {
      return '3.0';
    }
    case 'xs:boolean': {
      return 'true';
    }
    case 'xs:date':
    case 'xs:dateTime':
    case 'xs:time': {
      return '2000-01-01T00:00:00Z';
    }
    case 'xs:base64Binary':
    case 'xs:hexBinary': {
      return 'ZXhhbXBsZQ==';
    }
    default: {
      return 'string';
    }
  }
};

const isMandatory = (element: XsdElementMeta) => {
  return (element.min ?? 0) >= 1 && !element.nillable;
};

const isArrayElement = (element: XsdElementMeta) => {
  return element.max === 'unbounded' || (typeof element.max === 'number' && element.max > 1);
};

export const generateTypeXml = (
  type: XsdTypeDefinition,
  options: GenerateXmlOptions = {},
  context: { elementCount: number } = { elementCount: 0 },
): string => {
  const indent = options.indent ?? ' ';
  const depth = options.depth ?? 1;
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  const maxElements = options.maxElements ?? DEFAULT_MAX_ELEMENTS;
  const typeLookup = options.typeLookup ?? new Map([[type.name, type]]);

  if (depth > maxDepth) {
    throw new Error(`XSD example generation exceeded maximum depth of ${maxDepth}`);
  }

  const prefix = indent.repeat(depth);
  const lines: string[] = [];

  for (const element of type.elems) {
    if (context.elementCount >= maxElements) {
      throw new Error(`XSD example generation exceeded maximum element count of ${maxElements}`);
    }
    context.elementCount++;

    const mandatoryComment = isMandatory(element) ? '<!-- mandatory -->' : '';
    const arrayOccurrences = isArrayElement(element) ? 1 : 1;

    for (let i = 0; i < arrayOccurrences; i++) {
      const xsiType = xsiTypeAttribute(element, options.bodyUse);
      const arrayAttrs = arrayWrapperAttributes(element, options.bodyUse);

      if (element.typeName && typeLookup.has(element.typeName)) {
        const nestedType = typeLookup.get(element.typeName)!;
        const inner = generateTypeXml(nestedType, { ...options, depth: depth + 1, typeLookup }, context);
        lines.push(
          `${prefix}<tns:${element.name}${xsiType}${arrayAttrs.openTagSuffix}>${mandatoryComment}\n${inner}\n${prefix}</tns:${element.name}>`,
        );
      } else {
        const value = exampleValueForType(element.declaredType);
        lines.push(`${prefix}<tns:${element.name}${xsiType}${arrayAttrs.openTagSuffix}>${mandatoryComment}${value}</tns:${element.name}>`);
      }
    }
  }

  return lines.join('\n');
};

export const generateRootElementXml = (
  elementLocalName: string,
  targetNamespace: string,
  type: XsdTypeDefinition,
  options: GenerateXmlOptions = {},
): string => {
  const indent = options.indent ?? ' ';
  const typeLookup = options.typeLookup ?? new Map([[type.name, type]]);
  const inner = generateTypeXml(type, { ...options, depth: 2, typeLookup });
  const style = options.style ?? 'document';

  if (style === 'rpc') {
    const rootTypeAttr = options.bodyUse === 'encoded' ? ` xsi:type="tns:${type.name}"` : '';
    return `${indent}<tns:${elementLocalName} xmlns:tns="${targetNamespace}"${rootTypeAttr}>\n${inner}\n${indent}</tns:${elementLocalName}>`;
  }

  const rootTypeAttr = options.bodyUse === 'encoded' ? ` xsi:type="tns:${type.name}"` : '';
  return `${indent}<tns:${elementLocalName} xmlns:tns="${targetNamespace}"${rootTypeAttr}><!-- mandatory -->\n${inner}\n${indent}</tns:${elementLocalName}>`;
};
