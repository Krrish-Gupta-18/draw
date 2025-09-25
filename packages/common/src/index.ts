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
    color: string,
    fillColor?: string,
    strokeWidth?: number,
    opacity?: number
} | {
    id: number,
    type: "circle",
    centerX: number,
    centerY: number,
    radius: number,
    color: string,
    fillColor?: string,
    strokeWidth?: number,
    opacity?: number
} | {
    id: number,
    type: "line",
    sx: number,
    sy: number,
    ex: number,
    ey: number,
    color: string,
    strokeWidth?: number,
    opacity?: number
} | {
    id: number,
    type: "ellipse",
    centerX: number,
    centerY: number,
    rx: number,
    ry: number,
    color: string,
    fillColor?: string,
    strokeWidth?: number,
    opacity?: number
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
    color: string,
    strokeWidth?: number,
    opacity?: number
} | {
    type: "freehand",
    points: {x: number, y: number}[],
    color: string,
    strokeWidth?: number,
    opacity?: number,
    id: number,
} | {
    type: "text",
    x: number,
    y: number,
    width: number,
    height: number,
    text: string[],
    fontSize: number,
    color: string,
    strokeWidth?: number,
    opacity?: number,
    id: number,
}