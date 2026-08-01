import type { ImportRequest } from '../../entities';
import * as openapi3 from '../openapi-3';
import { wsdlToOpenApi } from './wsdl-to-openapi';

let requestGroupCount = 1;
let requestCount = 1;

const restructureWsdlImport = (
  resources: ImportRequest[],
  collectionName: string,
  endpointUrl: string,
): ImportRequest[] => {
  const requests = resources.filter(resource => resource._type === 'request');
  const folder = resources.find(resource => resource._type === 'request_group');

  const outerFolderId = `__GRP_${requestGroupCount++}__`;
  const serviceFolderId = `__GRP_${requestGroupCount++}__`;

  const outerFolder: ImportRequest = {
    _type: 'request_group',
    _id: outerFolderId,
    parentId: '__WORKSPACE_ID__',
    name: collectionName,
    description: '',
    environment: {},
    authentication: {},
    preRequestScript: '',
    afterResponseScript: '',
  };

  const serviceFolder: ImportRequest = {
    _type: 'request_group',
    _id: serviceFolderId,
    parentId: outerFolderId,
    name: collectionName,
    description: folder?.description || '',
    environment: {},
    authentication: {},
    preRequestScript: '',
    afterResponseScript: '',
  };

  const reParentedRequests = requests.map(request => ({
    ...request,
    _id: `__REQ_${requestCount++}__`,
    parentId: serviceFolderId,
    url: endpointUrl,
  }));

  const now = Date.now();
  return [outerFolder, serviceFolder, ...reParentedRequests].map((item, index) => ({
    ...item,
    metaSortKey: -1 * (now - index),
  }));
};

export { wsdlToOpenApi };

export const convertWsdlResources = async (wsdlInput: string, fileContent: string): Promise<ImportRequest[]> => {
  requestGroupCount = 1;
  requestCount = 1;

  const openApiDoc = await wsdlToOpenApi(wsdlInput, fileContent);
  const resources = await openapi3.convert(JSON.stringify(openApiDoc));

  if (!resources || Array.isArray(resources) === false) {
    throw new Error('Failed to convert WSDL OpenAPI document');
  }

  const endpointUrl = openApiDoc.servers?.[0]?.url || '';
  const importableResources = resources.filter(
    (resource: ImportRequest) => resource._type === 'request' || resource._type === 'request_group',
  );

  return restructureWsdlImport(importableResources, openApiDoc.info?.title || 'SOAP Service', endpointUrl);
};
