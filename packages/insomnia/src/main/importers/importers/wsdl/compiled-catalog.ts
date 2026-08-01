import type { XsdTypeDefinition } from '../../soap/xsd-to-xml';

export interface CompiledCatalogLike {
  serviceName?: string;
  wsdlTargetNS: string;
  types: XsdTypeDefinition[];
  operations: {
    name: string;
    soapAction: string;
    inputElement?: { ns: string; local: string };
    inputTypeName?: string;
    doc?: string;
    security?: string[];
  }[];
}
