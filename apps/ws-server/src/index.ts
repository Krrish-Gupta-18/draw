import { JwtPayload } from "jsonwebtoken";
import { WebSocketServer } from "ws";
import jwt from "jsonwebtoken";

const wss = new WebSocketServer({ port: 8000 });

const check = (url: string | undefined) => {
    try {
        if(!url) return null;
        const params = new URLSearchParams(url?.split("?")[1]);
        const token = params.get("token");
        const decode = jwt.verify(token as string, "");

        if(typeof decode == "string") {
            return null
        }

        if(!decode || !decode.userId) {
            return null;
        }

        return decode.userId
    } catch (err) {
        return null
    }
}

interface User {
    userId: string;
    name: string;
    ws: WebSocket
    room: string
}

const users: User[] = [];

wss.on("connection", (ws, req) => {
    const url = req.url;
    const userId = check(url)

    if(!userId) {
        ws.close()
        return
    }

    ws.on("message", (data) => {
        let payloadData;
        if(typeof data !== "string") {
            payloadData = JSON.parse(data.toString())
        }
        else {
            payloadData = JSON.parse(data)
        }

        if (payloadData.type == "join") {
            
        }
    })
})