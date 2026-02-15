import { app, BrowserWindow, ipcMain } from "electron";
import { ElectronTransport } from "../core/electron-transport.js";
import { AgentEngine } from "../core/engine.js";
import { agent } from "../core/agent.js";
import path from "path";
import { fileURLToPath } from "url";
import { MemorySessionStore } from "../core/memory-session-store.js";

const store = new MemorySessionStore();
const DEFAULT_SESSION_ID = "default";

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

  async function handlePrompt(input: string) {
    const session = (await store.get(DEFAULT_SESSION_ID)) ?? (await store.create(DEFAULT_SESSION_ID));
    const turnId = crypto.randomUUID();

    session.messages.push({ role: "user", text: input, turnId });

    const { finalText } = await engine.run(
      session.messages.map((m) => ({ role: m.role, text: m.text }))
    )

    session.messages.push({
      role: "assistant",
      text: finalText,
      turnId
    })

    await store.save(session);
  }

  transport.onInput(async (userInput) => {
    // await engine.run([{ role: "user", text: userInput }]);
    await handlePrompt(userInput);
  })

  win.loadURL("http://localhost:3000");
}

// add snapshot endpoint for UI restore
ipcMain.handle("agent:get-session", async () => {
  return (await store.get(DEFAULT_SESSION_ID)) ?? (await store.create(DEFAULT_SESSION_ID));
});

app.whenReady().then(createWindow);
