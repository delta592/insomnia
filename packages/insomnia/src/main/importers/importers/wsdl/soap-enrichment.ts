import type { OpenAPIV3 } from 'openapi-types';

import { generateRootElementXml, type XsdTypeDefinition } from '../../soap/xsd-to-xml';
import type { ParsedWsdl, SoapVersion, WsdlPort } from './wsdl-parser';

export const INSOMNIA_SOAP_EXTENSION = 'x-insomnia-soap';
export const INSOMNIA_ABSOLUTE_URL_EXTENSION = 'x-insomnia-url';

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

const SOAP11_ENVELOPE_NS = 'http://schemas.xmlsoap.org/soap/envelope/';
const WSSE_NS = 'http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd';
const WSU_NS = 'http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd';

const contentTypeForSoapVersion = (soapVersion: SoapVersion) => {
  return soapVersion === '1.2' ? 'application/soap+xml' : 'text/xml';
};

const acceptForSoapVersion = (_soapVersion: SoapVersion) => {
  return 'application/xml';
};

const shouldIncludeWsSecurity = (parsedWsdl: ParsedWsdl, operationSecurity?: string[]) => {
  return parsedWsdl.hasWsSecurityPolicy || (operationSecurity?.length ?? 0) > 0;
};

const generateWsSecurityHeader = () => {
  return ` <wsse:Security xmlns:wsse="${WSSE_NS}" xmlns:wsu="${WSU_NS}">
   <wsse:UsernameToken>
    <wsse:Username>string</wsse:Username>
    <wsse:Password>string</wsse:Password>
    <wsse:Nonce EncodingType="string">string</wsse:Nonce>
    <wsu:Created>string</wsu:Created>
   </wsse:UsernameToken>
   <wsu:Timestamp wsu:Id="string">
    <wsu:Created>string</wsu:Created>
    <wsu:Expires>string</wsu:Expires>
   </wsu:Timestamp>
  </wsse:Security>`;
};

export const generateSoapEnvelope = ({
  bodyXml,
  includeWsSecurity,
}: {
  bodyXml: string;
  includeWsSecurity: boolean;
}) => {
  const headerBlock = includeWsSecurity
    ? `<soapenv:Header>\n  <!-- The Security element should be removed if WS-Security is not enabled on the SOAP target-url -->\n${generateWsSecurityHeader()}\n </soapenv:Header>`
    : '';

  return `<soapenv:Envelope xmlns:soapenv="${SOAP11_ENVELOPE_NS}">
${headerBlock ? ` ${headerBlock}\n` : ''} <soapenv:Body>
${bodyXml}
 </soapenv:Body>
</soapenv:Envelope>`;
};

const findType = (catalog: CompiledCatalogLike, typeName?: string) => {
  if (!typeName) {
    return null;
  }
  return catalog.types.find(type => type.name === typeName) ?? null;
};

export const buildSoapOpenApiDocument = (
  catalog: CompiledCatalogLike,
  parsedWsdl: ParsedWsdl,
  port: WsdlPort,
): OpenAPIV3.Document & Record<string, unknown> => {
  const serviceName = catalog.serviceName || parsedWsdl.services[0]?.name || 'SOAP Service';
  const requestContentType = contentTypeForSoapVersion(port.soapVersion);
  const acceptContentType = acceptForSoapVersion(port.soapVersion);
  const paths: OpenAPIV3.PathsObject = {};

  for (const operation of catalog.operations) {
    const inputType = findType(catalog, operation.inputTypeName);
    const elementLocalName = operation.inputElement?.local || operation.name;
    const bodyXml = inputType
      ? generateRootElementXml(elementLocalName, catalog.wsdlTargetNS, inputType)
      : `  <tns:${elementLocalName} xmlns:tns="${catalog.wsdlTargetNS}"/>`;

    const includeWsSecurity = shouldIncludeWsSecurity(parsedWsdl, operation.security);
    const envelope = generateSoapEnvelope({ bodyXml, includeWsSecurity });

    paths[`/${operation.name}`] = {
      post: {
        operationId: operation.name,
        summary: operation.name,
        description: operation.doc || '',
        tags: [serviceName],
        parameters: [
          {
            name: 'SOAPAction',
            in: 'header',
            required: true,
            schema: { type: 'string', example: operation.soapAction },
          },
          {
            name: 'Content-Type',
            in: 'header',
            required: true,
            schema: { type: 'string', example: requestContentType },
          },
          {
            name: 'Accept',
            in: 'header',
            required: true,
            schema: { type: 'string', example: acceptContentType },
          },
        ],
        requestBody: {
          required: true,
          content: {
            [requestContentType]: {
              example: envelope,
            },
          },
        },
        responses: {
          '200': {
            description: 'SOAP response',
          },
        },
      } as OpenAPIV3.OperationObject & Record<string, unknown>,
    };
  }

  return {
    openapi: '3.1.0',
    info: {
      title: serviceName,
      version: '0.0.0',
    },
    [INSOMNIA_SOAP_EXTENSION]: true,
    servers: [{ url: port.endpointUrl }],
    tags: [{ name: serviceName }],
    paths,
  };
};

export const enrichSoapOperations = (
  _document: OpenAPIV3.Document & Record<string, unknown>,
  catalog: CompiledCatalogLike,
  parsedWsdl: ParsedWsdl,
  port: WsdlPort,
) => {
  return buildSoapOpenApiDocument(catalog, parsedWsdl, port);
};
