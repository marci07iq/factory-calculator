import { FACTORY_DATA } from "./factory_data";
import { FactoryHub, FactoryNode, FactoryNodeID, FactorySource, FlowLine } from "./factory_node";
import { num_to_str } from "./helper";
import { createElem } from "./utils";

export class FactoryTab {
    elems: Map<FactoryNodeID, FactoryNode>;
    elem_id: FactoryNodeID = 1;

    htmls: {
        root?: HTMLDivElement,

        ui?: HTMLDivElement,
        save_button?: HTMLButtonElement,

        viewport?: HTMLDivElement,
        context_menu?: HTMLDivElement,
        canvas?: HTMLDivElement,
        canvas_lines?: HTMLDivElement,
        canvas_nodes?: HTMLDivElement,


        sidebar?: HTMLDivElement,
    } = {};

    x: number = 0;
    y: number = 0;
    zoom: number = 1;

    selected_nodes: Array<FactoryNode> = [];
    drag_mode: "none" | "canvas" | "node" = "none";

    constructor() {
        this.htmls.root = createElem("div", ["factory-tab"], undefined, undefined, [
            this.htmls.ui = createElem("div", ["factory-tab-ui"], undefined, undefined, [
                this.htmls.save_button = createElem("button", ["factory-tab-button"], undefined, "Save") as HTMLButtonElement,
            ]) as HTMLDivElement,
            this.htmls.viewport = createElem("div", ["factory-viewport"], undefined, undefined, [
                this.htmls.canvas = createElem("div", ["factory-canvas"], undefined, undefined, [
                    this.htmls.canvas_lines = createElem("div", ["factory-canvas-lines"]) as HTMLDivElement,
                    this.htmls.canvas_nodes = createElem("div", ["factory-canvas-nodes"]) as HTMLDivElement
                ]) as HTMLDivElement,
                this.htmls.context_menu = createElem("div", ["factory-tab-context"]) as HTMLDivElement,
            ]) as HTMLDivElement,
            this.htmls.sidebar = createElem("div", ["factory-tab-sidebar"]) as HTMLDivElement
        ]) as HTMLDivElement;


        this.htmls.save_button.addEventListener("click", () => {
            localStorage.setItem("save-meta", JSON.stringify({ version: 1, slots: 1 }));
            localStorage.setItem("slot-1", JSON.stringify(this.save()));
        });

        this.x = 0;
        this.y = 0;
        this.zoom = 1;

        let last_x: number = NaN;
        let last_y: number = NaN;

        this.htmls.viewport!.addEventListener("contextmenu", (ev: MouseEvent) => {
            ev.preventDefault();
        });

        this.htmls.viewport!.addEventListener("mousedown", (ev) => {
            if (ev.button == 0) {
                if (ev.target instanceof Node) {
                    if (!this.htmls.context_menu!.contains(ev.target)) {
                        this.htmls.context_menu!.innerHTML = "";
                    }
                }
                if (ev.target == this.htmls.viewport || ev.target == this.htmls.canvas || ev.target == this.htmls.canvas_lines || ev.target == this.htmls.canvas_nodes || ev.target == this.htmls.context_menu) {
                    if (!ev.ctrlKey) {
                        this.clear_selected_nodes();
                    }
                    this.drag_mode = "canvas";

                    last_x = ev.clientX;
                    last_y = ev.clientY;

                    ev.stopPropagation();
                }
            }
        });

        document.addEventListener("mouseup", (ev) => {
            this.drag_mode = "none";
        });

        document.addEventListener("mousemove", (ev) => {
            let dx = (ev.clientX - last_x);
            let dy = (ev.clientY - last_y);
            last_x = ev.clientX;
            last_y = ev.clientY;

            if (this.drag_mode == "canvas") {
                this.x += dx;
                this.y += dy;
                this.reset_css();
                ev.stopPropagation();
            }
            if (this.drag_mode == "node") {
                this.selected_nodes.forEach((node) => {
                    node.set_position(node.x + dx / this.zoom, node.y + dy / this.zoom);
                })
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
            this.y = (this.y - viewportY) * delta_zoom + viewportY;
            this.reset_css();
        }

        this.reset_css();

        this.elems = new Map<FactoryNodeID, FactoryNode>();
    }

    update_sidebar() {
        this.htmls.sidebar!.innerHTML = "";
        if (this.selected_nodes.length == 1) {
            this.htmls.sidebar!.appendChild(createElem("div", ["factory-sidebar-header"], undefined, this.selected_nodes[0].get_name()));

            this.selected_nodes[0].create_sidebar_menu().forEach(node => {
                this.htmls.sidebar!.appendChild(node);
            })
        }
        else if (this.selected_nodes.length > 1) {
            this.htmls.sidebar!.appendChild(createElem("div", ["factory-sidebar-entry"], undefined, undefined, [0].map(() => {
                let btn = this.htmls.sidebar!.appendChild(createElem("button", ["factory-sidebar-button"], undefined, "Merge"))
                btn.addEventListener("click", () => {
                    FactoryNode.merge(this.selected_nodes);
                })
                return btn;
            })));
        }
    }

    add_selected_node(node: FactoryNode, append: boolean) {
        if (this.selected_nodes.indexOf(node) == -1) {
            if (!append) {
                this.clear_selected_nodes();
            }
            this.selected_nodes.push(node);
            node.elem.classList.add("factory-node-selected");
            node.in.flows.forEach(flow => {
                flow.elem.classList.add("factory-flow-selected");
            });
            node.out.flows.forEach(flow => {
                flow.elem.classList.add("factory-flow-selected");
            });

            this.update_sidebar();
        }
    }

    clear_selected_nodes() {
        this.selected_nodes.forEach(node => {
            node.elem.classList.remove("factory-node-selected");

            node.in.flows.forEach(flow => {
                flow.elem.classList.remove("factory-flow-selected");
            });
            node.out.flows.forEach(flow => {
                flow.elem.classList.remove("factory-flow-selected");
            });
        });
        this.selected_nodes = [];
        this.update_sidebar();
    }

    reset_css() {
        this.htmls.canvas!.style.transform = `translate(${this.x}px, ${this.y}px) scale(${this.zoom})`;

        let log_zoom = Math.log(this.zoom * 2) / Math.log(5);
        let scale = 20 * Math.pow(5, log_zoom - Math.floor(log_zoom));

        this.htmls.viewport!.style.backgroundSize = `${scale * 5}px ${scale * 5}px, ${scale * 5}px ${scale * 5}px, ${scale}px ${scale}px, ${scale}px ${scale}px`;
        this.htmls.viewport!.style.backgroundPosition = `${this.x - 1}px ${this.y - 1}px, ${this.x - 1}px ${this.y - 1}px, ${this.x - 0.5}px ${this.y - 0.5}px, ${this.x - 0.5}px ${this.y - 0.5}px`;
    }

    add_node(node: FactoryNode, id: number | undefined): FactoryNodeID {
        let new_id = id ?? (this.elem_id++);
        this.elem_id = Math.max(this.elem_id, new_id + 1);
        node.id = new_id;
        this.elems.set(new_id, node);
        this.htmls.canvas_nodes!.appendChild(node.elem);
        return new_id;
    }
    remove_flow(flow: FlowLine) {
        this.elems.get(flow.from)!.out.flows = this.elems.get(flow.from)!.out.flows.filter(tflow => tflow != flow);
        this.elems.get(flow.to)!.in.flows = this.elems.get(flow.to)!.in.flows.filter(tflow => tflow != flow);
        this.htmls.canvas_lines!.removeChild(flow.elem);
    }
    remove_node(id: FactoryNodeID) {
        let node = this.elems.get(id)!;
        //Remove from canvas
        this.htmls.canvas_nodes!.removeChild(node.elem);
        //Remove flows
        node.in.flows.forEach((flow) => {
            this.remove_flow(flow);
        });
        if (node.in.flows.length != 0) throw new Error("Failed to wipe");
        node.out.flows.forEach((flow) => {
            this.remove_flow(flow);
        });
        if (node.out.flows.length != 0) throw new Error("Failed to wipe");
        //Remove from element map
        this.elems.delete(id);

        this.selected_nodes = this.selected_nodes.filter(node2 => node2 != node);
        this.update_sidebar();
    }

    save() {
        let res = {
            nodes: new Array(),
            flows: new Array()
        };
        this.elems.forEach(elem => {
            res.nodes.push(elem.save());
            elem.out.flows.forEach(flow => {
                res.flows.push(flow.save());
            });
        });

        return res;
    }

    load(data) {
        data.nodes.forEach(node => {
            FactoryNode.load(node, this);
        });

        data.flows.forEach(node => {
            FlowLine.load(node, this);
        })
    }
}