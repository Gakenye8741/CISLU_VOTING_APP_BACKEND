import { z } from "zod";

export const castVoteSchema = z.object({
  // The User ID (often named 'id' in your service logic)
  id: z.string().uuid({ message: "Invalid Voter ID format" }),
  
  electionId: z.string().uuid({ message: "Invalid Election ID" }),
  
  positionId: z.string().uuid({ message: "Invalid Position ID" }),
  
  candidateId: z.string().uuid({ message: "Invalid Candidate ID" }),

  // Strictly matches your pgEnum('year_of_study', ['1', '2', '3', '4'])
  voterYearGroup: z.enum(['1', '2', '3', '4'], {
    errorMap: () => ({ message: "Year of study must be 1, 2, 3, or 4" }),
  })
});

export type CastVoteInput = z.infer<typeof castVoteSchema>;