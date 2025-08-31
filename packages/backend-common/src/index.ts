import { env } from "process";

export const JWT_SECRET = env.JWT_SECRET || "secret09e2321";
export const BACKEND_PORT = env.BACKEND_PORT || 3001