import type { XsdElementMeta, XsdTypeDefinition } from '../../soap/xsd-to-xml';
import type { CompiledCatalogLike } from './soap-enrichment';

const PRIMITIVE_TS_TYPES = new Set(['string', 'number', 'boolean', 'Date']);

interface TechSpokesElement {
  name: string;
  tsType?: string;
  min?: number;
  max?: number | 'unbounded';
  nillable?: boolean;
  declaredType?: string;
}

interface TechSpokesType {
  name: string;
  ns: string;
  elems: TechSpokesElement[];
}

interface TechSpokesCatalog {
  serviceName?: string;
  wsdlTargetNS: string;
  types: TechSpokesType[];
  operations: CompiledCatalogLike['operations'];
}

const isXsdPrimitive = (declaredType?: string, tsType?: string) => {
  if (declaredType?.startsWith('xs:')) {
    return true;
  }
  return tsType ? PRIMITIVE_TS_TYPES.has(tsType) : false;
};

const mapElement = (element: TechSpokesElement): XsdElementMeta => {
  const complexTypeName =
    !isXsdPrimitive(element.declaredType, element.tsType) && element.tsType ? element.tsType : undefined;

  return {
    name: element.name,
    declaredType: complexTypeName ? undefined : element.declaredType || (element.tsType === 'number' ? 'xs:int' : 'xs:string'),
    typeName: complexTypeName,
    min: element.min,
    max: element.max === 'unbounded' ? 'unbounded' : element.max,
    nillable: element.nillable,
  };
};

export const adaptTechSpokesCatalog = (compiled: TechSpokesCatalog): CompiledCatalogLike => {
  return {
    serviceName: compiled.serviceName,
    wsdlTargetNS: compiled.wsdlTargetNS,
    types: compiled.types.map(type => ({
      name: type.name,
      ns: type.ns,
      elems: type.elems.map(mapElement),
    })),
    operations: compiled.operations,
  };
};

export const buildTypeLookup = (types: XsdTypeDefinition[]) => {
  return new Map(types.map(type => [type.name, type]));
};
