export interface XsdElementMeta {
  name: string;
  declaredType?: string;
  min?: number;
  max?: number;
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
}

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

export const generateTypeXml = (
  type: XsdTypeDefinition,
  options: GenerateXmlOptions = {},
  context: { elementCount: number } = { elementCount: 0 },
): string => {
  const indent = options.indent ?? ' ';
  const depth = options.depth ?? 1;
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  const maxElements = options.maxElements ?? DEFAULT_MAX_ELEMENTS;

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
    const value = exampleValueForType(element.declaredType);
    lines.push(`${prefix}<tns:${element.name}>${mandatoryComment}${value}</tns:${element.name}>`);
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
  const inner = generateTypeXml(type, { ...options, depth: 2 });
  const style = options.style ?? 'document';

  if (style === 'rpc') {
    return `${indent}<tns:${elementLocalName} xmlns:tns="${targetNamespace}">\n${inner}\n${indent}</tns:${elementLocalName}>`;
  }

  return `${indent}<tns:${elementLocalName} xmlns:tns="${targetNamespace}"><!-- mandatory -->\n${inner}\n${indent}</tns:${elementLocalName}>`;
};
