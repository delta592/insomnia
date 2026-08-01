import { getInsomniaV5DataExport } from 'insomnia/src/common/insomnia-v5';
import { AnalyticsEvent } from 'insomnia/src/ui/analytics';
import { showError } from 'insomnia/src/ui/components/modals';
import type { BaseModel } from 'insomnia-data';
import { services } from 'insomnia-data';

import {
  showExportPrivateEnvironmentsModal,
  showSaveExportedFileDialog,
  showSelectExportTypeModal,
  VALUE_HAR,
  VALUE_YAML,
  writeExportedFileToFileSystem,
} from './export-file-utils';

export const exportRequestsToFile = (workspaceId: string, requestIds: string[]) => {
  showSelectExportTypeModal({
    onDone: async selectedFormat => {
      const requests: BaseModel[] = [];
      for (const requestId of requestIds) {
        const request = await services.helpers.getRequestById(requestId);
        if (request) {
          requests.push(request);
        }
      }
      const baseEnvironment = await services.environment.getByParentId(workspaceId);

      const subEnvironments = baseEnvironment ? await services.environment.listByParentId(baseEnvironment._id) : [];
      const shouldPrompt = subEnvironments.some(e => e.isPrivate);
      let shouldExportPrivateEnvironments = false;
      if (shouldPrompt) {
        shouldExportPrivateEnvironments = await showExportPrivateEnvironmentsModal();
      }
      const fileName = await showSaveExportedFileDialog({
        exportedFileNamePrefix: 'Insomnia',
        selectedFormat,
      });

      if (!fileName) {
        return;
      }

      let stringifiedExport = '';

      try {
        switch (selectedFormat) {
          case VALUE_HAR: {
            stringifiedExport = await window.main.exportRequestsHAR({
              requests,
              includePrivateDocs: shouldExportPrivateEnvironments,
            });
            break;
          }

          case VALUE_YAML: {
            stringifiedExport = await getInsomniaV5DataExport({
              workspaceId,
              includePrivateEnvironments: shouldExportPrivateEnvironments,
              requestIds,
            });
            break;
          }

          default: {
            throw new Error(`selected export format "${selectedFormat}" is invalid`);
          }
        }
        await writeExportedFileToFileSystem(fileName, stringifiedExport);
        window.main.trackAnalyticsEvent({ event: AnalyticsEvent.dataExport, properties: { type: selectedFormat } });
      } catch (err) {
        showError({
          title: 'Export Failed',
          error: err,
          message: 'Export failed due to an unexpected error',
        });
        return;
      }
    },
  });
};
