import crypto from "crypto";
import db from "../../drizzle/db";
import { blockchain, BlockInsert, VoteSelect } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

// ---------------------------------------------
// SHA256 helper
// ---------------------------------------------
export const computeHash = (data: string): string => {
  return crypto.createHash("sha256").update(data).digest("hex");
};

// ---------------------------------------------
// Fetch the last block for a specific election
// ---------------------------------------------
export const getLastBlock = async (election_id: string) => {
  return db.query.blockchain.findFirst({
    where: eq(blockchain.election_id, election_id),
    orderBy: [desc(blockchain.index)],
  });
};

// ---------------------------------------------
// Create blockchain block from vote
// ---------------------------------------------
export const createBlockFromVote = async (vote: VoteSelect) => {
  // 1️⃣ Get previous block
  const lastBlock = await getLastBlock(vote.election_id);

  const index = lastBlock ? lastBlock.index + 1 : 1;
  const previous_hash = lastBlock ? lastBlock.hash : "0";

  // 2️⃣ Hash voter (anonymization)
  const voterHash = computeHash(vote.voter_id);

  // 3️⃣ Hash the entire block payload
  const blockHash = computeHash(
    `${index}${voterHash}${vote.candidate_id}${vote.position_id}${vote.election_id}${previous_hash}${vote.timestamp}`
  );

  // 4️⃣ Prepare block
  const newBlock: BlockInsert = {
    index,
    voter_hash: voterHash,
    candidate_id: vote.candidate_id,
    position_id: vote.position_id,
    election_id: vote.election_id,
    previous_hash,
    hash: blockHash,
    timestamp: vote.timestamp, // assuming your schema has timestamp
  };

  // 5️⃣ Insert block
  const [insertedBlock] = await db
    .insert(blockchain)
    .values(newBlock)
    .returning();

  return insertedBlock;
};
