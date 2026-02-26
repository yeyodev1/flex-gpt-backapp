import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import models from "../models";
import type { AuthRequest } from "../types/AuthRequest";
import { HttpStatusCode } from "axios";

async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(HttpStatusCode.BadRequest).send({
        message: "Email and password are required.",
      });
      return;
    }

    const user = await models.users.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      res.status(HttpStatusCode.Unauthorized).send({
        message: "Invalid email or password.",
      });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      res.status(HttpStatusCode.Unauthorized).send({
        message: "Invalid email or password.",
      });
      return;
    }

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
        accountType: user.accountType,
      },
      process.env.JWT_SECRET as string,
      { expiresIn: "7d" }
    );

    res.status(HttpStatusCode.Ok).send({
      message: "Login successful.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        accountType: user.accountType,
      },
    });
    return;
  } catch (error) {
    console.error("Login error:", error);
    res.status(HttpStatusCode.InternalServerError).send({
      message: "Internal server error.",
    });
    return;
  }
}

async function getProfile(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(HttpStatusCode.Unauthorized).send({
        message: "Unauthorized.",
      });
      return;
    }

    const user = await models.users.findById(userId).select("-password");

    if (!user) {
      res.status(HttpStatusCode.NotFound).send({
        message: "User not found.",
      });
      return;
    }

    res.status(HttpStatusCode.Ok).send({
      message: "Profile retrieved successfully.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        accountType: user.accountType,
      },
    });
    return;
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(HttpStatusCode.InternalServerError).send({
      message: "Internal server error.",
    });
    return;
  }
}

export { login, getProfile };
