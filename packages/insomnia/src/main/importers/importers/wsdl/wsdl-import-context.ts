import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { DOMParser } from '@xmldom/xmldom';

import type { ImportEntry } from '../../entities';

const isRemoteWsdl = (value: string) => /^https?:\/\//i.test(value);

const normalizeWsdlContent = (content: string) => {
  return content.startsWith('<?xml') ? content : `<?xml version="1.0" encoding="UTF-8" ?>${content}`;
};

const parseRelativeImportPaths = (fileContent: string) => {
  const document = new DOMParser().parseFromString(fileContent, 'text/xml');
  const paths = new Set<string>();

  for (const element of document.getElementsByTagName('*')) {
    const location = element.getAttribute('schemaLocation') || element.getAttribute('location');
    if (location && !/^https?:\/\//i.test(location) && !location.startsWith('file:')) {
      paths.add(location);
    }
  }

  return [...paths];
};

const findCompanionContent = (relPath: string, related: ImportEntry['relatedImportEntries']) => {
  const baseName = path.basename(relPath);
  const companion = related?.find(entry => {
    if (entry.oriFileName === baseName || entry.oriFileName === relPath) {
      return true;
    }
    return entry.oriFilePath?.endsWith(relPath) || entry.oriFilePath?.endsWith(baseName);
  });
  return companion?.contentStr;
};

const writeTempWsdlDirectory = ({
  fileContent,
  fileName,
  related,
}: {
  fileContent: string;
  fileName?: string;
  related?: ImportEntry['relatedImportEntries'];
}) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'insomnia-wsdl-'));
  const wsdlFileName = fileName?.endsWith('.wsdl') ? path.basename(fileName) : 'import.wsdl';
  const wsdlPath = path.join(tempDir, wsdlFileName);
  fs.writeFileSync(wsdlPath, fileContent, 'utf8');

  for (const relPath of parseRelativeImportPaths(fileContent)) {
    const companionContent = findCompanionContent(relPath, related);
    if (!companionContent) {
      continue;
    }
    const targetPath = path.join(tempDir, relPath);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, companionContent, 'utf8');
  }

  return {
    wsdlPath,
    cleanup: () => fs.rmSync(tempDir, { recursive: true, force: true }),
  };
};

export interface WsdlImportContext {
  wsdlInput: string;
  fileContent: string;
  cleanup?: () => void;
}

export const resolveWsdlImportContext = (importEntry: ImportEntry): WsdlImportContext => {
  const fileContent = normalizeWsdlContent(importEntry.contentStr);

  if (importEntry.oriFilePath) {
    return { wsdlInput: importEntry.oriFilePath, fileContent };
  }

  if (importEntry.oriFileName && isRemoteWsdl(importEntry.oriFileName)) {
    return { wsdlInput: importEntry.oriFileName, fileContent };
  }

  const { wsdlPath, cleanup } = writeTempWsdlDirectory({
    fileContent,
    fileName: importEntry.oriFileName,
    related: importEntry.relatedImportEntries,
  });

  return { wsdlInput: wsdlPath, fileContent, cleanup };
};
