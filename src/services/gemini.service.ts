import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs/promises";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  files?: { path: string; name: string; mimeType: string }[];
}

export class GeminiService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
  }

  private async fileToGenerativePart(filePath: string, mimeType: string) {
    const data = await fs.readFile(filePath, { encoding: "base64" });
    return {
      inlineData: {
        data,
        mimeType,
      },
    };
  }

  async *streamChat(messages: ChatMessage[]): AsyncGenerator<string> {
    const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const history: any[] = [];

    // Process all history messages synchronously to properly await file reads
    for (const m of messages.slice(0, -1)) {
      const parts: any[] = [{ text: m.content }];
      if (m.files && m.files.length > 0) {
        for (const f of m.files) {
          try {
            parts.unshift(await this.fileToGenerativePart(f.path, f.mimeType));
          } catch (e) {
            console.error(`Failed to read file ${f.path}`);
          }
        }
      }
      history.push({
        role: m.role === "assistant" ? "model" : "user",
        parts,
      });
    }

    const lastMessage = messages[messages.length - 1];
    const lastMessageParts: any[] = [{ text: lastMessage.content }];

    if (lastMessage.files && lastMessage.files.length > 0) {
      for (const f of lastMessage.files) {
        try {
          lastMessageParts.unshift(await this.fileToGenerativePart(f.path, f.mimeType));
        } catch (e) {
          console.error(`Failed to read file ${f.path}`);
        }
      }
    }

    const chat = model.startChat({ history });

    const result = await chat.sendMessageStream(lastMessageParts);

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        yield text;
      }
    }
  }
}
