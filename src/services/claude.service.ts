import Anthropic from "@anthropic-ai/sdk";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export class ClaudeService {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async *streamChat(messages: ChatMessage[]): AsyncGenerator<string> {
    const stream = this.client.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        yield event.delta.text;
      }
    }
  }
}
