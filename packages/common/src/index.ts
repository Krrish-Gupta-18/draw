import {z} from "zod";

export const User = z.object({
    name: z.string().optional(),
    email: z.email(),
    password: z.string(),
    id: z.string().optional()
});

export const Doc = z.object({
    id: z.string().optional(),
    title: z.string(),
    elements: z.json().optional(),
    collaborators: z.array(z.string()).optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

export type UserType = z.infer<typeof User>;

export type Shape = {
    id: number,
    type: "rect",
    x: number,
    y: number,
    width: number,
    height: number,
    color: string
} | {
    id: number,
    type: "circle",
    centerX: number,
    centerY: number,
    radius: number,
    color: string
} | {
    id: number,
    type: "line",
    sx: number,
    sy: number,
    ex: number,
    ey: number,
    color: string
} | {
    id: number,
    type: "ellipse",
    centerX: number,
    centerY: number,
    rx: number,
    ry: number,
    color: string
} | {
    id: number,
    type: "delete",
    color?: string,
    // selected?: boolean
} | {
    id: number,
    type: "arrow",
    sx: number,
    sy: number,
    ex: number,
    ey: number,
    color: string
} | {
    type: "freehand",
    points: {x: number, y: number}[],
    color: string
    id: number,
}