import express, {Request, Response} from "express";
import {BACKEND_PORT} from "@repo/backend-common/config";
import authRouter from "./routes/auth.js";
import { documentRouter } from "./routes/document.js";
import cors from "cors";
const app = express();

app.use(cors())
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/auth", authRouter);
app.use("/document", documentRouter);

app.listen(BACKEND_PORT, () => {
    console.log(`Server Started at localhost ${BACKEND_PORT}`);
});