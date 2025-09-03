import { Shape } from "../draw/Game";

export const handelSave = async (id:string, elements: Shape[]) => {
    if(!elements) return;
    
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/document/${id}/save`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ elements })
    });

    const data = await res.json();

    console.log("Saving...", data);
}

export const handelDebounce = (func: (...args: any[]) => void, time:number) => {

    if ((window as any).timeoutId) {
        clearTimeout((window as any).timeoutId);
    }

    const id = setTimeout(() => {
        func();
    }, 2000);

    (window as any).timeoutId = id;
}