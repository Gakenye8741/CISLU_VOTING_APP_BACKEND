import { eq, and, sql } from "drizzle-orm";
import db from "../../drizzle/db";
import { positions, TinsertPosition, TselectPosition } from "../../drizzle/schema";

// -------------------------------
// 1. Create a Position
// -------------------------------
export const createPositionService = async (data: TinsertPosition): Promise<TselectPosition> => {
  const [newPosition] = await db.insert(positions)
    .values(data)
    .returning();
  
  if (!newPosition) throw new Error("Failed to create position");
  return newPosition;
};

// -------------------------------
// 2. Get All Positions for a Specific Election
// -------------------------------
export const getPositionsByElectionService = async (electionId: string): Promise<TselectPosition[]> => {
  return await db.query.positions.findMany({
    where: eq(positions.electionId, electionId),
  });
};

// -------------------------------
// 3. Get Eligible Positions for a Student
// -------------------------------
/**
 * Logic: Returns positions where targetYears is empty (open to all) 
 * OR contains the student's specific academic year.
 */
export const getEligiblePositionsService = async (
  electionId: string, 
  studentYear: string
): Promise<TselectPosition[]> => {
  return await db.select()
    .from(positions)
    .where(
      and(
        eq(positions.electionId, electionId),
        sql`${positions.targetYears} IS NULL OR ${studentYear} = ANY(${positions.targetYears})`
      )
    );
};

// -------------------------------
// 4. Update Position
// -------------------------------
export const updatePositionService = async (
  id: string, 
  updates: Partial<TinsertPosition>
): Promise<TselectPosition | null> => {
  const [updated] = await db.update(positions)
    .set(updates)
    .where(eq(positions.id, id))
    .returning();
  
  return updated ?? null;
};

// -------------------------------
// 5. Delete Position
// -------------------------------
export const deletePositionService = async (id: string): Promise<string> => {
  const [deleted] = await db.delete(positions)
    .where(eq(positions.id, id))
    .returning();
  
  if (!deleted) throw new Error("Position not found");
  return "Position deleted successfully";
};