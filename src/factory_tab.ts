import { FactoryNode, ProcessingNode } from "./factory_node";
import { createElem } from "./utils";

export class FactoryTab {
    elems: Array<ProcessingNode>;

    htmls: {
        root?: HTMLDivElement,
        viewport?: HTMLDivElement,
        canvas?: HTMLDivElement,

        context_menu?: HTMLDivElement,

        sidebar?: HTMLDivElement,
    } = {};

    x: number;
    y: number;
    zoom: number;

    constructor() {

        this.htmls.root = createElem("div", ["factory-tab"], undefined, undefined, [
            this.htmls.viewport = createElem("div", ["factory-viewport"], undefined, undefined, [
                    this.htmls.canvas = createElem("div", ["factory-canvas"]) as HTMLDivElement
                ]) as HTMLDivElement,
            this.htmls.context_menu = createElem("div", ["factory-tab-context"]) as HTMLDivElement,
            this.htmls.sidebar = createElem("div", ["factory-tab-sidebar"]) as HTMLDivElement
        ]) as HTMLDivElement;

        this.x = 0;
        this.y = 0;
        this.zoom = 1;

        let dragging = false;
        this.htmls.viewport.onmousedown = (ev) => {
            if (ev.target == this.htmls.viewport || ev.target == this.htmls.canvas) {
                if(ev.button == 0) {
                    dragging = true;
                    ev.stopPropagation();
                }
            }
        }
        document.addEventListener("mouseup", (ev) => {
            dragging = false;
        });

        document.addEventListener("mousemove", (ev) => {
            if(dragging) {
                this.x += ev.movementX;
                this.y += ev.movementY;
                this.reset_css();
                ev.stopPropagation();
            }
        });

        this.htmls.viewport.onwheel = (ev) => {
            let rect = this.htmls.viewport!.getBoundingClientRect();

            let viewportX = (ev.clientX - rect.left);
            let viewportY = (ev.clientY - rect.top);
            
            console.log(viewportX, viewportY);

            let delta_zoom = Math.exp(-ev.deltaY * 0.001);
            let new_zoom = Math.min(Math.max(0.1, this.zoom * delta_zoom), 1);
            delta_zoom = new_zoom / this.zoom;
            this.zoom = new_zoom;

            this.x = (this.x - viewportX) * delta_zoom + viewportX;
            this.y = (this.y - viewportY) * delta_zoom  + viewportY;
            this.reset_css();
        }

        this.reset_css();

        this.elems = [];
        this.elems.push(new FactoryNode(this, 50, 50, "asd", []));
        this.htmls.canvas.appendChild(this.elems[0].elem);
    }

    reset_css() {
        this.htmls.canvas!.style.transform = `translate(${this.x}px, ${this.y}px) scale(${this.zoom})`;

        let log_zoom = Math.log(this.zoom * 2) / Math.log(5);
        let scale = 20 * Math.pow(5, log_zoom - Math.floor(log_zoom));

        this.htmls.viewport!.style.backgroundSize = `${scale*5}px ${scale*5}px, ${scale*5}px ${scale*5}px, ${scale}px ${scale}px, ${scale}px ${scale}px`;
        this.htmls.viewport!.style.backgroundPosition = `${this.x - 1}px ${this.y - 1}px, ${this.x - 1}px ${this.y - 1}px, ${this.x - 0.5}px ${this.y - 0.5}px, ${this.x - 0.5}px ${this.y - 0.5}px`;
    }
}