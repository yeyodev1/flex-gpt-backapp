import bcrypt from "bcryptjs";
import models from "../models";

export async function seedInitialUsers() {
  try {
    const existingUser = await models.users.findOne({ email: "testing@flexgpt.ec" });

    const hashedPassword = await bcrypt.hash("123456789", 10);

    if (existingUser) {
      console.log("User already exists, updating name and password...");
      existingUser.name = "user testing";
      existingUser.password = hashedPassword;
      await existingUser.save();
      console.log("User updated successfully.");
      return;
    }

    await models.users.create({
      name: "user testing",
      email: "testing@flexgpt.ec",
      password: hashedPassword,
      accountType: "admin",
    });

    console.log("Seed user created: testing@flexgpt.ec");
  } catch (error) {
    console.error("Error seeding initial users:", error);
  }
}
