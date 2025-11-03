import { Request, Response, Router } from "express";
import { prismaClient } from "@repo/db/client";
import { authMiddleware, authRequest } from "../middlewares/auth.middleware.js";
import { Doc, User, UserType } from "@repo/common/types";

export const documentRouter: Router = Router();

type userType = Omit<UserType, "password">;

documentRouter.post("/create", authMiddleware, async (req: authRequest, res: Response) => {
    try {
        
        if(!req.user) {
            return res.status(401).json({ msg: "Unauthorized" });
        }

        console.log(req.body);
        
        const document = Doc.safeParse(req.body);

        if(!document.success) {
            return res.status(400).json({ msg: document.error.message });
        }

        const user = req.user as userType;
        console.log(user);

        const newDocument = await prismaClient.document.create({
            data: {
                title: document.data.title,
                ownerId: user.id!,
                elements: document.data.elements || [],
                collaborators: {
                    connect: document.data.collaborators?.map((email: string) => ({ email })) || []
                }
            }
        });

        console.log(newDocument);

        return res.json({msg: `${newDocument.title} created successfully`});

    } catch (error) {
        console.log(error);
        return res.status(500).json({ msg: "Server error" });
    }
});

documentRouter.get("/all", authMiddleware, async (req: authRequest, res: Response) => {
    try {
        if(!req.user) {
            return res.status(401).json({ msg: "Unauthorized" });
        }

        const user = req.user as userType;
        console.log(user);

        const doc = await prismaClient.document.findMany({
            where: {
                OR: [
                    { ownerId: user.id! },
                    { collaborators: { some: { id: user.id! } } }
                ]
            },
            include: {
                owner: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatarUrl: true
                    }
                },
                collaborators: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatarUrl: true
                    }
                }
            }
        })

        return res.json(doc);
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ msg: "Server error" });
    }
});

documentRouter.get("/:id", authMiddleware, async (req: authRequest, res: Response) => {
    try {
        if(!req.user) {
            return res.status(401).json({ msg: "Unauthorized" });
        }

        const user = req.user as userType;
        const documentId = req.params.id;

        console.log(user);

        const document = await prismaClient.document.findFirst({
            where: {
                id: documentId,
                OR: [
                    { ownerId: user.id! },
                    { collaborators: { some: { id: user.id! } } }
                ]
            },
            include: {
                owner: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatarUrl: true
                    }
                },
                collaborators: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatarUrl: true
                    }
                },
                messageList: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                avatarUrl: true
                            }
                        }
                    },
                    orderBy: {
                        id: 'asc'
                    }
                }
            }
        });

        console.log(document);

        if(!document) {
            return res.status(404).json({ msg: "Document not found" });
        }

        return res.json(document);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ msg: "Server error" });
    }
});

documentRouter.delete("/:id", authMiddleware, async (req: authRequest, res: Response) => {
    try {
        if(!req.user) {
            return res.status(401).json({ msg: "Unauthorized" });
        }

        const user = req.user as userType;
        const documentId = req.params.id;

        const document = await prismaClient.document.findUnique({
            where: { id: documentId }
        });

        if(!document) {
            return res.status(404).json({ msg: "Document not found" });
        }

        if(document.ownerId !== user.id) {
            return res.status(403).json({ msg: "Forbidden" });
        }

        await prismaClient.document.delete({
            where: { id: documentId }
        });

        return res.json({ msg: "Document deleted successfully" });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ msg: "Server error" });
    }
});

documentRouter.post("/update", authMiddleware, async (req: authRequest, res: Response) => {
    try {
        if(!req.user) {
            return res.status(401).json({ msg: "Unauthorized" });
        }

        const user = req.user as userType;
        const document = Doc.safeParse(req.body);

        if(!document.success) {
            return res.status(400).json({ msg: document.error.message });
        }

        const existingDocument = await prismaClient.document.findUnique({
            where: { id: document.data.id },
            include: { collaborators: true }
        });

        if(!existingDocument) {
            return res.status(404).json({ msg: "Document not found" });
        }

        if(existingDocument.ownerId !== user.id && !existingDocument.collaborators.some((collab: { email:string }) => collab.email === user.email)) {
            return res.status(403).json({ msg: "Forbidden" });
        }

        const data = await prismaClient.document.update({
            where: { id: document.data.id },
            data: {
                title: document.data.title,
                elements: document.data.elements || {},
                collaborators: {
                    set: [],
                    connect: document.data.collaborators?.map((email: string) => ({ email })) || []
                }
            }
        });

        res.json(data);

    } catch (err) {
        console.log(err);
        res.status(500).json({ msg: "Server error" });
    }
});

documentRouter.post("/:id/save", authMiddleware, async (req: authRequest, res: Response) => {
    try {
        if(!req.user) {
            return res.status(401).json({ msg: "Unauthorized" });
        }

        const user = req.user as userType;
        const documentId = req.params.id;
        const { elements } = req.body;

        if(typeof elements !== 'object') {
            return res.status(400).json({ msg: "Invalid elements data" });
        }

        const existingDocument = await prismaClient.document.findUnique({
            where: { id: documentId },
            include: { collaborators: true }
        });

        if(!existingDocument) {
            return res.status(404).json({ msg: "Document not found" });
        }

        if(existingDocument.ownerId !== user.id && !existingDocument.collaborators.some((collab: { email:string }) => collab.email === user.email)) {
            return res.status(403).json({ msg: "Forbidden" });
        }

        const updatedDocument = await prismaClient.document.update({
            where: { id: documentId },
            data: { elements }
        });

        return res.json(updatedDocument);

    } catch (error) {
        console.log(error);
        return res.status(500).json({ msg: "Server error" });
    }
});