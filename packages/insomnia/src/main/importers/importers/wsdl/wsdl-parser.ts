import { type Document, DOMParser, type Element as XmlElement } from '@xmldom/xmldom';

const WSDL_NS = 'http://schemas.xmlsoap.org/wsdl/';
const SOAP11_NS = 'http://schemas.xmlsoap.org/wsdl/soap/';
const SOAP12_NS = 'http://schemas.xmlsoap.org/wsdl/soap12/';
const WSP_NS = 'http://schemas.xmlsoap.org/ws/2004/09/policy';
const WSSE_NS = 'http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd';

export type SoapVersion = '1.1' | '1.2';

export interface WsdlBindingOperation {
  name: string;
  soapAction: string;
  style: 'document' | 'rpc' | string;
  bodyUse: 'literal' | 'encoded' | string;
  soapVersion: SoapVersion;
}

export interface WsdlPort {
  name: string;
  bindingName: string;
  endpointUrl: string;
  soapVersion: SoapVersion;
}

export interface WsdlService {
  name: string;
  ports: WsdlPort[];
}

export interface ParsedWsdl {
  targetNamespace: string;
  services: WsdlService[];
  bindings: Record<string, WsdlBindingOperation[]>;
  hasWsSecurityPolicy: boolean;
}

const getElementsByLocalName = (parent: Document | XmlElement, localName: string, namespace?: string) => {
  const result: XmlElement[] = [];
  const nodes = parent.getElementsByTagName('*');
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes.item(i);
    if (!node || node.localName !== localName) {
      continue;
    }
    if (namespace && node.namespaceURI !== namespace) {
      continue;
    }
    result.push(node as XmlElement);
  }
  return result;
};

const getAttribute = (element: XmlElement, localName: string, namespace?: string): string | null => {
  for (let i = 0; i < element.attributes.length; i++) {
    const attr = element.attributes.item(i);
    if (!attr || attr.localName !== localName) {
      continue;
    }
    if (!namespace || !attr.namespaceURI || attr.namespaceURI === namespace) {
      return attr.value;
    }
  }
  return null;
};

const resolveBindingName = (bindingRef: string) => {
  if (bindingRef.includes(':')) {
    return bindingRef.split(':').pop() || bindingRef;
  }
  return bindingRef;
};

const parseBindingOperations = (bindingElement: XmlElement, soapVersion: SoapVersion): WsdlBindingOperation[] => {
  const soapNs = soapVersion === '1.2' ? SOAP12_NS : SOAP11_NS;
  const operations = getElementsByLocalName(bindingElement, 'operation', WSDL_NS);
  return operations.map(operation => {
    const soapOperation = getElementsByLocalName(operation, 'operation', soapNs)[0];
    const soapBody = getElementsByLocalName(operation, 'body', soapNs)[0];
    return {
      name: operation.getAttribute('name') || '',
      soapAction: soapOperation ? getAttribute(soapOperation, 'soapAction', soapNs) || '' : '',
      style: soapOperation ? getAttribute(soapOperation, 'style', soapNs) || 'document' : 'document',
      bodyUse: soapBody ? getAttribute(soapBody, 'use', soapNs) || 'literal' : 'literal',
      soapVersion,
    };
  });
};

export const parseWsdlDocument = (fileContent: string): ParsedWsdl => {
  const document = new DOMParser().parseFromString(fileContent, 'text/xml');
  const definitions = document.documentElement;

  if (!definitions) {
    throw new Error('Invalid WSDL document');
  }

  const targetNamespace = definitions.getAttribute('targetNamespace') || '';

  const bindings: Record<string, WsdlBindingOperation[]> = {};
  for (const binding of getElementsByLocalName(definitions, 'binding', WSDL_NS)) {
    const bindingName = binding.getAttribute('name') || '';
    const soap11Binding = getElementsByLocalName(binding, 'binding', SOAP11_NS)[0];
    const soap12Binding = getElementsByLocalName(binding, 'binding', SOAP12_NS)[0];
    if (soap11Binding) {
      bindings[bindingName] = parseBindingOperations(binding, '1.1');
    } else if (soap12Binding) {
      bindings[bindingName] = parseBindingOperations(binding, '1.2');
    }
  }

  const services: WsdlService[] = [];
  for (const service of getElementsByLocalName(definitions, 'service', WSDL_NS)) {
    const serviceName = service.getAttribute('name') || '';
    const ports: WsdlPort[] = [];

    for (const port of getElementsByLocalName(service, 'port', WSDL_NS)) {
      const portName = port.getAttribute('name') || '';
      const bindingRef = port.getAttribute('binding') || '';
      const bindingName = resolveBindingName(bindingRef);

      const soap11Address = getElementsByLocalName(port, 'address', SOAP11_NS)[0];
      const soap12Address = getElementsByLocalName(port, 'address', SOAP12_NS)[0];

      if (soap11Address) {
        ports.push({
          name: portName,
          bindingName,
          endpointUrl: getAttribute(soap11Address, 'location', SOAP11_NS) || '',
          soapVersion: '1.1',
        });
      } else if (soap12Address) {
        ports.push({
          name: portName,
          bindingName,
          endpointUrl: getAttribute(soap12Address, 'location', SOAP12_NS) || '',
          soapVersion: '1.2',
        });
      }
    }

    services.push({ name: serviceName, ports });
  }

  const hasWsSecurityPolicy =
    getElementsByLocalName(definitions, 'Policy', WSP_NS).length > 0 ||
    getElementsByLocalName(definitions, 'Security', WSSE_NS).length > 0;

  return {
    targetNamespace,
    services,
    bindings,
    hasWsSecurityPolicy,
  };
};

export const getPrimarySoapPort = (parsed: ParsedWsdl): WsdlPort | undefined => {
  for (const service of parsed.services) {
    const soap11Port = service.ports.find(port => port.soapVersion === '1.1');
    if (soap11Port) {
      return soap11Port;
    }
  }

  for (const service of parsed.services) {
    if (service.ports.length > 0) {
      return service.ports[0];
    }
  }

  return undefined;
};
