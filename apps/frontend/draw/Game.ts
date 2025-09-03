import { handelDebounce, handelSave } from "../utils/save"

export type Shape = {
    id: number,
    type: "rect",
    x: number,
    y: number,
    width: number,
    height: number,
    color: string
} | {
    id: number,
    type: "circle",
    centerX: number,
    centerY: number,
    radius: number,
    color: string
} | {
    id: number,
    type: "line",
    sx: number,
    sy: number,
    ex: number,
    ey: number,
    color: string
} | {
    id: number,
    type: "ellipse",
    centerX: number,
    centerY: number,
    rx: number,
    ry: number,
    color: string
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
    color: string
} | {
    type: "freehand",
    points: {x: number, y: number}[],
    color: string
    id: number,
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

    constructor(can: HTMLCanvasElement, lineWidth: number, setZoom: (num: number) => void, roomId:string, elements?: {} | null) {
        this.isDrawingEnabled = false;
        this.ctx = (can).getContext("2d")!;
        this.can = can;
        this.ctx.lineWidth = lineWidth;
        this.lineWidth = lineWidth;
        this.setZoom = setZoom;
        this.can.width = window.innerWidth;
        this.can.height = window.innerHeight;
        this.roomId = roomId;
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

    clearCanvas() {
        
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.can.width, this.can.height);
        this.ctx.fillStyle = "rgba(255, 255, 255)";
        this.ctx.fillRect(0, 0, this.can.width, this.can.height);
        this.ctx.lineWidth = this.lineWidth / this.viewportTransform.scale;

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
            }
            else {
                this.ctx.strokeStyle = ele.color;
            }

            switch (ele.type) {
                case "rect":
                    this.ctx.beginPath();
                    this.ctx.rect(ele.x, ele.y, ele.width, ele.height);
                    this.ctx.stroke();
                    break;
            
                case "circle":
                    this.ctx.beginPath();
                    this.ctx.arc(ele.centerX, ele.centerY, ele.radius, 0, 2*Math.PI);
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

    mouseMove(e: PointerEvent) {
        let rect = this.can.getBoundingClientRect();
        let x = (e.clientX - rect.left - this.viewportTransform.x) / this.viewportTransform.scale;
        let y = (e.clientY - rect.top - this.viewportTransform.y) / this.viewportTransform.scale;

        if (this.isMoving) {
            this.can.style.cursor = "grabbing";

            this.viewportTransform.x += e.clientX - this.startX;
            this.viewportTransform.y += e.clientY - this.startY;
            this.startX = e.clientX;
            this.startY = e.clientY;
            
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
            }
            
            if (this.selected) this.isDragging = true;
            else this.isDragging = false;   
            
            this.clearCanvas();
            return;
        }

        if (!this.isDrawingEnabled) return;

        e.preventDefault();
        this.can.setPointerCapture(e.pointerId);
        
        this.shapes.splice(this.top + 1, this.shapes.length - this.top - 1);

        if(this.currShape == "freehand") {
            this.ctx.closePath();
            this.ctx.beginPath();
            this.top++;
        }

        this.startX = x;
        this.startY = y;

        this.isDrawing = true;
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
            if(s && this.currShape != "freehand") this.shapes.splice(++this.top, this.shapes.length - this.top, s);
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