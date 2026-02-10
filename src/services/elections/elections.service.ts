import { desc, eq } from "drizzle-orm";
import db from "../../drizzle/db";
import { elections, TinsertElection, TselectElection, electionStatusEnum } from "../../drizzle/schema";

// Type helper derived from your pgEnum
type ElectionStatus = "cancelled" | "upcoming" | "voting" | "completed";

// -------------------------------
// 1. Create a new election
// -------------------------------
export const createElectionService = async (
  electionData: TinsertElection
): Promise<TselectElection> => {
  const [newElection] = await db.insert(elections)
    .values({
      ...electionData,
      status: electionData.status ?? 'upcoming' // Default to upcoming
    })
    .returning();

  if (!newElection) throw new Error("Failed to create election");
  return newElection;
};

// -------------------------------
// 2. Get all elections
// -------------------------------
export const getAllElectionsService = async (): Promise<TselectElection[]> => {
  return await db.query.elections.findMany({
    orderBy: [desc(elections.startDate)],
  });
};

export const getElectionByIdService = async (id: string) => {
  return await db.query.elections.findFirst({ 
    where: eq(elections.id, id),
    // Use 'with' to fetch related data defined in electionsRelations
    with: {
      positions: true,
      candidates: true,
    }
  });
};
// -------------------------------
// 4. Update an election
// -------------------------------
export const updateElectionService = async (
  id: string,
  updates: Partial<TinsertElection>
): Promise<TselectElection | null> => {
  const [updatedElection] = await db.update(elections)
    .set(updates)
    .where(eq(elections.id, id))
    .returning();

  return updatedElection ?? null;
};

// -------------------------------
// 5. Change election status explicitly
// -------------------------------
export const changeElectionStatusService = async (
  id: string,
  status: ElectionStatus
): Promise<TselectElection | null> => {
  const [updatedElection] = await db.update(elections)
    .set({ status })
    .where(eq(elections.id, id))
    .returning();

  return updatedElection ?? null;
};

// -------------------------------
// 6. Auto-update status based on Date
// -------------------------------
export const autoUpdateElectionStatusService = async (): Promise<void> => {
  const now = new Date();
  const allElections = await db.query.elections.findMany();

  for (const election of allElections) {
    // Skip logic if election was manually cancelled
    if (election.status === 'cancelled') continue;

    let newStatus: ElectionStatus = election.status as ElectionStatus;
    const start = new Date(election.startDate);
    const end = new Date(election.endDate);

    if (now < start) {
      newStatus = "upcoming";
    } else if (now >= start && now <= end) {
      newStatus = "voting"; // Matches your 'voting' enum value
    } else if (now > end) {
      newStatus = "completed"; // Matches your 'completed' enum value
    }

    if (newStatus !== election.status) {
      await db.update(elections)
        .set({ status: newStatus })
        .where(eq(elections.id, election.id));
    }
  }
};
// -------------------------------
// 6. Delete an election
// -------------------------------
export const deleteElectionService = async (id: string): Promise<string> => {
  try {
    // We use returning() to check if a row was actually deleted
    const [deletedElection] = await db.delete(elections)
      .where(eq(elections.id, id))
      .returning();

    if (!deletedElection) {
      throw new Error("Election not found");
    }

    return "Election deleted successfully";
  } catch (error: any) {
    throw new Error(error.message || "Failed to delete election");
  }
};