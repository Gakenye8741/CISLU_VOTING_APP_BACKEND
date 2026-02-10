import { RequestHandler } from "express";
import { updateGraduationStatusService } from "./graduation.service";
import { graduationStatus, users } from "../../drizzle/schema";
import db from "../../drizzle/db";
import { eq } from "drizzle-orm";

// ---- Manual update by Dean/Admin ----
export const updateGraduationStatus: RequestHandler = async (req, res) => {
  try {
    const { reg_no } = req.params;
    const { graduation_status } = req.body;
    const role = req.user?.role;

    const allowedRoles = [
      "admin",
      "Dean_of_Science",
      "Dean_of_Education",
      "Dean_of_Business",
      "Dean_of_Humanities_and_Developmental_Studies",
      "Dean_of_TVET",
    ];

    if (!role || !allowedRoles.includes(role)) {
      return res.status(403).json({ error: "Forbidden: Cannot update graduation status" });
    }

    if (!graduationStatus.enumValues.includes(graduation_status)) {
      return res.status(400).json({ error: "Invalid graduation status" });
    }

    const updatedUser = await updateGraduationStatusService(reg_no, graduation_status);

    res.status(200).json({ message: "Graduation status updated", user: updatedUser });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to update graduation status" });
  }
};

// ---- Automatic graduation update (cron) ----
export const autoUpdateGraduationStatus = async () => {
  try {
    const students = await db.query.users.findMany({
      where: eq(users.graduation_status, "active"),
    });

    const today = new Date();

    for (const student of students) {
      const [month, year] = student.expected_graduation.split("/").map(Number);
      const graduationDate = new Date(year, month - 1, 1); // MM/YYYY

      if (today >= graduationDate) {
        await updateGraduationStatusService(student.reg_no, "graduated");
        console.log(`Graduation status updated for ${student.reg_no}`);
      }
    }
  } catch (err) {
    console.error("Failed to auto-update graduation status:", err);
  }
};
