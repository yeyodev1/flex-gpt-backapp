import mongoose, { Schema, Document, Types } from "mongoose";

export type AIProvider = "claude" | "gemini" | "deepseek";
export type MessageRole = "user" | "assistant" | "system";

export interface IMessage {
  role: MessageRole;
  content: string;
  provider?: AIProvider;
  createdAt: Date;
}

export interface IConversation extends Document {
  userId: Types.ObjectId;
  title: string;
  aiProvider: AIProvider;
  messages: IMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    role: {
      type: String,
      required: true,
      enum: ["user", "assistant", "system"],
    },
    content: {
      type: String,
      required: true,
    },
    provider: {
      type: String,
      enum: ["claude", "gemini", "deepseek"],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const ConversationSchema = new Schema<IConversation>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      default: "New Conversation",
    },
    aiProvider: {
      type: String,
      required: true,
      enum: ["claude", "gemini", "deepseek"],
      default: "gemini",
    },
    messages: {
      type: [MessageSchema],
      default: [],
    },
  },
  { timestamps: true, versionKey: false }
);

const ConversationModel = mongoose.model<IConversation>("Conversation", ConversationSchema);
export default ConversationModel;
