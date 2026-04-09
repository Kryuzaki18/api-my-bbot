import bcrypt from "bcrypt";
import User from "../schema/users.schema.js";

const SALT_ROUNDS = 12;

const seedUsers = async () => {
  const hashedPassword = await bcrypt.hash("sample123", SALT_ROUNDS);
  await User.create({
    email: "sample123@gmail.com",
    password: hashedPassword,
    binanceKeys: {
      test: {
        apiKey: "sample_api_key",
        apiSecret: "sample_api_secret",
      },
      prod: {
        apiKey: "sample_api_key",
        apiSecret: "sample_api_secret",
      },
    },
  });
};

export const runSeed = async () => {
  try {
    await seedUsers();
    console.log("Seeding completed");
  } catch (err) {
    console.error("Seeding failed:", err);
  }
};
