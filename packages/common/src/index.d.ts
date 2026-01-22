import { z } from "zod";
export declare const User: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    email: z.ZodEmail;
    password: z.ZodString;
    id: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const Doc: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    title: z.ZodString;
    elements: z.ZodOptional<z.ZodJSONSchema>;
    collaborators: z.ZodOptional<z.ZodArray<z.ZodString>>;
    createdAt: z.ZodOptional<z.ZodString>;
    updatedAt: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type UserType = z.infer<typeof User>;
export type Shape = {
    id: number;
    type: "rect";
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
    fillColor?: string;
    strokeWidth?: number;
    opacity?: number;
} | {
    id: number;
    type: "circle";
    centerX: number;
    centerY: number;
    radius: number;
    color: string;
    fillColor?: string;
    strokeWidth?: number;
    opacity?: number;
} | {
    id: number;
    type: "line";
    sx: number;
    sy: number;
    ex: number;
    ey: number;
    color: string;
    strokeWidth?: number;
    opacity?: number;
} | {
    id: number;
    type: "ellipse";
    centerX: number;
    centerY: number;
    rx: number;
    ry: number;
    color: string;
    fillColor?: string;
    strokeWidth?: number;
    opacity?: number;
} | {
    id: number;
    type: "delete";
    color?: string;
} | {
    id: number;
    type: "arrow";
    sx: number;
    sy: number;
    ex: number;
    ey: number;
    color: string;
    strokeWidth?: number;
    opacity?: number;
} | {
    type: "freehand";
    points: {
        x: number;
        y: number;
    }[];
    color: string;
    strokeWidth?: number;
    opacity?: number;
    id: number;
} | {
    type: "text";
    x: number;
    y: number;
    width: number;
    height: number;
    text: string[];
    fontSize: number;
    color: string;
    strokeWidth?: number;
    opacity?: number;
    id: number;
};
//# sourceMappingURL=index.d.ts.map