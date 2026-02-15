import { app, BrowserWindow, ipcMain } from "electron";
import { ElectronTransport } from "../core/electron-transport.js";
import { AgentEngine } from "../core/engine.js";
import { agent } from "../core/agent.js";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      sandbox: false
    }
  });

  const transport = new ElectronTransport(win, ipcMain);

  const engine = new AgentEngine(agent, transport);

  transport.onInput(async (userInput) => {
    await engine.run([{ role: "user", text: userInput }]);
  })

  win.loadURL("http://localhost:3000");
}
app.whenReady().then(createWindow);
