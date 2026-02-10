import { Router } from "express";
import { updateGraduationStatus } from "./graduation.controller";
import { authMiddleware } from "../../middlewares/bearAuth";

const GraduationRouter = Router();

// Only Deans and Admins can manually update
GraduationRouter.put(
  "/update/:reg_no",
  authMiddleware("any"), // we check role in controller
  updateGraduationStatus
);

export default GraduationRouter;
