import { JWT_SECRET } from "@repo/backend-common/config";
import { UserType } from "@repo/common/types";
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface authRequest extends Request {
    user?: Omit<UserType, "password">;
}

export const authMiddleware = (req: authRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    console.log("authHeader: ", authHeader);
    

    if(!authHeader) {
        res.status(401).json({ "msg": "No token provided" });
        return;
    }

    try {
        const token = authHeader.split(" ")[1];
        console.log("token: ", token);
        
    
        if(!token) {
            res.status(401).json({ "msg": "No token provided" });
            return;
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded as Omit<UserType, "password">;

        next();
    } catch (error) {
        console.log(error);
        res.status(401).json({ "msg": "Invalid token" });
    }
}