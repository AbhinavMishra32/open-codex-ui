import { AgentEvent, BaseTransport, AgentEventType } from "./transport.js";

export class ElectronTransport extends BaseTransport {
  constructor(private window: any, private ipcMain: any) {
    super();
  }

  async emit<T extends AgentEventType>(event: AgentEvent<T>) {
    this.window.webContents.send('agent:event', event);
  }

  onInput(callback: (input: string) => Promise<void>) {
    this.ipcMain.handle('agent:user-input', async (_event: any, input: string) => {
      await callback(input);
    });
  }
}
