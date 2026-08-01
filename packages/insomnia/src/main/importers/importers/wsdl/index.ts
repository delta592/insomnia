import path from 'node:path';

import type { ImportRequest } from '../../entities';
import * as openapi3 from '../openapi-3';
import { resolveWsdlImportContext } from './wsdl-import-context';
import { wsdlToOpenApi } from './wsdl-to-openapi';

let requestGroupCount = 1;
let requestCount = 1;

const restructureWsdlImport = (resources: ImportRequest[], collectionName: string): ImportRequest[] => {
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
  }));

  const now = Date.now();
  return [outerFolder, serviceFolder, ...reParentedRequests].map((item, index) => ({
    ...item,
    metaSortKey: -1 * (now - index),
  }));
};

const buildOpenApiExportResource = (openApiDoc: Awaited<ReturnType<typeof wsdlToOpenApi>>): ImportRequest => {
  const title = openApiDoc.info?.title || 'soap-service';
  return {
    _type: 'api_spec',
    _id: '__API_SPEC__',
    parentId: '__WORKSPACE_ID__',
    fileName: `${title.replace(/\s+/g, '-').toLowerCase()}.openapi.json`,
    contentType: 'json',
    contents: JSON.stringify(openApiDoc, null, 2),
  };
};

export { wsdlToOpenApi };

export const convertWsdlFromPath = (wsdlPath: string, content: string) =>
  convertWsdlResources({
    contentStr: content,
    oriFilePath: wsdlPath,
    oriFileName: path.basename(wsdlPath),
  });

export const convertWsdlResources = async (importEntry: Parameters<typeof resolveWsdlImportContext>[0]): Promise<ImportRequest[]> => {
  requestGroupCount = 1;
  requestCount = 1;

  const context = resolveWsdlImportContext(importEntry);

  try {
    const openApiDoc = await wsdlToOpenApi(context.wsdlInput, context.fileContent);
    const resources = await openapi3.convert(JSON.stringify(openApiDoc));

    if (!resources || Array.isArray(resources) === false) {
      throw new Error('Failed to convert WSDL OpenAPI document');
    }

    const importableResources = resources.filter(
      (resource: ImportRequest) => resource._type === 'request' || resource._type === 'request_group',
    );

    return [
      ...restructureWsdlImport(importableResources, openApiDoc.info?.title || 'SOAP Service'),
      buildOpenApiExportResource(openApiDoc),
    ];
  } finally {
    context.cleanup?.();
  }
};
