import OpenAI from "openai";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export class DeepSeekService {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: "https://api.deepseek.com",
    });
  }

  async *streamChat(messages: ChatMessage[]): AsyncGenerator<string> {
    const stream = await this.client.chat.completions.create({
      model: "deepseek-chat",
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        yield delta;
      }
    }
  }
}
