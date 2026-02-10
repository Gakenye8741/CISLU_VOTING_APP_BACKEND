import { eq } from "drizzle-orm";
import db from "../../drizzle/db";
import { graduationStatus, users } from "../../drizzle/schema";


// Only Dean of the school or Admin can update
export const updateGraduationStatusService = async (
  reg_no: string,
  newStatus: typeof graduationStatus.enumValues[number]
) => {
  const [updatedUser] = await db.update(users)
    .set({ graduation_status: newStatus })
    .where(eq(users.reg_no, reg_no))
    .returning();

  if (!updatedUser) throw new Error("Failed to update graduation status");
  return updatedUser;
};
