"use client"
import { useParams } from "next/navigation";
import Canvas from "../../../components/Canvas";
// import Room from "../../../components/Room";

export default function Doc() {
    const params = useParams();
    const { roomId } = params;
    
    return(
        <>
            <Canvas roomId={roomId as string}/>
        </>
    )
}