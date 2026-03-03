import express, { Application, Response } from 'express';
import dotenv from 'dotenv';
import cors from "cors";
import helmet from "helmet";
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

// --- CORS CONFIGURATION ---
const allowedOrigins = [
    'https://luvotingapp.netlify.app', 
    'http://localhost:5000',
    'http://localhost:5173'
];

const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (like Postman or mobile apps)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            // Log for debugging on Render logs
            console.error(`CORS Error: Origin ${origin} not allowed`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
    optionsSuccessStatus: 200 // Some legacy browsers choke on 204
};

// --- MIDDLEWARE STACK ---
// 1. CORS first to handle Preflight (OPTIONS) requests immediately
app.use(cors(corsOptions)); 

// 2. Helmet next, but we ensure it doesn't break our Cross-Origin needs
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Default route
app.get('/', (req, res: Response) => {
    res.send("CISLU App is running");
});

// Routes
app.use('/api/auth', AuthRouter); // Note: Removed trailing slashes for consistency
app.use('/api/votes', VotesRouter);
app.use('/api/users', UsersRouter);
app.use('/api/voter-history', VoterHistoryRouter);
app.use('/api/elections', ElectionRouter);
app.use('/api/candidates', CandidatesRouter);
app.use('/api/positions', PositionsRouter);
app.use('/api/candidate-applications', CandidateApplicationsRouter);

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: "Route not found" });
});

export default app;