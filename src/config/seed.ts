import bcrypt from "bcryptjs";
import models from "../models";

export async function seedInitialUsers() {
  try {
    const existingUser = await models.users.findOne({ email: "testing@flexgpt.ec" });

    if (existingUser) {
      console.log("Seed user already exists, skipping...");
      return;
    }

    const hashedPassword = await bcrypt.hash("123456789", 10);

    await models.users.create({
      name: "FlexGPT Tester",
      email: "testing@flexgpt.ec",
      password: hashedPassword,
      accountType: "admin",
    });

    console.log("Seed user created: testing@flexgpt.ec");
  } catch (error) {
    console.error("Error seeding initial users:", error);
  }
}
