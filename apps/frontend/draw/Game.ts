import { text } from "node:stream/consumers"
import { handelDebounce, handelSave } from "../utils/save"

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

function getRandomColorHSL() {
  const h = Math.floor(Math.random() * 360); // Hue: 0–360
  const s = Math.floor(Math.random() * 100); // Saturation: 0–100%
  const l = Math.floor(Math.random() * 100); // Lightness: 0–100%
  return `hsl(${h}, ${s}%, ${l}%)`;
}

export default class Board {
    private ctx: CanvasRenderingContext2D;
    private can;
    public shapes: Shape[] = [];
    private isDrawing: Boolean = false;
    public viewportTransform: {x: number, y: number, scale: number} = {
        x: 0,
        y: 0,
        scale: 1
    }
    private features: string[] = ["delete", "move", "drag"];
    public currShape: string = "line";
    private startX: number = 0;
    private startY: number = 0;
    public color: string = "red";
    public isDrawingEnabled: boolean;
    public isMoving: Boolean = false;
    public isDragging: Boolean = false;
    public top: number = -1;
    public lineWidth: number;
    private setZoom: (num: number) => void;
    public selected: Shape | null = null;
    public roomId:string;
    private input: HTMLDivElement | null = null;
    private inputCoords: {x: number, y: number} = {x: 0, y: 0};
    private txt: string[] | null = null;
    private socket: WebSocket | null = null;
    private lastSend: number = 0;
    private propertyChangeCallback: ((shape: Shape | null) => void) | null = null;

    constructor(can: HTMLCanvasElement, lineWidth: number, setZoom: (num: number) => void, roomId:string, socket:WebSocket, elements?: {} | null) {
        this.isDrawingEnabled = false;
        this.socket = socket;
        this.ctx = (can).getContext("2d")!;
        this.can = can;
        this.ctx.lineWidth = lineWidth;
        this.ctx.imageSmoothingEnabled = true
        this.lineWidth = lineWidth;
        this.setZoom = setZoom;
        this.can.width = window.innerWidth;
        this.can.height = window.innerHeight;
        this.roomId = roomId;
        if(!localStorage.getItem("cursorColor")) localStorage.setItem("cursorColor", getRandomColorHSL());
        this.init();
        this.initHandler();
        if(elements) {
            this.shapes = (elements as Shape[]);
            this.top = this.shapes.length - 1;
            this.clearCanvas();
            console.log(this.shapes);
        }
    }

    init() {
        this.shapes = [];
        this.clearCanvas()
    }

    getShapes() {
        return this.shapes;
    }

    getScalePercentage() {
        return this.viewportTransform.scale * 100;
    }

    scale(factor: number) {
        // console.log("scale", factor);
        
        this.viewportTransform.scale += factor;
        this.viewportTransform.x -= factor * this.can.width / 2;
        this.viewportTransform.y -= factor * this.can.height / 2;

        this.setZoom(this.viewportTransform.scale * 100);
        this.clearCanvas();
    }

    handelWheel = (e: WheelEvent) => {
        e.preventDefault();
        if (e.ctrlKey) {
            const delta = -e.deltaY * 0.01;
            this.scale(delta * 0.1);
        }
    }


    handelText(e: PointerEvent, fontSize: number = 25) {
        if(this.input) {
            if(!this.txt) return;
            console.log(this.inputCoords);
            
            this.addText(this.txt, this.inputCoords.x, this.inputCoords.y, fontSize, this.input.clientWidth, this.input.clientHeight);
            document.body.removeChild(this.input);
            this.input = null;
            this.txt = null;
            return;
        }

        const div = document.createElement("div");
        div.contentEditable = "true";
        div.style.position = "fixed";
        div.style.top = `${e.clientY}px`;
        div.style.left = `${e.clientX}px`;
        div.style.fontSize = `${fontSize}px`;
        div.style.fontFamily = "Arial, sans-serif";
        div.style.color = this.color;
        div.style.background = "transparent";
        div.style.border = `2px solid ${this.color}`;
        div.style.outline = "none";
        div.style.zIndex = "1000";
        div.style.minWidth = "20px";
        div.style.height = `${fontSize}px`;
        div.style.lineHeight = `${fontSize}px`;
        div.style.whiteSpace = "pre";
        div.style.overflow = "hidden";
        div.style.padding = "2px";

        this.input = div;
        this.inputCoords = { x: this.startX, y: this.startY};
        document.body.appendChild(div);
        div.focus();

        const autoResize = () => {
            if (!this.input) return;
            this.input.style.height = "auto";
            this.input.style.height = this.input.scrollHeight + "px";
            this.input.scrollTop = 0;
            this.txt = this.input.innerText.split("\n");
        };

        this.input.addEventListener("input", autoResize);
    }

    addText(text: string[], x: number, y: number, fontSize: number = 20, width: number, height: number) {
        if (!text) return;
        const s: Shape = {
            id: Date.now(),
            type: "text",
            x: x ? x : this.startX,
            y: y ? y : this.startY,
            width: width ? width : 200,
            height: height ? height : fontSize + 10,
            text: text,
            fontSize: fontSize * 1.1,
            color: this.color
        }
        this.shapes[++this.top] = s;
        this.clearCanvas();
    }

    setCurrShape(shape: string) {
        this.currShape = shape;
        if (!this.features.includes(this.currShape)) {
            this.isDrawingEnabled = true;
            this.can.style.cursor = "crosshair";
        }
        else {
            if (this.currShape == "move") {
                this.can.style.cursor = "grab";
            }
            this.isDrawingEnabled = false;
        }
    }

    setPropertyChangeCallback(callback: (shape: Shape | null) => void) {
        this.propertyChangeCallback = callback;
    }

    updateShapeProperties(shapeId: number, properties: {[key: string]: any}) {
        const shapeIndex = this.shapes.findIndex(s => s.id === shapeId);
        if (shapeIndex === -1) return;

        const currentShape = this.shapes[shapeIndex];
        const updatedShape = { ...currentShape, ...properties } as Shape;
        this.shapes[shapeIndex] = updatedShape;
        
        // Broadcast the property change to other users
        if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ 
                type: "updateProperties", 
                shape: updatedShape, 
                roomId: this.roomId 
            }));
        }
        
        this.clearCanvas();
        return updatedShape;
    }

    getSelectedShape(): Shape | null {
        return this.selected;
    }

    clearCanvas() {
        
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.can.width, this.can.height);
        this.ctx.fillStyle = "rgba(255, 255, 255)";
        this.ctx.fillRect(0, 0, this.can.width, this.can.height);

        this.ctx.setTransform(
            this.viewportTransform.scale,
            0,
            0,
            this.viewportTransform.scale,
            this.viewportTransform.x,
            this.viewportTransform.y
        )

        for(var i = this.top; i >= 0; i--) {
            var ele = this.shapes[i];

            if (!ele?.type) continue

            if(ele.type == "delete") break;
            if(this.selected && this.selected.id == ele.id) {
                this.ctx.strokeStyle = "blue";
                this.ctx.lineWidth = (ele.strokeWidth || this.lineWidth) + 1;
                if (ele.type == "text") {
                    var err = 4*4;
                    this.ctx.beginPath();
                    this.ctx.rect(ele.x, ele.y, ele.width + err, ele.height + err);
                    this.ctx.stroke();
                }
            }
            else {
                this.ctx.strokeStyle = ele.color;
                this.ctx.lineWidth = ele.strokeWidth || this.lineWidth;
            }

            // Set opacity if defined
            if (ele.opacity !== undefined) {
                this.ctx.globalAlpha = ele.opacity;
            } else {
                this.ctx.globalAlpha = 1;
            }

            switch (ele.type) {
                case "rect":
                    this.ctx.beginPath();
                    this.ctx.rect(ele.x, ele.y, ele.width, ele.height);
                    if (ele.fillColor) {
                        this.ctx.fillStyle = ele.fillColor;
                        this.ctx.fill();
                    }
                    this.ctx.stroke();
                    break;
            
                case "circle":
                    this.ctx.beginPath();
                    this.ctx.arc(ele.centerX, ele.centerY, ele.radius, 0, 2*Math.PI);
                    if (ele.fillColor) {
                        this.ctx.fillStyle = ele.fillColor;
                        this.ctx.fill();
                    }
                    this.ctx.stroke();
                    this.ctx.closePath();
                    break;

                case "line":
                    this.ctx.beginPath();
                    this.ctx.moveTo(ele.sx, ele.sy);
                    this.ctx.lineTo(ele.ex, ele.ey);
                    this.ctx.stroke();
                    break;

                case "ellipse":
                    this.ctx.beginPath();
                    this.ctx.ellipse(ele.centerX, ele.centerY, ele.rx, ele.ry, 0, 0, 2 * Math.PI);
                    if (ele.fillColor) {
                        this.ctx.fillStyle = ele.fillColor;
                        this.ctx.fill();
                    }
                    this.ctx.stroke();
                    break;

                case "arrow":
                    this.arrow(ele.sx, ele.sy, ele.ex, ele.ey, this.selected?.id != ele.id ? ele.color : "blue");
                    break;

                case "freehand":
                    this.ctx.beginPath();
                    this.ctx.moveTo(ele.points[0].x, ele.points[0].y);
                    for (let j = 1; j < ele.points.length; j++) {
                        this.ctx.lineTo(ele.points[j].x, ele.points[j].y);
                    }
                    this.ctx.stroke();
                    break;

                case "text":
                    if(ele.type != "text") break;
                    const textEle = ele as Extract<Shape, {type: "text"}>;
                    this.ctx.font = `${textEle.fontSize}px sans-serif`;
                    this.ctx.fillStyle = textEle.color;
                    this.ctx.textBaseline = "top";
                    var err = 4*2;

                    ele.text.forEach((t, idx) => {
                        this.ctx.fillText(t, textEle.x, (textEle.y + err) + (textEle.fontSize * (idx)));
                    });
                    break;
            }
        }
    }

    delete() {
        this.shapes.splice(++this.top, this.shapes.length - this.top, { id: Date.now(),type: "delete" });
        this.clearCanvas();
    }

    arrow(sx: number, sy: number, ex: number, ey: number, color: string) {
        let angle = Math.atan2(ey - sy, ex - sx);

        this.ctx.beginPath();
        this.ctx.strokeStyle = color;
        this.ctx.moveTo(sx, sy);
        this.ctx.lineTo(ex, ey);
        this.ctx.lineTo(ex - 12 * Math.cos(angle - Math.PI/6), ey - 12 * Math.sin(angle - Math.PI/6));
        this.ctx.moveTo(ex, ey);
        this.ctx.lineTo(ex - 12 * Math.cos(angle + Math.PI/6), ey - 12 * Math.sin(angle + Math.PI/6));
        this.ctx.stroke();
    }

    isNearRect(x: number, y: number, r: Extract<Shape, {type: "rect"}>) {
        const err = 10;
        let top = Math.abs(y - r.y) <= err && x - err > r.x && x + err < r.x + r.width;
        let bottom = Math.abs(y - (r.y + r.height)) <= err && x - err > r.x && x + err < r.x + r.width;
        let left = Math.abs(x - r.x) <= err && y - err > r.y && y + err < r.y + r.height;
        let right = Math.abs(x - (r.x + r.width)) <= err && y - err > r.y && y + err < r.y + r.height;

        return top || bottom || left || right;
    }

    moveShape(shape: Shape) {
        const a = this.shapes.findIndex((s) => s.id == shape.id)
        if (a == -1) return;
        
        this.shapes[a] = shape;

        this.clearCanvas();
    }

    addShape(shape: Shape) { 
        this.shapes.splice(++this.top, this.shapes.length - this.top, shape);
        this.clearCanvas();
    }

    updateShapeFromRemote(shape: Shape) {
        const shapeIndex = this.shapes.findIndex(s => s.id === shape.id);
        if (shapeIndex !== -1) {
            this.shapes[shapeIndex] = shape;
            this.clearCanvas();
            
            // Update property panel if this shape is selected
            if (this.selected && this.selected.id === shape.id) {
                this.selected = shape;
                if (this.propertyChangeCallback) {
                    this.propertyChangeCallback(shape);
                }
            }
        }
    }

    mouseMove(e: PointerEvent) {
        let rect = this.can.getBoundingClientRect();
        let x = (e.clientX - rect.left - this.viewportTransform.x) / this.viewportTransform.scale;
        let y = (e.clientY - rect.top - this.viewportTransform.y) / this.viewportTransform.scale;

        const now = performance.now();
        const throttle = 30;
        
        if(this.socket?.readyState == this.socket?.OPEN && now - this.lastSend >= throttle) {
            this.socket?.send(JSON.stringify({ type: "mousePos", x, y, color: localStorage.getItem("cursorColor"), roomId: this.roomId}));
        }
        
        if (this.isMoving) {
            this.can.style.cursor = "grabbing";

            this.viewportTransform.x += e.clientX - this.startX;
            this.viewportTransform.y += e.clientY - this.startY;
            this.startX = e.clientX;
            this.startY = e.clientY;
            
            this.lastSend = now;

            this.clearCanvas();
            return;
        }
        
        
        if (this.isDrawing) {
            this.clearCanvas();
            this.ctx.beginPath();

            this.ctx.strokeStyle = this.color;

            switch (this.currShape) {
                case "rect":
                    this.ctx.beginPath();
                    this.ctx.rect(this.startX, this.startY, x - this.startX, y - this.startY);
                    this.ctx.strokeStyle = this.color;
                    this.ctx.stroke();
                    break;
            
                case "circle":
                    let r = Math.max((y - this.startY)/2, (x - this.startX)/2);
                    
                    this.ctx.beginPath();
                    this.ctx.arc(this.startX + r, this.startY + r, Math.abs(r), 0, 2*Math.PI);
                    this.ctx.strokeStyle = this.color;
                    this.ctx.stroke();
                    this.ctx.closePath();
                    break;

                case "line":
                    this.ctx.beginPath();
                    this.ctx.moveTo(this.startX, this.startY);
                    this.ctx.lineTo(x, y - this.can.offsetTop);
                    this.ctx.stroke();
                    break;

                case "ellipse":
                    this.ctx.beginPath();
                    this.ctx.ellipse(this.startX + (x - this.startX)/2, this.startY, Math.abs((x - this.startX)/2), Math.abs((y - this.startY)/2), 0, 0, 2 * Math.PI);
                    this.ctx.stroke();
                    break;

                case "arrow":
                    this.arrow(this.startX, this.startY, x - this.can.offsetLeft, y - this.can.offsetTop, this.color)
                    break;

                case "freehand":
                    this.ctx.beginPath();
                    this.ctx.moveTo(this.startX, this.startY);
                    this.ctx.lineTo(x, y);
                    this.ctx.stroke();
                    this.startX = x;
                    this.startY = y;
                    if(!this.shapes[this.top]) {
                        this.shapes[this.top] = {id: Date.now(), type: "freehand", points: [{x: this.startX, y: this.startY}], color: this.color};
                        
                    } else {
                        (this.shapes[this.top] as Extract<Shape, {type: "freehand"}>).points.push({x: this.startX, y: this.startY});
                    }
                    this.clearCanvas();
                    break;
            }
        }

        if (this.isDragging) {
            let rect = this.can.getBoundingClientRect();
            let ex = (e.clientX - rect.left - this.viewportTransform.x) / this.viewportTransform.scale;
            let ey = (e.clientY - rect.top - this.viewportTransform.y) / this.viewportTransform.scale;
            if(!this.selected) return;

            this.socket?.send(JSON.stringify({ type: "moveShapes", shapes: [this.selected], ex, ey, roomId: this.roomId}))
            this.lastSend = performance.now();

            let x = ex - this.startX;
            let y = ey - this.startY;


            switch (this.selected.type) {
                case "rect":
                    this.selected.x += x 
                    this.selected.y += y 
                    break;
                case "circle":
                    this.selected.centerX += x;
                    this.selected.centerY += y;
                    break;
                case "ellipse":
                    this.selected.centerX += x;
                    this.selected.centerY += y;
                    break;
                case "line":
                    this.selected.sx += x;
                    this.selected.sy += y;
                    this.selected.ex += x;
                    this.selected.ey += y;
                    break;
                case "arrow":
                    case "line":
                    this.selected.sx += x;
                    this.selected.sy += y;
                    this.selected.ex += x;
                    this.selected.ey += y;
                    break;
                case "freehand":
                    let a: {x:number, y:number}[] = this.selected.points!;

                    for (let i = 0; i < a.length; i++) {
                        const pt = a[i];
                        pt.x += x;
                        pt.y += y;
                    }
                    break;
                case "text":
                    this.selected.x += x;
                    this.selected.y += y;
                    break;
            }

            this.startX = ex;
            this.startY = ey;

            this.clearCanvas();
        }

        if(this.currShape == "drag" && !this.isDragging) {
            
            const err = 7;
            let rect = this.can.getBoundingClientRect();
            let x = (e.clientX - rect.left - this.viewportTransform.x) / this.viewportTransform.scale;
            let y = (e.clientY - rect.top - this.viewportTransform.y) / this.viewportTransform.scale;
            let hover = false;

            for (let i = this.top; i >= 0; i--) {
                let ele = this.shapes[i];
                
                if(this.features.includes(ele.type)) break;
                
                if(ele.type == "rect") {
                    if (this.isNearRect(x, y, ele)) {
                        console.log("moving...");
                        hover = true;
                        break;
                    }
                }

                if (ele.type == "circle") {
                    var cir1 = (Math.pow(x - ele.centerX, 2) + Math.pow(y - ele.centerY, 2) - Math.pow(ele.radius + 12, 2));
                    var cir2 = (Math.pow(x - ele.centerX, 2) + Math.pow(y - ele.centerY, 2) - Math.pow(ele.radius - 12, 2));
                    
                    if (cir2 > 0 && cir1 < 0) {
                        hover = true;
                        break;
                    }
                }

                if (ele.type == "ellipse") {
                    var cir1 = (Math.pow((x - ele.centerX) / (ele.rx - 12), 2) + Math.pow((y - ele.centerY)/(ele.ry - 12), 2) - 1);
                    var cir2 = (Math.pow((x - ele.centerX) / (ele.rx + 12), 2) + Math.pow((y - ele.centerY)/(ele.ry + 12), 2) - 1);
    
                    if (cir2 <= 0 && cir1 > 0) {
                        hover = true;
                        break;
                    }
                }

                if (ele.type == "line" || ele.type == "arrow") {
                    let m = (ele.ey - ele.sy) / (ele.ex - ele.sx);
                    let b = ele.sy - m * ele.sx;
                    let dist = Math.abs(m * x - y + b) / Math.sqrt(m * m + 1);
                    
                    if(dist <= err) {
                        hover = true;
                        break;
                    }
                }

                if (ele.type == "freehand") {
                    let a = ele.points;

                    for (let i = 0; i < ele.points.length; i++) {
                        const pt = a[i];
                        let dist = Math.sqrt(Math.pow((pt.x - x), 2) + Math.pow((pt.y - y),2));
                        if(dist < err) {
                            hover = true;
                            break;
                        }
                    }
                }

                if(ele.type == "text") {
                    if(x >= ele.x && x <= ele.x + ele.width && y >= ele.y && y <= ele.y + ele.height) {
                        hover = true;
                        break;
                    }
                }
            };

            this.can.style.cursor = hover ? "pointer": "initial";
        }
    }
    
    mouseDown(e: PointerEvent) {
        let rect = this.can.getBoundingClientRect();
        let x = (e.clientX - rect.left - this.viewportTransform.x) / this.viewportTransform.scale;
        let y = (e.clientY - rect.top - this.viewportTransform.y) / this.viewportTransform.scale;

        if (this.currShape == "move") {
            this.can.style.cursor = "grabbing";
            this.isMoving = true;

            this.startX = e.clientX;
            this.startY = e.clientY;
            return;
        }

        if (this.currShape == "drag") {
            const err = 7;
            this.startX = x;
            this.startY = y;
    
            if (this.selected)  {
                this.selected.color = this.color;
                this.selected = null;
                this.can.style.cursor = "crosshair";
                if (this.propertyChangeCallback) {
                    this.propertyChangeCallback(null);
                }
            }
    
            for (let i = this.top; i >= 0; i--) {
                let ele = this.shapes[i];
    
                if(this.features.includes(ele.type)) break;
    
                if(ele.type == "rect") {
                    if (this.isNearRect(x, y, ele)) {
                        this.selected = ele;
                        this.can.style.cursor = "move";
                        break;
                    }
                }
    
                if (ele.type == "circle") {
                    var cir1 = (Math.pow(x - ele.centerX, 2) + Math.pow(y - ele.centerY, 2) - Math.pow(ele.radius + 12, 2));
                    var cir2 = (Math.pow(x - ele.centerX, 2) + Math.pow(y - ele.centerY, 2) - Math.pow(ele.radius - 12, 2));
    
                    if (cir2 > 0 && cir1 < 0) {
                        this.selected = ele;
                        this.can.style.cursor = "move";
                        break;
                    }
                }

                if (ele.type == "ellipse") {
                    var cir1 = (Math.pow((x - ele.centerX) / (ele.rx - 12), 2) + Math.pow((y - ele.centerY)/(ele.ry - 12), 2) - 1);
                    var cir2 = (Math.pow((x - ele.centerX) / (ele.rx + 12), 2) + Math.pow((y - ele.centerY)/(ele.ry + 12), 2) - 1);
    
                    if (cir2 <= 0 && cir1 > 0) {
                        console.log("ellipse selected");
                        this.selected = ele;
                        this.can.style.cursor = "move";
                        break;
                    }
                }

                if (ele.type == "line" || ele.type == "arrow") {
                    let m = (ele.ey - ele.sy) / (ele.ex - ele.sx);
                    let b = ele.sy - m * ele.sx;
                    let dist = Math.abs(m * x - y + b) / Math.sqrt(m * m + 1);

                    if(dist <= err) {
                        this.selected = ele;
                        this.can.style.cursor = "move";
                        break;
                    }
                }

                if (ele.type == "freehand") {
                    let a = ele.points;

                    for (let i = 0; i < ele.points.length; i++) {
                        const pt = a[i];
                        let dist = Math.sqrt(Math.pow((pt.x - x), 2) + Math.pow((pt.y - y), 2));
                        if(dist < err) {
                            this.selected = ele;
                            console.log(dist);
                            
                            break;
                        }
                    }
                }

                if (ele.type == "text") {
                    if(x >= ele.x && x <= ele.x + ele.width && y >= ele.y && y <= ele.y + ele.height) {
                        this.selected = ele;
                        this.can.style.cursor = "move";
                        break;
                    }
                }
            }
            
            if (this.selected) this.isDragging = true;
            else this.isDragging = false;   
            
            // Notify property panel about selection change
            if (this.propertyChangeCallback) {
                this.propertyChangeCallback(this.selected);
            }
            
            this.clearCanvas();
            return;
        }

        if (!this.isDrawingEnabled) return;

        e.preventDefault();
        this.can.setPointerCapture(e.pointerId);
        
        if(this.shapes) {
            console.log(this.shapes)
            this.shapes.splice(this.top + 1, this.shapes.length - this.top - 1);
        }

        if(this.currShape == "freehand") {
            this.ctx.closePath();
            this.ctx.beginPath();
            this.top++;
        }
        
        this.startX = x;
        this.startY = y;
        
        this.isDrawing = true;

        if(this.currShape == "text") {
            this.handelText(e);
            return;
        }
    }

    mouseUp(e: PointerEvent) {
        let rect = this.can.getBoundingClientRect();
        let x = (e.clientX - rect.left - this.viewportTransform.x) / this.viewportTransform.scale;
        let y = (e.clientY - rect.top - this.viewportTransform.y) / this.viewportTransform.scale;

        if (this.isMoving) {
            this.isMoving = false;
            this.can.style.cursor = "grab";
        }

        if (this.isDragging) {
            this.isDragging = false;
            this.can.style.cursor = "crosshair";
            this.selected = null;
        }

        if(this.isDrawing) {
            var s: Shape | null = null;
            
            switch (this.currShape) {
                case "rect":
                    
                    s = {
                        id: Date.now(),
                        type: "rect",
                        x: this.startX,
                        y: this.startY,
                        width: x - this.startX,
                        height: y - this.startY,
                        color: this.color,
                        // selected: false
                    }
                    
                    break;
            
                case "circle":
                    let r = Math.max((y - this.startY)/2, (x - this.startX)/2);

                    s = {
                        id: Date.now(),
                        type: "circle",
                        centerX: this.startX + r,
                        centerY: this.startY + r,
                        radius: Math.abs(r),
                        color: this.color,
                        // selected: false
                    }
                    break;

                case "line":
                    s = {
                        id: Date.now(),
                        type: "line",
                        sx: this.startX,
                        sy: this.startY,
                        ex: x,
                        ey: y - this.can.offsetTop,
                        color: this.color,
                        // selected: false
                    }
                    break;

                case "arrow":
                    s = {
                        id: Date.now(),
                        type: "arrow",
                        sx: this.startX,
                        sy: this.startY,
                        ex: x,
                        ey: y - this.can.offsetTop,
                        color: this.color,
                        // selected: false
                    }
                    break;

                case "ellipse":
                    s = {
                        id: Date.now(),
                        type: "ellipse",
                        centerX: this.startX + (x - this.startX)/2,
                        centerY: this.startY,
                        rx: Math.abs((x - this.startX)/2),
                        ry: Math.abs((y - this.startY)/2),
                        color: this.color,
                        // selected: false
                    }
                    break;
            }
            if(s && this.currShape != "freehand") {
                console.log(this.socket?.send(JSON.stringify({type: "addShape", shape: s, roomId: this.roomId})))
                this.shapes.splice(++this.top, this.shapes.length - this.top, s);
            }
            this.clearCanvas();
            this.isDrawing = false;
        };
        
        handelDebounce(() => handelSave(this.roomId, this.shapes), 2000);
    }

    undo() {
        if(this.top < 0) return;
        this.top--;
        this.clearCanvas();
    }

    redo() {
        if(this.top == this.shapes.length - 1) return;
        this.top++;
        this.clearCanvas();
    }

    resize() {
        this.can.width = window.innerWidth;
        this.can.height = window.innerHeight;
        this.clearCanvas();
    }

    initHandler() {
        this.can.addEventListener("pointerup", this.mouseUp.bind(this));
        this.can.addEventListener("pointermove", this.mouseMove.bind(this));
        this.can.addEventListener("pointerdown", this.mouseDown.bind(this), { passive: false });
        this.can.addEventListener("pointercancel", this.mouseUp.bind(this));

        window.addEventListener("resize", this.resize.bind(this))
        window.addEventListener("wheel", this.handelWheel, { passive: false });
    }

    destroy() {
        this.can.removeEventListener("pointerup", this.mouseUp);
        this.can.removeEventListener("pointermove", this.mouseMove);
        this.can.removeEventListener("pointerdown", this.mouseDown);
        this.can.removeEventListener("pointercancel", this.mouseUp);
        // this.can.removeEventListener("click", this.click);

        window.removeEventListener("resize", this.resize)
        window.removeEventListener("wheel", this.handelWheel);
    }
}