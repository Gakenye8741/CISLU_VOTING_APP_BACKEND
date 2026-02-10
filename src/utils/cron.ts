// cronJobs.ts
import cron from "node-cron";
import { autoUpdateGraduationStatus } from "../services/graduation/graduation.controller";
import { autoUpdateElectionStatusService } from "../services/elections/elections.service";

// -------------------------------
// Graduation Status Cron
// -------------------------------
console.log("Graduation status cron job initialized.");

// Runs every 5 minutes
cron.schedule("*/5 * * * *", async () => {
  console.log(`[${new Date().toISOString()}] Running graduation status update...`);
  try {
    await autoUpdateGraduationStatus();
    console.log(`[${new Date().toISOString()}] Graduation statuses updated successfully.`);
  } catch (err: any) {
    console.error(`[${new Date().toISOString()}] Failed to update graduation statuses:`, err);
  }
});

// -------------------------------
// Election Status Cron
// -------------------------------
console.log("Election status cron job initialized.");

// Runs every 5 minutes
cron.schedule("*/5 * * * *", async () => {
  console.log(`[${new Date().toISOString()}] Running election status update...`);
  try {
    await autoUpdateElectionStatusService();
    console.log(`[${new Date().toISOString()}] Election statuses updated successfully.`);
  } catch (err: any) {
    console.error(`[${new Date().toISOString()}] Failed to update election statuses:`, err);
  }
});
