import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runGenerationPipeline } from '@techspokes/typescript-wsdl-client';
import type { OpenAPIV3 } from 'openapi-types';

import { type CompiledCatalogLike, enrichSoapOperations } from './soap-enrichment';
import { getPrimarySoapPort, parseWsdlDocument } from './wsdl-parser';

const writeTempWsdlFile = (content: string) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'insomnia-wsdl-'));
  const tempPath = path.join(tempDir, 'import.wsdl');
  const normalizedContent = content.startsWith('<?xml') ? content : `<?xml version="1.0" encoding="UTF-8" ?>${content}`;
  fs.writeFileSync(tempPath, normalizedContent, 'utf8');
  return tempPath;
};

export const wsdlToOpenApi = async (wsdlInput: string, fileContent: string): Promise<OpenAPIV3.Document> => {
  const wsdlPath = path.isAbsolute(wsdlInput) && fs.existsSync(wsdlInput) ? wsdlInput : writeTempWsdlFile(fileContent);
  const catalogOut = fs.mkdtempSync(path.join(os.tmpdir(), 'insomnia-wsdl-catalog-'));

  const { compiled } = await runGenerationPipeline({
    wsdl: wsdlPath,
    catalogOut: path.join(catalogOut, 'catalog.json'),
  });

  const parsedWsdl = parseWsdlDocument(fileContent);
  const port = getPrimarySoapPort(parsedWsdl);

  if (!port) {
    throw new Error('No SOAP endpoint found in WSDL');
  }

  const catalog = compiled as CompiledCatalogLike;
  return enrichSoapOperations({ openapi: '3.1.0', info: { title: '', version: '0.0.0' }, paths: {} }, catalog, parsedWsdl, port);
};
