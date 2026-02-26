import { GoogleGenerativeAI } from "@google/generative-ai";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export class GeminiService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
  }

  async *streamChat(messages: ChatMessage[]): AsyncGenerator<string> {
    const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Convert messages to Gemini format
    const history = messages.slice(0, -1).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const lastMessage = messages[messages.length - 1];

    const chat = model.startChat({ history });

    const result = await chat.sendMessageStream(lastMessage.content);

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        yield text;
      }
    }
  }
}
