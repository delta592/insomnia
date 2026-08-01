import { format } from 'date-fns';

import { showModal } from 'insomnia/src/ui/components/modals';
import { AskModal } from 'insomnia/src/ui/components/modals/ask-modal';
import { SelectModal } from 'insomnia/src/ui/components/modals/select-modal';

export const VALUE_YAML = 'yaml';
export const VALUE_HAR = 'har';

export type SelectedFormat = typeof VALUE_HAR | typeof VALUE_YAML;

export const showSelectExportTypeModal = ({ onDone }: { onDone: (selectedFormat: SelectedFormat) => Promise<void> }) => {
  const options = [
    {
      name: 'Insomnia v5',
      value: VALUE_YAML,
    },
    {
      name: 'HAR – HTTP Archive Format',
      value: VALUE_HAR,
    },
  ];

  let lastFormat = window.localStorage.getItem('insomnia.lastExportFormat');
  if (lastFormat === 'json') {
    window.localStorage.setItem('insomnia.lastExportFormat', VALUE_YAML);
    lastFormat = VALUE_YAML;
  }

  const defaultValue = options.find(({ value }) => value === lastFormat) ? lastFormat : VALUE_YAML;

  showModal(SelectModal, {
    title: 'Select Export Type',
    value: defaultValue,
    options,
    message: 'Which format would you like to export as?',
    onDone: async selectedFormat => {
      if (selectedFormat) {
        window.localStorage.setItem('insomnia.lastExportFormat', selectedFormat);
        await onDone(selectedFormat as SelectedFormat);
      }
    },
  });
};

export const showExportPrivateEnvironmentsModal = async () => {
  return new Promise<boolean>(resolve => {
    showModal(AskModal, {
      title: 'Export Private Environments?',
      message: 'Do you want to include private environments in your export?',
      onDone: async (isYes: boolean) => {
        if (isYes) {
          resolve(true);
        } else {
          resolve(false);
        }
      },
    });
  });
};

export const showSaveExportedFileDialog = async ({
  exportedFileNamePrefix,
  selectedFormat,
}: {
  exportedFileNamePrefix: string;
  selectedFormat: SelectedFormat;
}) => {
  const date = format(Date.now(), 'yyyy-MM-dd-HH-mm-ss');
  const name = exportedFileNamePrefix.replace(/ /g, '-');
  const lastDir = window.localStorage.getItem('insomnia.lastExportPath');
  const dir = lastDir || window.app.getPath('desktop');
  const options = {
    title: 'Export Insomnia Data',
    buttonLabel: 'Export',
    defaultPath: `${window.path.join(dir, `${name}_${date}`)}.${selectedFormat}`,
  };
  const { filePath } = await window.dialog.showSaveDialog(options);
  return filePath || null;
};

export async function writeExportedFileToFileSystem(filename: string, data: string) {
  window.localStorage.setItem('insomnia.lastExportPath', window.path.dirname(filename));
  await window.main.writeFile({
    path: filename,
    content: data,
  });
}
