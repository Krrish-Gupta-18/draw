"use client"
import { useParams } from "next/navigation";
import Canvas from "../../../components/Canvas";
import { useState, useEffect } from "react";
import Loading from "../../../components/Loading";
import { AuthProvider } from "../../context/useAuth";
// import Room from "../../../components/Room";

export default function Doc() {
    const params = useParams();
    const { roomId } = params;
    
    const [socket, setSocket] = useState<WebSocket | null>(null);

    useEffect(() => {
        const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WEB_SOCKET_URL}?token=${localStorage.getItem("token")}`);

        ws.onopen = () => {
            setSocket(ws);
            const data = JSON.stringify({
                type: "join",
                roomId
            });
            console.log(data);
            ws.send(data)

            ws.onmessage = (event) => {
                const message = JSON.parse(event.data.toString());
                console.log("Message from server ", message);
            }
        }
        
    }, [])
   
    if (!socket) {
        console.log(socket);
        return <Loading/>
    }

    return(
        <>
            <AuthProvider>
                <Canvas roomId={roomId as string} socket={socket}/>
            </AuthProvider>
        </>
    )
}