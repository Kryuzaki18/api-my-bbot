import Analysis from "../schema/analyses.schema.js";
import analysesData from "../data/analyses.data.js";

const seedAnalyses = async () => {
  await Analysis.create(analysesData);
};

export const analysesSeed = async () => {
  try {
    await seedAnalyses();
    console.log("Analyses data seeded successfully");
  } catch (err) {
    console.error("Analyses data seeding failed:", err);
  }
};
