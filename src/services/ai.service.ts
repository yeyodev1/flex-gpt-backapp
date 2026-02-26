import { ClaudeService } from "./claude.service";
import { GeminiService } from "./gemini.service";
import { DeepSeekService } from "./deepseek.service";
import type { AIProvider } from "../models/conversation.model";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  files?: { path: string; name: string; mimeType: string }[];
}

// Lazy initialization to ensure env vars are loaded via dotenv first
let claudeService: ClaudeService | null = null;
let geminiService: GeminiService | null = null;
let deepSeekService: DeepSeekService | null = null;

function getClaude(): ClaudeService {
  if (!claudeService) claudeService = new ClaudeService();
  return claudeService;
}

function getGemini(): GeminiService {
  if (!geminiService) geminiService = new GeminiService();
  return geminiService;
}

function getDeepSeek(): DeepSeekService {
  if (!deepSeekService) deepSeekService = new DeepSeekService();
  return deepSeekService;
}

export function getAIStream(
  provider: AIProvider,
  messages: ChatMessage[]
): AsyncGenerator<string> {
  switch (provider) {
    case "claude":
      return getClaude().streamChat(messages);
    case "gemini":
      return getGemini().streamChat(messages);
    case "deepseek":
      return getDeepSeek().streamChat(messages);
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}
