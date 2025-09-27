import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { User, UserType } from "@repo/common/types";
import { prismaClient } from "@repo/db/client";
import { BACKEND_PORT, JWT_SECRET } from "@repo/backend-common/config";
import { authMiddleware, authRequest } from "../middlewares/auth.middleware.js";

const authRouter:Router = Router();

authRouter.post("/sign-up", async (req: Request, res: Response) => {
    try {
        const user = User.safeParse(req.body);
        // console.log(req.body, user);
        
        if(!user.success) {
            res.status(400).json({ "msg": user.error.message });
            return;
        }
        
        const newUser = await prismaClient.user.create({
            data: {
                name: user.data.name,
                email: user.data.email,
                password: user.data.password
            },
            omit: {
                password: true
            }
        });
        
        // console.log(newUser);

        const token = jwt.sign(newUser, JWT_SECRET);
        res.json({ token });

    } catch (err) {
        console.log(err);
    }
});

authRouter.post("/sign-in", async (req: Request, res: Response) => {
    try {
        
        const data = User.safeParse(req.body);

        if(!data.success) {
            res.status(400).json({ "msg": data.error.message });
            return;
        }

        const user = await prismaClient.user.findUnique({
            where: {
                email: req.body.email,
                password: req.body.password
            },
            omit: {
                password: true
            }
        });

        if(!user) {
            res.status(400).json({ "msg": "User not found" })
            return
        }

        // console.log(user);

        const token = jwt.sign(user, JWT_SECRET);
        res.json({ token });
    
    } catch (err) {
        console.log(err);
    }
});

authRouter.get("/user", authMiddleware, async (req: authRequest, res: Response) => {
    res.json(req.user);
});

export default authRouter;