import type { BrowserWindow as ElectronBrowserWindow } from 'electron';

let mainWindow: ElectronBrowserWindow | null = null;

export function getMainWindow(): ElectronBrowserWindow | null {
  return mainWindow;
}

export function setMainWindow(window: ElectronBrowserWindow | null): void {
  mainWindow = window;
}
