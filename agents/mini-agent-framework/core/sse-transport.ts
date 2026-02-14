import { AgentEvent, BaseTransport, AgentEventType } from "./transport.js";
import { NextApiResponse } from "next";


export class SSETransport extends BaseTransport {
  constructor(private res: NextApiResponse) {
    super();
  };

  async emit<T extends AgentEventType>(event: AgentEvent<T>) {
    this.res.write(`data: ${JSON.stringify(event)}\n\n`);
  }

  onInput(callback: (input: string) => Promise<void>) {
    // In SSE, input is usually handled via a separate POST request
    // or we could use a custom mechanism here if needed.
  }
}
