import type { Response } from "express";
import { HttpStatusCode } from "axios";
import { Types } from "mongoose";
import models from "../models";
import type { AIProvider } from "../models/conversation.model";
import type { AuthRequest } from "../types/AuthRequest";
import { getAIStream } from "../services/ai.service";

const MAX_MESSAGES_PER_CONVERSATION = 50;

async function sendMessage(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(HttpStatusCode.Unauthorized).send({
        message: "Unauthorized.",
      });
      return;
    }

    const { conversationId, provider, message } = req.body as {
      conversationId?: string;
      provider: AIProvider;
      message: string;
    };

    if (!provider || !message) {
      res.status(HttpStatusCode.BadRequest).send({
        message: "Provider and message are required.",
      });
      return;
    }

    const validProviders: AIProvider[] = ["claude", "gemini", "deepseek"];
    if (!validProviders.includes(provider)) {
      res.status(HttpStatusCode.BadRequest).send({
        message: "Invalid provider. Must be claude, gemini, or deepseek.",
      });
      return;
    }

    // Find or create conversation
    let conversation;

    if (conversationId && Types.ObjectId.isValid(conversationId)) {
      conversation = await models.conversations.findOne({
        _id: conversationId,
        userId,
      });
    }

    if (!conversation) {
      // Auto-generate title from first message (first 50 chars)
      const title = message.length > 50 ? message.substring(0, 50) + "..." : message;

      conversation = await models.conversations.create({
        userId,
        title,
        aiProvider: provider,
        messages: [],
      });
    }

    // Check conversation length limit
    if (conversation.messages.length >= MAX_MESSAGES_PER_CONVERSATION) {
      res.status(HttpStatusCode.BadRequest).send({
        message: `This conversation has reached the ${MAX_MESSAGES_PER_CONVERSATION}-message limit. Please start a new chat to continue.`,
        code: "CONVERSATION_LIMIT_REACHED",
      });
      return;
    }

    // Update aiProvider if switching mid-conversation
    if (conversation.aiProvider !== provider) {
      conversation.aiProvider = provider;
    }

    // Add user message
    conversation.messages.push({
      role: "user",
      content: message,
      createdAt: new Date(),
    });

    await conversation.save();

    // Prepare message history for AI (last 20 messages for context window)
    const messageHistory = conversation.messages
      .slice(-20)
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    // Set SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    // Send conversation ID first
    res.write(`data: ${JSON.stringify({ type: "meta", conversationId: conversation._id })}\n\n`);

    let assistantContent = "";

    try {
      const stream = getAIStream(provider, messageHistory);

      for await (const chunk of stream) {
        assistantContent += chunk;
        res.write(`data: ${JSON.stringify({ type: "chunk", content: chunk })}\n\n`);
      }

      // Save assistant message
      conversation.messages.push({
        role: "assistant",
        content: assistantContent,
        provider,
        createdAt: new Date(),
      });

      await conversation.save();

      res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
      res.end();
    } catch (streamError) {
      console.error("AI stream error:", streamError);
      res.write(
        `data: ${JSON.stringify({ type: "error", message: "AI provider error. Please try again." })}\n\n`
      );
      res.end();
    }
  } catch (error) {
    console.error("Send message error:", error);
    // If headers already sent (streaming started), just end
    if (res.headersSent) {
      res.write(
        `data: ${JSON.stringify({ type: "error", message: "Internal server error." })}\n\n`
      );
      res.end();
      return;
    }
    res.status(HttpStatusCode.InternalServerError).send({
      message: "Internal server error.",
    });
    return;
  }
}

async function getConversations(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(HttpStatusCode.Unauthorized).send({
        message: "Unauthorized.",
      });
      return;
    }

    const conversations = await models.conversations
      .find({ userId })
      .select("title aiProvider createdAt updatedAt")
      .sort({ updatedAt: -1 })
      .limit(50);

    res.status(HttpStatusCode.Ok).send({
      message: "Conversations retrieved successfully.",
      conversations,
    });
    return;
  } catch (error) {
    console.error("Get conversations error:", error);
    res.status(HttpStatusCode.InternalServerError).send({
      message: "Internal server error.",
    });
    return;
  }
}

async function getConversation(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      res.status(HttpStatusCode.Unauthorized).send({
        message: "Unauthorized.",
      });
      return;
    }

    if (!Types.ObjectId.isValid(id)) {
      res.status(HttpStatusCode.BadRequest).send({
        message: "Invalid conversation ID.",
      });
      return;
    }

    const conversation = await models.conversations.findOne({
      _id: id,
      userId,
    });

    if (!conversation) {
      res.status(HttpStatusCode.NotFound).send({
        message: "Conversation not found.",
      });
      return;
    }

    res.status(HttpStatusCode.Ok).send({
      message: "Conversation retrieved successfully.",
      conversation,
    });
    return;
  } catch (error) {
    console.error("Get conversation error:", error);
    res.status(HttpStatusCode.InternalServerError).send({
      message: "Internal server error.",
    });
    return;
  }
}

async function deleteConversation(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      res.status(HttpStatusCode.Unauthorized).send({
        message: "Unauthorized.",
      });
      return;
    }

    if (!Types.ObjectId.isValid(id)) {
      res.status(HttpStatusCode.BadRequest).send({
        message: "Invalid conversation ID.",
      });
      return;
    }

    const conversation = await models.conversations.findOneAndDelete({
      _id: id,
      userId,
    });

    if (!conversation) {
      res.status(HttpStatusCode.NotFound).send({
        message: "Conversation not found.",
      });
      return;
    }

    res.status(HttpStatusCode.Ok).send({
      message: "Conversation deleted successfully.",
    });
    return;
  } catch (error) {
    console.error("Delete conversation error:", error);
    res.status(HttpStatusCode.InternalServerError).send({
      message: "Internal server error.",
    });
    return;
  }
}

async function checkProviders(_req: AuthRequest, res: Response) {
  try {
    const providers: AIProvider[] = ["claude", "gemini", "deepseek"];

    // Test each provider in parallel with a minimal request
    const results = await Promise.allSettled(
      providers.map(async (provider) => {
        try {
          const stream = getAIStream(provider, [
            { role: "user", content: "Hi" },
          ]);

          // Read just the first chunk to verify the provider works
          const first = await stream.next();

          // Force-close the generator to avoid wasting tokens
          await stream.return(undefined as any);

          if (first.done && !first.value) {
            return { provider, available: false, error: "No response received." };
          }

          return { provider, available: true };
        } catch (err: any) {
          const message =
            err?.message || err?.error?.message || "Unknown error";

          // Detect common billing/auth issues
          if (
            message.includes("Insufficient Balance") ||
            message.includes("402") ||
            err?.status === 402
          ) {
            return { provider, available: false, error: "Insufficient balance." };
          }

          if (
            message.includes("401") ||
            message.includes("Unauthorized") ||
            message.includes("invalid_api_key") ||
            err?.status === 401
          ) {
            return { provider, available: false, error: "Invalid API key." };
          }

          return { provider, available: false, error: "Service unavailable." };
        }
      })
    );

    const providersStatus: Record<
      string,
      { available: boolean; error?: string }
    > = {};

    for (const result of results) {
      if (result.status === "fulfilled") {
        const { provider, available, error } = result.value;
        providersStatus[provider] = { available, ...(error ? { error } : {}) };
      }
    }

    res.status(HttpStatusCode.Ok).send({
      message: "Provider status retrieved successfully.",
      providers: providersStatus,
    });
    return;
  } catch (error) {
    console.error("Check providers error:", error);
    res.status(HttpStatusCode.InternalServerError).send({
      message: "Internal server error.",
    });
    return;
  }
}

export { sendMessage, getConversations, getConversation, deleteConversation, checkProviders };
