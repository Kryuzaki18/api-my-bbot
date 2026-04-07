import bcrypt from "bcrypt";
import User from "../schema/users.schema.js";

const SALT_ROUNDS = 12;

const seedUsers = async () => {
  const hashedPassword = await bcrypt.hash("sample123", SALT_ROUNDS);
  await User.create({
    username: "admin",
    email: "sample123@gmail.com",
    password: hashedPassword,
    apiKey: "sample_api_key",
    apiSecret: "sample_api_secret",
  });
  // await User.deleteMany({});
  // await User.insertMany([
  //   {
  //     username: "admin",
  //     email: "[EMAIL_ADDRESS]",
  //     password: hashedPassword,
  //     apiKey: "sample_api_key",
  //     apiSecret: "sample_api_secret",
  //   },
  // ]);
};

export const runSeed = async () => {
  try {
    await seedUsers();
    console.log("Seeding completed");
  } catch (err) {
    console.error("Seeding failed:", err);
  }
};
