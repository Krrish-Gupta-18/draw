"use client"

import Board from "../draw/Game";
import { use, useEffect, useLayoutEffect, useRef, useState } from "react"
import { Shape } from "../draw/Game";
import { handelSave } from "../utils/save";
import { useAuth } from "../app/context/useAuth";

var dirty = false;

// const CursorsLayer = ({ viewportTransform, canvas }: { viewportTransform: any, canvas: HTMLCanvasElement }) => {
//     const { user, refetch } = useAuth();
//     const cursorCanvasRef = useRef<HTMLCanvasElement>(null);
//     const viewportRef = useRef(viewportTransform);

//     console.log(viewportRef);
    

//     if (!user) return;
    
//     const cursorCanvas = document.createElement('canvas');
//     document.body.appendChild(cursorCanvas);
//     cursorCanvas.width = window.innerWidth;
//     cursorCanvas.height = window.innerHeight;
//     cursorCanvas.style.position = 'absolute';
//     cursorCanvas.style.top = '0';
//     cursorCanvas.style.left = '0';
//     cursorCanvas.style.pointerEvents = 'none';
//     cursorCanvas.style.zIndex = '1000';
//     const cursorCtx = cursorCanvas.getContext('2d')!;
    
//     cursorCanvasRef.current = cursorCanvas;
//     // Function to draw cursors
//     function drawCursors(cursors: any) {
//         if(!cursorCanvasRef.current) return;
        
//         cursorCtx.setTransform(1, 0, 0, 1, 0, 0);
//         cursorCtx.clearRect(0, 0, cursorCanvas.width, cursorCanvas.height);
//         // cursorCtx.fillStyle = "rgba(255, 255, 255)";

//         cursorCtx.setTransform(
//             viewportRef.current.scale,
//             0,
//             0,
//             viewportRef.current.scale,
//             viewportRef.current.x,
//             viewportRef.current.y
//         )

//         cursorCtx.clearRect(0, 0, cursorCanvas.width, cursorCanvas.height); // clear previous frame
//         Object.keys(cursors).forEach(id => {
//             const cursor = cursors[id];
//             let rect = canvas.getBoundingClientRect();
//             let x = (cursor.x - rect.left - viewportTransform.x) / viewportTransform.scale;
//             let y = (cursor.y - rect.top - viewportTransform.y) / viewportTransform.scale;

//             if (cursor) {
//                 cursorCtx.beginPath();
//                 cursorCtx.arc(cursor.x, cursor.y, 5, 0, 2 * Math.PI);
//                 cursorCtx.fillStyle = cursor.color || 'red';
//                 cursorCtx.fill();
//                 cursorCtx.font = '12px Arial';
//                 cursorCtx.fillText(cursor.name || 'User', cursor.x + 8, cursor.y - 8);
//             }
//         });

//     }
    
//     useEffect(() => {
//         viewportRef.current = viewportTransform;
//         console.log(viewportTransform);
//     }, [viewportTransform]);

//     // The render loop
//     function render() {
//         if (!dirty) {
//             // nothing changed → skip expensive work
//             requestAnimationFrame(render);
//             return;
//         }
    
//         // Redraw cursors only if dirty
//         drawCursors(cursors);
    
//         dirty = false; // reset flag until next change
//         requestAnimationFrame(render);
//     }
    
//     render();

//     return null;
// };

const cursorImages: Record<string, HTMLImageElement> = {};

async function getCursorImage(id: string, color: string) {
  
    if (cursorImages[id]) {
        return cursorImages[id];
    }
    // const data = await fetch(`${process.env.NEXT_PUBLIC_FRONTEND_URL}/api/cursor?=${color}`).then(res => res.json());

    const url = `${process.env.NEXT_PUBLIC_FRONTEND_URL}/api/cursor?=${color}`;

    cursorImages[id] = new Image();
    cursorImages[id].src = url;

    return cursorImages[id];
}

const CursorsLayer = ({ viewportTransform, cursors }: { viewportTransform: any, cursors: any }) => {
    const { user } = useAuth();
    const cursorCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const viewportRef = useRef(viewportTransform);

    useEffect(() => {
        if (!user) return;

        // Create canvas only once
        const cursorCanvas = document.createElement('canvas');
        cursorCanvas.width = window.innerWidth;
        cursorCanvas.height = window.innerHeight;
        cursorCanvas.style.position = 'absolute';
        cursorCanvas.style.top = '0';
        cursorCanvas.style.left = '0';
        cursorCanvas.style.pointerEvents = 'none';
        cursorCanvas.style.zIndex = '1000';
        document.body.appendChild(cursorCanvas);

        cursorCanvasRef.current = cursorCanvas;
        const ctx = cursorCanvas.getContext('2d')!;

        // Animation loop
        let animationFrameId: number;
        const renderLoop = () => {
            if (!cursorCanvasRef.current) return;

            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, cursorCanvas.width, cursorCanvas.height);

            ctx.setTransform(
                viewportRef.current.scale,
                0,
                0,
                viewportRef.current.scale,
                viewportRef.current.x,
                viewportRef.current.y
            );

            // draw cursors here using latest viewportRef.current
            Object.keys(cursors).forEach(async (id) => {
                const cursor = cursors[id];
                if (!cursor) return;
                ctx.beginPath();
                var img = await getCursorImage(id, cursor.color);
                ctx.drawImage(img, cursor.x, cursor.y);
                ctx.fill();
                ctx.font = '12px Arial';
                ctx.fillText(cursor.name || 'User', cursor.x + 8, cursor.y + 35);
            });

            animationFrameId = requestAnimationFrame(renderLoop);
        };

        renderLoop();

        const handleResize = () => {
            cursorCanvas.width = window.innerWidth;
            cursorCanvas.height = window.innerHeight;
        };

        window.addEventListener('resize', handleResize);

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', handleResize);
            document.body.removeChild(cursorCanvas);
        };
    }, [user]);

    // keep viewportRef updated
    useEffect(() => {
        viewportRef.current = viewportTransform;
    }, [viewportTransform]);

    return null;
};


export default function Canvas({ roomId, socket }: { roomId?: string, socket: WebSocket }) {
    const can = useRef<HTMLCanvasElement>(null);
    const cursors = useRef<{[id: string]:{ color?: string; name?: string; x: number; y: number;}}>({});
    const [game, setGame] = useState<Board>();
    const [zoom, setZoom] = useState<number>(100);
    const [elements, setElements] = useState<Shape[] | null>(null);

    useEffect(() => {
        if(!localStorage.getItem('token')) {
            window.location.href = '/log-in';
        }
        const fetchData = async () => {
            const elements = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/document/${roomId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            const elementsData = await elements.json();
            
            if(elementsData) {
                setElements(elementsData.elements as Shape[] || null);
            }
        }

        fetchData();

    }, []);
    
    useEffect(() => {
        if (can.current) {
            setGame(new Board(can.current, 1, setZoom, roomId as string, socket, elements));
            
            return () => {
                game?.destroy();
            }
        }
    }, [elements])

    useEffect(() => {
        socket.onmessage = (message) => {
            const data = JSON.parse(message.data);
            
            if (data.type === 'mousePos') {
                dirty = true;
                
                cursors.current[data.id] = {
                    x: data.x,
                    y: data.y,
                    color: data.color,
                    name: data.name
                }
                // console.log(data.color);
            }

            if(data.type == "moveShapes") {
                if(!game) return;
                for (let i = 0; i < data.shapes.length; i++) {
                    const shape = data.shapes[i];
                    game.moveShape(shape);
                }
            }
        }
    }, [game]) // Add game as dependency

    return (
        <>
            {game && <CursorsLayer viewportTransform={game?.viewportTransform} cursors={cursors.current!}/>}
            <div className="fixed left-[50%] z-100 flex rounded-2xl shadow-(--shadow-island) translate-x-[-50%] mt-[20px] p-[10px] bg-[white]">
                <div id="move" className="btn">
                    <input className="nav-check" type="radio" name="shape" value="move" onChange={(e) => game?.setCurrShape(e.target.value)}/>
                    <span></span>
                    <svg aria-hidden="true" focusable="false" role="img" viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><g strokeWidth="1.25"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M8 13v-7.5a1.5 1.5 0 0 1 3 0v6.5"></path><path d="M11 5.5v-2a1.5 1.5 0 1 1 3 0v8.5"></path><path d="M14 5.5a1.5 1.5 0 0 1 3 0v6.5"></path><path d="M17 7.5a1.5 1.5 0 0 1 3 0v8.5a6 6 0 0 1 -6 6h-2h.208a6 6 0 0 1 -5.012 -2.7a69.74 69.74 0 0 1 -.196 -.3c-.312 -.479 -1.407 -2.388 -3.286 -5.728a1.5 1.5 0 0 1 .536 -2.022a1.867 1.867 0 0 1 2.28 .28l1.47 1.47"></path></g></svg>
                </div>

                <div className="btn">
                    <input className="nav-check" type="radio" name="shape" value="drag" onChange={(e) => game?.setCurrShape(e.target.value)}/>
                    <span></span>
                    <svg aria-hidden="true" focusable="false" role="img" viewBox="0 0 22 22" fill="none" strokeWidth="1.25"><g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M6 6l4.153 11.793a0.365 .365 0 0 0 .331 .207a0.366 .366 0 0 0 .332 -.207l2.184 -4.793l4.787 -1.994a0.355 .355 0 0 0 .213 -.323a0.355 .355 0 0 0 -.213 -.323l-11.787 -4.36z"></path><path d="M13.5 13.5l4.5 4.5"></path></g></svg>
                </div>

                <div id="rect" className="btn">
                    <input className="nav-check" type="radio" name="shape" value="rect" onChange={(e) => game?.setCurrShape(e.target.value)}/>
                    <span></span>
                    <svg aria-hidden="true" focusable="false" role="img" viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><g strokeWidth="1.5"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><rect x="4" y="4" width="16" height="16" rx="2"></rect></g></svg>
                </div>

                <div id="line" className="btn">
                    <input className="nav-check" type="radio" name="shape" value="line" onChange={(e) => game?.setCurrShape(e.target.value)}/>
                    <span></span>
                    <svg aria-hidden="true" focusable="false" role="img" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M4.167 10h11.666" strokeWidth="1.5"></path></svg>
                </div>

                <div id="circle" className="btn">
                    <input className="nav-check" type="radio" name="shape" value="circle" onChange={(e) => game?.setCurrShape(e.target.value)}/>
                    <span></span>
                    <svg aria-hidden="true" focusable="false" role="img" viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><g strokeWidth="1.5"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><circle cx="12" cy="12" r="9"></circle></g></svg>
                </div>

                <div id="ellipse" className="btn">
                    <input className="nav-check" type="radio" name="shape" value="ellipse" onChange={(e) => game?.setCurrShape(e.target.value)}/>
                    <span></span>
                    <svg aria-hidden="true" focusable="false" role="img" viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><g strokeWidth="1.5"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><ellipse cx="12" cy="12" ry="7" rx="10"></ellipse></g></svg>
                </div>

                <div id="arrow" className="btn">
                    <input className="nav-check" type="radio" name="shape" value="arrow" onChange={(e) => game?.setCurrShape(e.target.value)}/>
                    <span></span>
                    <svg aria-hidden="true" focusable="false" role="img" viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><g strokeWidth="1.5"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><line x1="5" y1="12" x2="19" y2="12"></line><line x1="15" y1="16" x2="19" y2="12"></line><line x1="15" y1="8" x2="19" y2="12"></line></g></svg>
                </div>

                <div id="freehand" className="btn">
                    <input className="nav-check" type="radio" name="shape" value="freehand" onChange={(e) => game?.setCurrShape(e.target.value)}/>
                    <span></span>
                    <svg aria-hidden="true" focusable="false" role="img" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><g strokeWidth="1.25"><path clipRule="evenodd" d="m7.643 15.69 7.774-7.773a2.357 2.357 0 1 0-3.334-3.334L4.31 12.357a3.333 3.333 0 0 0-.977 2.357v1.953h1.953c.884 0 1.732-.352 2.357-.977Z"></path><path d="m11.25 5.417 3.333 3.333"></path></g></svg>
                </div>

                <div id="text" className="btn">
                    <input className="nav-check" type="radio" name="shape" value="text" onChange={(e) => game?.setCurrShape(e.target.value)}/>
                    <span></span>
                    <svg aria-hidden="true" focusable="false" role="img" viewBox="0 0 24 24" className="" fill="none" strokeWidth="2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><g strokeWidth="1.5"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><line x1="4" y1="20" x2="7" y2="20"></line><line x1="14" y1="20" x2="21" y2="20"></line><line x1="6.9" y1="15" x2="13.8" y2="15"></line><line x1="10.2" y1="6.3" x2="16" y2="20"></line><polyline points="5 20 11 4 13 4 20 20"></polyline></g></svg>
                </div>

                <div className="w-[1px] h-[1.4rem] mt-[0.2rem] ml-0.5 mr-0.5 bg-gray-300"></div>

                <div id="delete" className="btn" onClick={(e) => game?.delete()}>
                    <span></span>
                    <svg aria-hidden="true" focusable="false" role="img" viewBox="0 0 20 20" className="" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path strokeWidth="1.25" d="M3.333 5.833h13.334M8.333 9.167v5M11.667 9.167v5M4.167 5.833l.833 10c0 .92.746 1.667 1.667 1.667h6.666c.92 0 1.667-.746 1.667-1.667l.833-10M7.5 5.833v-2.5c0-.46.373-.833.833-.833h3.334c.46 0 .833.373.833.833v2.5"></path></svg>
                </div>
            </div>

            <div className="fixed bottom-[20px] left-[20px] z-100 flex mt-[20px]">
                <div className="bg-[white] flex content-center rounded-2xl shadow-(--shadow-island) p-[5px]">
                    <div className="btn" onClick={e => {game?.scale(0.1)}}>
                        <svg aria-hidden="true" focusable="false" role="img" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path strokeWidth="1.25" d="M10 4.167v11.666M4.167 10h11.666"></path></svg>
                    </div>

                    <span className="m-[4px]">{Math.round(zoom)}%</span>

                    <div className="btn" onClick={e => {game?.scale(-0.1)}}>
                        <svg aria-hidden="true" focusable="false" role="img" viewBox="0 0 20 20"  fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M5 10h10" strokeWidth="1.25"></path></svg>
                    </div>
                </div>

                <div className="bg-[white] flex content-center rounded-2xl shadow-(--shadow-island) ml-[10px] p-[5px]">
                    <div id="undo" className="btn" onClick={e => game?.undo()}>
                        <svg aria-hidden="true" focusable="false" role="img" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M7.5 10.833 4.167 7.5 7.5 4.167M4.167 7.5h9.166a3.333 3.333 0 0 1 0 6.667H12.5" strokeWidth="1.25"></path></svg>
                    </div>

                    <div id="redo" className="btn" onClick={e => game?.redo()}>
                        <svg aria-hidden="true" focusable="false" role="img" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M12.5 10.833 15.833 7.5 12.5 4.167M15.833 7.5H6.667a3.333 3.333 0 1 0 0 6.667H7.5" strokeWidth="1.25"></path></svg>
                    </div>
                </div>         
            </div>

            <div className="w-[100vw] h-[100vh]">
                <canvas ref={can} className=""></canvas>
            </div>
        </>
    )
}