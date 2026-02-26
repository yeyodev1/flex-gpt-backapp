import { Router } from "express";
import {
  sendMessage,
  getConversations,
  getConversation,
  deleteConversation,
  checkProviders,
} from "../controllers/chat.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

import multer from "multer";
import fs from "fs";
import path from "path";

const chatRouter = Router();

const uploadDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for disk storage to avoid MongoDB limits
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
  },
});

// All chat routes require authentication
chatRouter.use(authMiddleware as any);

chatRouter.get("/providers/status", checkProviders as any);
chatRouter.post("/send", upload.array("files"), sendMessage as any);
chatRouter.get("/conversations", getConversations as any);
chatRouter.get("/conversations/:id", getConversation as any);
chatRouter.delete("/conversations/:id", deleteConversation as any);

export default chatRouter;
