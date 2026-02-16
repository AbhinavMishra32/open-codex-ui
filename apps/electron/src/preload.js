import { contextBridge, ipcRenderer } from "electron";

const AgentEventType = {
  THINKING: 'thinking',
  MESSAGE: 'message',
  TOOL_CALL: 'tool_call',
  TOOL_RESULT: 'tool_result',
  ERROR: 'error',
  STATUS: 'status'
};

contextBridge.exposeInMainWorld("agentApi", {
  EVENT_TYPES: AgentEventType,

  sendPrompt: (prompt) => ipcRenderer.invoke("agent:user-input", prompt),

  onEvent: (callback) => {
    const subscription = (_event, value) => callback(value);
    ipcRenderer.on("agent:event", subscription);
    return () => ipcRenderer.removeListener("agent:event", subscription);
  },

  getSession: () => ipcRenderer.invoke("agent:get-session"),
});
