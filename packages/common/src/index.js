"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Doc = exports.User = void 0;
const zod_1 = require("zod");
exports.User = zod_1.z.object({
    name: zod_1.z.string().optional(),
    email: zod_1.z.email(),
    password: zod_1.z.string(),
    id: zod_1.z.string().optional()
});
exports.Doc = zod_1.z.object({
    id: zod_1.z.string().optional(),
    title: zod_1.z.string(),
    elements: zod_1.z.json().optional(),
    collaborators: zod_1.z.array(zod_1.z.string()).optional(),
    createdAt: zod_1.z.string().optional(),
    updatedAt: zod_1.z.string().optional()
});
