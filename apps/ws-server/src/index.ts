import { WebSocketServer, WebSocket } from "ws";
// import { UserType } from "@repo/common/types";
import { JWT_SECRET } from "@repo/backend-common/config"
import { prismaClient as db } from "@repo/db/client";
import jwt from "jsonwebtoken";

const wss = new WebSocketServer({ 
    port: 8000,
});

const check = (token: string) => {
    try {
        const decode = jwt.verify(token as string, JWT_SECRET);
        
        
        if(typeof decode == "string") {
            return null;
        }
        
        if(!decode || !decode.id) {
            return null;
        }
        
        return {id: decode.id, name: decode.name, email: decode.email};
    } catch (err) {
        console.log(err);
        return null
    }
}

interface User {
    userId: string;
    name: string;
    ws: WebSocket
}

const users: Set<User> = new Set();
const userToRoom = new Map<string, string>();
const rooms = new Map<string, {userAllowed:Set<string>, users:Map<string, User>}>();

function heartBeat(ws: WebSocket) {
    (ws as any).isAlive = true;
}

const broadcastToRoom = (userId: string, data: string) => {
    if(!userId) return;
    const roomId = userToRoom.get(userId);

    if(!roomId) return;
    const room = rooms.get(roomId);
    const users = room?.users;

    if(!users) return;
    users.forEach((user: User) => {
        if(user.userId === userId || user.ws.readyState !== WebSocket.OPEN ) return;
        user?.ws.send(data);
    });
}

wss.on("connection", async (ws, req) => {
    ws.on("pong", () => {heartBeat(ws)});
    
    const url = req.url;

    
    if (!url) return;
    const queryParams = new URLSearchParams(url.split('?')[1]);
    
    const token = queryParams.get('token');
    if (!token) return null;
    
    const user = check(token);

    if (user == null) {
        ws.close()
        return null;
    }

    users.add({
        userId: user.id,
        ws,
        name: user.name
    })
    
    console.log(`User ${user.name} connected`);
    
    ws.on("message", async (data) => {
        let payloadData;
        
        try {
            payloadData = typeof data === "string" ? JSON.parse(data) : JSON.parse(data.toString());
        } catch (err) {
            ws.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
            return;
        }

        if (payloadData.type == "join") {
            const room = rooms.get(payloadData.roomId)
            if(!room) {
                const roomRes = await db.document.findFirst({
                    where: {
                        id: payloadData.roomId
                    },
                    include: {
                        collaborators: true
                    }
                });

                if(!roomRes) {
                    ws.send(JSON.stringify({ type: "error", message: "Room not found" }));
                    return;
                }

                if((roomRes.collaborators.some(userAllow => userAllow.email === user.email)) || roomRes.ownerId != user.id) {
                    ws.send(JSON.stringify({ type: "error", message: "Not allowed in this room" }));
                    return;
                }

                const collaborators = new Set(roomRes.collaborators.map(collab => collab.email));

                rooms.set(roomRes?.id, { 
                    userAllowed: collaborators,
                    users: new Map([
                        [user.id, {
                            userId: user.id,
                            name: user.name,
                            ws: ws
                        }]
                    ])
                });

                userToRoom.set(user.id, roomRes.id);

                console.log(`User ${user.name} joined room ${roomRes.id}`);
                
                ws.send(JSON.stringify({ type: "joined" }));
            }

            else {
                if (!room.userAllowed.has(user.email)) {
                    ws.send(JSON.stringify({ type: "error", message: "Not allowed in this room" }));
                    return;
                }

                else {
                    room.users.set(user.id, { userId: user.id, name: user.name, ws });
                }
            }

        }

        if (payloadData.type == "message") {
            broadcastToRoom(user.id, JSON.stringify({ type: "message", message: payloadData.message, from: user.name }));
        }
    })

    ws.on("close", () => {
        users.forEach(u => {
        if (u.ws === ws) users.delete(u);
        });

        rooms.forEach(room => {
            room.users.forEach(u => {
                if (u.ws === ws) room.users.delete(u.userId);
                broadcastToRoom(u.userId, `${u.name} got disconnected...`);
            });
        });
    });
})

const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
        if((ws as any).isAlive == false) {
            return ws.terminate();
        }

        (ws as any).isAlive = false;
        ws.ping();
    })
}, 30000);

wss.on("listening", () => {
    console.log("WebSocket server started on port 8000");
});

wss.on("close", () => {
    clearInterval(interval);
});