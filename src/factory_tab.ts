import { FactoryComposite, FactoryNode, FactoryNodeID, FlowLine } from "./factory_node";
import { createElem } from "./utils";

export class FactoryTab {
    elems: Map<FactoryNodeID, FactoryNode>;
    elem_id: FactoryNodeID = 1;

    flows: Map<FactoryNodeID, FactoryNode>;
    flows_id: FactoryNodeID = 1;

    htmls: {
        root?: HTMLDivElement,
        viewport?: HTMLDivElement,
        canvas?: HTMLDivElement,
        canvas_lines?: HTMLDivElement,
        canvas_nodes?: HTMLDivElement,

        context_menu?: HTMLDivElement,

        sidebar?: HTMLDivElement,
    } = {};

    x: number;
    y: number;
    zoom: number;

    constructor() {

        this.htmls.root = createElem("div", ["factory-tab"], undefined, undefined, [
            this.htmls.viewport = createElem("div", ["factory-viewport"], undefined, undefined, [
                    this.htmls.canvas = createElem("div", ["factory-canvas"], undefined, undefined, [
                        this.htmls.canvas_lines = createElem("div", ["factory-canvas-lines"]) as HTMLDivElement,
                        this.htmls.canvas_nodes = createElem("div", ["factory-canvas-nodes"]) as HTMLDivElement
                    ]) as HTMLDivElement
                ]) as HTMLDivElement,
            this.htmls.context_menu = createElem("div", ["factory-tab-context"]) as HTMLDivElement,
            this.htmls.sidebar = createElem("div", ["factory-tab-sidebar"]) as HTMLDivElement
        ]) as HTMLDivElement;

        this.x = 0;
        this.y = 0;
        this.zoom = 1;

        let dragging = false;
        let last_x: number = NaN;
        let last_y: number = NaN;

        this.htmls.viewport.onmousedown = (ev) => {
            if (ev.target == this.htmls.viewport || ev.target == this.htmls.canvas || ev.target == this.htmls.canvas_lines || ev.target == this.htmls.canvas_nodes) {
                if(ev.button == 0) {
                    dragging = true;
                    last_x = ev.clientX;
                    last_y = ev.clientY;
                    ev.stopPropagation();
                }
            }
        }
        document.addEventListener("mouseup", (ev) => {
            dragging = false;
        });

        document.addEventListener("mousemove", (ev) => {
            if(dragging) {
                this.x += (ev.clientX - last_x);
                this.y += (ev.clientY - last_y);
                last_x = ev.clientX;
                last_y = ev.clientY;
                this.reset_css();
                ev.stopPropagation();
            }
        });

        this.htmls.viewport.onwheel = (ev) => {
            let rect = this.htmls.viewport!.getBoundingClientRect();

            let viewportX = (ev.clientX - rect.left);
            let viewportY = (ev.clientY - rect.top);
            
            let delta_zoom = Math.exp(-ev.deltaY * 0.001);
            let new_zoom = Math.min(Math.max(0.1, this.zoom * delta_zoom), 1);
            delta_zoom = new_zoom / this.zoom;
            this.zoom = new_zoom;

            this.x = (this.x - viewportX) * delta_zoom + viewportX;
            this.y = (this.y - viewportY) * delta_zoom  + viewportY;
            this.reset_css();
        }

        this.reset_css();

        this.elems = new Map<FactoryNodeID, FactoryNode>();
    }

    reset_css() {
        this.htmls.canvas!.style.transform = `translate(${this.x}px, ${this.y}px) scale(${this.zoom})`;

        let log_zoom = Math.log(this.zoom * 2) / Math.log(5);
        let scale = 20 * Math.pow(5, log_zoom - Math.floor(log_zoom));

        this.htmls.viewport!.style.backgroundSize = `${scale*5}px ${scale*5}px, ${scale*5}px ${scale*5}px, ${scale}px ${scale}px, ${scale}px ${scale}px`;
        this.htmls.viewport!.style.backgroundPosition = `${this.x - 1}px ${this.y - 1}px, ${this.x - 1}px ${this.y - 1}px, ${this.x - 0.5}px ${this.y - 0.5}px, ${this.x - 0.5}px ${this.y - 0.5}px`;
    }

    add_node(node: FactoryNode): FactoryNodeID {
        let new_id = this.elem_id++;
        node.id = new_id;
        this.elems.set(new_id, node);
        this.htmls.canvas_nodes!.appendChild(node.elem);
        return new_id;
    }
    remove_flow(flow: FlowLine) {
        this.elems.get(flow.from)!.out.flows = this.elems.get(flow.from)!.out.flows.filter(tflow => tflow != flow);
        this.elems.get(flow.to)!.in.flows = this.elems.get(flow.to)!.in.flows.filter(tflow => tflow != flow);
        this.htmls.canvas_lines!.removeChild(flow.line);
    }
    remove_node(id: FactoryNodeID) {
        let node = this.elems.get(id)!;
        //Remove from canvas
        this.htmls.canvas_nodes!.removeChild(node.elem);
        //Remove flows
        node.in.flows.forEach((flow) => {
            this.remove_flow(flow);
        });
        if(node.in.flows.length != 0) throw new Error("Failed to wipe");
        node.out.flows.forEach((flow) => {
            this.remove_flow(flow);
        });
        if(node.out.flows.length != 0) throw new Error("Failed to wipe");
        //Remove from element map
        this.elems.delete(id);
    }
}