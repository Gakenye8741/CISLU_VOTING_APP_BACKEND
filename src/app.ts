import express, { Application, Response } from 'express';
import dotenv from 'dotenv';
import cors from "cors";
import helmet from "helmet"; // 1. Imported Helmet
import AuthRouter from './Auth/Auth.routes';
import UsersRouter from './services/users/users.routes';
import ElectionRouter from './services/elections/elections.route';
import PositionsRouter from './services/Positions/position.routes';
import CandidateApplicationsRouter from './services/Applications/candidateApplications.route';
import CandidatesRouter from './services/candidates/candidates.routes';
import VoterHistoryRouter from './services/Voter-History/voter-history.routes';
import VotesRouter from './services/votes/votes.route';

dotenv.config();

const app: Application = express();

// Basic Middleware
app.use(helmet()); // 2. Added Helmet at the top of the middleware stack
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


//default route
app.get('/', (req, res: Response) => {
    res.send("CISLU App is running");
});

//import route
const PORT = process.env.PORT || 3000;
app.use('/api/auth/', AuthRouter);
app.use('/api/votes/', VotesRouter);
app.use('/api/users/', UsersRouter);
app.use('/api/voter-history/', VoterHistoryRouter);
app.use('/api/elections/', ElectionRouter);
app.use('/api/candidates/', CandidatesRouter);
app.use('/api/positions/', PositionsRouter);
app.use('/api/candidate-applications', CandidateApplicationsRouter);


// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: "Route not found" });
});

export default app;