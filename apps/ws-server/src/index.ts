import { WebSocketServer, WebSocket } from "ws";
import { JWT_SECRET } from "@repo/backend-common/config"
import { prismaClient as db } from "@repo/db/client";
import jwt from "jsonwebtoken";
import http from "http";

const wss = new WebSocketServer({ noServer: true });
const server = http.createServer();

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
const userToRoom = new Map<string, [string]>();
const rooms = new Map<string, {userAllowed:Set<string>, users:Map<string, User>}>();

function heartBeat(ws: WebSocket) {
    (ws as any).isAlive = true;
}

const broadcastToRoom = (userId: string, data: string, roomId: string) => {
    if(!userId) return;
    const room = rooms.get(roomId);

    if(!room) return;
    const users = room?.users;

    if(!users) return;
    if(!users.get(userId)) return;
    // console.log(userId);
    
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
            const room = rooms.get(payloadData.roomId);
            // console.log(room);
            
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
                

                if(!(roomRes.collaborators.some(userAllow => userAllow.email === user.email)) && roomRes.ownerId != user.id) {
                    ws.send(JSON.stringify({ type: "error", message: "Not allowed in this room" }));
                    console.log(`User ${user.name} not allowed in room ${roomRes.id}`);
                    return;
                }

                const collaborators = new Set(roomRes.collaborators.map(collab => collab.email));
                collaborators.add((await db.user.findUnique({ where: { id: roomRes?.ownerId } }))?.email!);

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

                var prevRooms = userToRoom.get(user.id);
                if(prevRooms) prevRooms!.push(payloadData.id);
                else prevRooms = [payloadData.id];
                userToRoom.set(user.id, prevRooms!);

                console.log(`User ${user.name} joined room ${roomRes.id}`);
                
                ws.send(JSON.stringify({ type: "joined" }));
            }

            else {
                console.log(room.userAllowed, user.email, room.userAllowed.has(user.email));
                
                if (!room.userAllowed.has(user.email)) {
                    ws.send(JSON.stringify({ type: "error", message: "Not allowed in this room" }));
                    return;
                }

                else {
                    room.users.set(user.id, { userId: user.id, name: user.name, ws });
                    var prevRooms = userToRoom.get(user.id);
                    if(prevRooms) prevRooms!.push(payloadData.id);
                    else prevRooms = [payloadData.id];
                    userToRoom.set(user.id, prevRooms!);
                    ws.send(JSON.stringify({ type: "joined" }));
                }
            }
        }

        if (payloadData.type == "mousePos") {
            // console.log(user.name, userToRoom.get(user.id));
            broadcastToRoom(user.id, JSON.stringify({ type: "mousePos", x: payloadData.x, y: payloadData.y, color: payloadData.color, id: user.id , name: user.name }), payloadData.roomId);
        }

        if (payloadData.type == "moveShapes") {
            // console.log(payloadData);
            broadcastToRoom(user.id, JSON.stringify(payloadData), payloadData.roomId);
        }
    })

    ws.on("close", () => {
        users.forEach(u => {
        if (u.ws === ws) users.delete(u);
        });

        rooms.forEach(room => {
            room.users.forEach(u => {
                if (u.ws === ws) room.users.delete(u.userId);
                userToRoom.get(u.userId)?.forEach(rId => {
                    broadcastToRoom(u.userId, JSON.stringify({ type: "mousePosRemove", id: u.userId }), rId);
                }
                );
                userToRoom.delete(u.userId);
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

server.on("upgrade", (request, socket, head) => {
  const origin = request.headers.origin;
  const allowedOrigins = ["http://localhost:3000", "http://192.168.1.39:3000"];

  if (!allowedOrigins.includes(origin || "")) {
    socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
    socket.destroy();
    return;
  }

  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});

server.listen(8000, () => {
  console.log("Server listening on port 8000");
});