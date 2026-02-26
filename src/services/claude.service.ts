import Anthropic from "@anthropic-ai/sdk";
import fs from "fs/promises";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  files?: { path: string; name: string; mimeType: string }[];
}

export class ClaudeService {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  private async fileToContentBlock(filePath: string, mimeType: string, fileName: string): Promise<any> {
    const data = await fs.readFile(filePath, { encoding: "base64" });

    if (mimeType.startsWith("image/")) {
      return {
        type: "image",
        source: {
          type: "base64",
          media_type: mimeType as any,
          data,
        },
      };
    } else if (mimeType === "application/pdf") {
      return {
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data,
        },
      };
    } else {
      // For text files, fallback to injecting text into the prompt directly
      const textData = Buffer.from(data, "base64").toString("utf8");
      return {
        type: "text",
        text: `\n--- Attached File: ${fileName} ---\n${textData}\n--- End File ---\n`,
      };
    }
  }

  async *streamChat(messages: ChatMessage[]): AsyncGenerator<string> {
    const formattedMessages: Anthropic.MessageParam[] = [];

    for (const m of messages) {
      if (m.role === "assistant") {
        formattedMessages.push({ role: "assistant", content: m.content });
      } else {
        const contentBlocks: any[] = [];

        // Push files first
        if (m.files && m.files.length > 0) {
          for (const f of m.files) {
            try {
              contentBlocks.push(await this.fileToContentBlock(f.path, f.mimeType, f.name));
            } catch (e) {
              console.error(`Failed to read file ${f.path}`);
            }
          }
        }

        // Push actual text prompt at the end
        contentBlocks.push({ type: "text", text: m.content });
        formattedMessages.push({ role: "user", content: contentBlocks as any[] });
      }
    }

    try {
      const options: any = {
        model: "claude-3-haiku-20240307",
        max_tokens: 4096,
        messages: formattedMessages,
      };

      // Only add betas if there are files (PDFs specifically)
      const hasPdf = messages.some(m => m.files?.some(f => f.mimeType === "application/pdf"));
      if (hasPdf) {
        options.betas = ["pdfs-2024-09-25"];
      }

      const stream = this.client.messages.stream(options);

      for await (const event of stream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          yield event.delta.text;
        }
      }
    } catch (error: any) {
      console.error("Claude stream error details:", error);
      throw error;
    }
  }
}
