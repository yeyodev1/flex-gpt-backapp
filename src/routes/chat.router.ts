import { Router } from "express";
import {
  sendMessage,
  getConversations,
  getConversation,
  deleteConversation,
  checkProviders,
} from "../controllers/chat.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const chatRouter = Router();

// All chat routes require authentication
chatRouter.use(authMiddleware as any);

chatRouter.get("/providers/status", checkProviders as any);
chatRouter.post("/send", sendMessage as any);
chatRouter.get("/conversations", getConversations as any);
chatRouter.get("/conversations/:id", getConversation as any);
chatRouter.delete("/conversations/:id", deleteConversation as any);

export default chatRouter;
