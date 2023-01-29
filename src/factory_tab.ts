import { FACTORY_DATA } from "./factory_data";
import { FactoryNode, FactoryHub, FactoryMachine, FactoryNodeID, FactorySink, FactorySource, FlowLine } from "./factory_node";
import { tally_recipe, print_recipe, num_to_str } from "./helper";
import { SolverResult } from "./solver";
import { createElem } from "./utils";

export class FactoryTab {
    elems: Map<FactoryNodeID, FactoryNode>;
    elem_id: FactoryNodeID = 1;

    htmls: {
        root?: HTMLDivElement,

        //header?: HTMLDivElement,
        //save_button?: HTMLButtonElement,
        export_button?: HTMLButtonElement,
        //import_button?: HTMLButtonElement,

        main?: HTMLDivElement,
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
    drag_mode: "none" | "canvas" | "node" | "select" = "none";

    constructor() {
        this.htmls.root = createElem("div", ["factory-tab"], undefined, undefined, [
            /*this.htmls.header = createElem("div", ["factory-tab-header"], undefined, undefined, [
                this.htmls.export_button = createElem("button", ["factory-tab-button"], undefined, "Export") as HTMLButtonElement,
            ]) as HTMLDivElement,*/
            this.htmls.main = createElem("div", ["factory-tab-main"], undefined, undefined, [
                this.htmls.viewport = createElem("div", ["factory-viewport"], undefined, undefined, [
                    this.htmls.canvas = createElem("div", ["factory-canvas"], undefined, undefined, [
                        this.htmls.canvas_lines = createElem("div", ["factory-canvas-lines"]) as HTMLDivElement,
                        this.htmls.canvas_nodes = createElem("div", ["factory-canvas-nodes"]) as HTMLDivElement
                    ]) as HTMLDivElement,
                    this.htmls.context_menu = createElem("div", ["factory-tab-context"]) as HTMLDivElement,
                ]) as HTMLDivElement,
                this.htmls.sidebar = createElem("div", ["factory-tab-sidebar-container"]) as HTMLDivElement
            ]) as HTMLDivElement,
        ]) as HTMLDivElement;



        /*this.htmls.export_button.addEventListener("click", () => {
            navigator.clipboard.writeText(JSON.stringify(this.save()));
        });*/

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
                    if (ev.shiftKey) {
                        this.drag_mode = "select";

                        last_x = ev.clientX;
                        last_y = ev.clientY;

                        ev.stopPropagation();
                    } else {
                        this.htmls.context_menu!.innerHTML = "";
                        if (!ev.ctrlKey) {
                            this.clear_selected_nodes();
                        }
                        this.drag_mode = "canvas";

                        last_x = ev.clientX;
                        last_y = ev.clientY;

                        ev.stopPropagation();
                    }
                }
            }
        });

        document.addEventListener("mouseup", (ev) => {
            if (this.drag_mode == "select") {
                let first_x = (Math.min(ev.clientX, last_x) - this.x) / this.zoom;
                let first_y = (Math.min(ev.clientY, last_y) - this.y) / this.zoom;
                let second_x = (Math.max(ev.clientX, last_x) - this.x) / this.zoom;
                let second_y = (Math.max(ev.clientY, last_y) - this.y) / this.zoom;

                //Recalculate to client coordinates

                if (!ev.ctrlKey) {
                    this.clear_selected_nodes();
                }
                this.elems.forEach((elem => {
                    if (first_x <= elem.x && elem.x <= second_x &&
                        first_y <= elem.y && elem.y <= second_y) {
                        this.add_selected_node(elem, true);
                    }
                }))
            }
            this.drag_mode = "none";
        });

        document.addEventListener("mousemove", (ev) => {
            let dx = (ev.clientX - last_x);
            let dy = (ev.clientY - last_y);

            if (this.drag_mode == "select") {
                ev.stopPropagation();
            } else {
                last_x = ev.clientX;
                last_y = ev.clientY;
            }
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
        if (this.selected_nodes.length >= 1) {

            let sidebar_content: HTMLElement;
            this.htmls.sidebar!.appendChild(createElem("div", ["factory-tab-sidebar"], undefined, undefined, [
                sidebar_content = createElem("div", ["factory-tab-sidebar-content"], undefined, undefined)
            ]));

            if (this.selected_nodes.length == 1) {
                sidebar_content.appendChild(createElem("div", ["factory-sidebar-header"], undefined, this.selected_nodes[0].get_name()));

                this.selected_nodes[0].create_sidebar_menu().forEach(node => {
                    sidebar_content.appendChild(node);
                })
            }
            else {
                sidebar_content.appendChild(createElem("div", ["factory-sidebar-entry"], undefined, undefined, [0].map(() => {
                    let btn = sidebar_content.appendChild(createElem("button", ["factory-sidebar-button"], undefined, "Merge"))
                    btn.addEventListener("click", () => {
                        FactoryNode.merge(this.selected_nodes);
                    })
                    return btn;
                })));
            }
        }
    }

    add_selected_node(node: FactoryNode, append: boolean) {
        if (this.selected_nodes.indexOf(node) == -1) {
            if (!append) {
                this.clear_selected_nodes();
            }
            this.selected_nodes.push(node);
            node.elem.classList.add("factory-node-selected");
            node.io[0].forEachFlat(flow => {
                flow.elem.classList.add("factory-flow-selected-i");
            });
            node.io[1].forEachFlat(flow => {
                flow.elem.classList.add("factory-flow-selected-o");
            });

            this.update_sidebar();
        }
    }

    clear_selected_nodes() {
        this.selected_nodes.forEach(node => {
            node.elem.classList.remove("factory-node-selected");

            node.io[0].forEachFlat(flow => {
                flow.elem.classList.remove("factory-flow-selected-i");
            });
            node.io[1].forEachFlat(flow => {
                flow.elem.classList.remove("factory-flow-selected-o");
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
        this.elems.get(flow.from)!.io[1].remove(flow);
        this.elems.get(flow.to)!.io[0].remove(flow);
        this.htmls.canvas_lines!.removeChild(flow.elem);
    }
    remove_node(id: FactoryNodeID) {
        let node = this.elems.get(id)!;
        //Remove from canvas
        this.htmls.canvas_nodes!.removeChild(node.elem);
        //Remove flows
        node.io[0].forEachFlat((flow) => {
            this.remove_flow(flow);
        });
        //if (node.in.flows.length != 0) throw new Error("Failed to wipe");
        node.io[1].forEachFlat((flow) => {
            this.remove_flow(flow);
        });
        //if (node.out.flows.length != 0) throw new Error("Failed to wipe");
        //Remove from element map
        this.elems.delete(id);

        this.selected_nodes = this.selected_nodes.filter(node2 => node2 != node);
        this.update_sidebar();
    }

    save(): any {
        let res = {
            nodes: new Array(),
            flows: new Array()
        };
        this.elems.forEach(elem => {
            res.nodes.push(elem.save());
            elem.io[1].forEachFlat(flow => {
                res.flows.push(flow.save());
            });
        });

        return res;
    }

    load(data, mult: number = 1, remap: Map<FactoryNodeID, FactoryNodeID> | undefined = undefined): Array<FactoryNode> {
        let remap2 = remap ?? new Map<FactoryNodeID, FactoryNodeID>();
        let nodes = data.nodes.map(node => {
            return FactoryNode.load(node, this, remap2, mult);
        });

        data.flows.forEach(node => {
            FlowLine.load(node, this, remap2, mult);
        });

        return nodes;
    }
}

export function createTabSolution(solution: SolverResult): FactoryTab | undefined {
    if (solution.feasible) {
        let res_factory = new FactoryTab();

        let tally: Map<string, Array<number>> = new Map<string, Array<number>>();

        //Create tally
        solution.values.forEach((item_cnt, item_key) => {
            if (item_key.startsWith("Sink_")) return;

            tally_recipe(item_key, tally, item_cnt);
        });

        //console.log("");

        let hub_nodes: Map<string, number> = new Map<string, FactoryNodeID>();

        //Print tally
        //Create hub nodes
        tally.forEach((item_cnt, item_key) => {
            //console.log(item_key, item_cnt);
            let delta = item_cnt[1] - item_cnt[0];

            //Hub node
            let hub_node = new FactoryHub(
                res_factory,
                undefined,
                0, 0,
                Math.max(item_cnt[1], item_cnt[0]), item_key
            );
            hub_nodes.set(item_key, hub_node.id);

            if (Math.abs(delta) > 1e-6) {
                //console.log(`${FACTORY_DATA.items[item_key].name}: used ${item_cnt[0]}, made ${item_cnt[1]}, delta ${delta}`);

                //Sourced
                if (delta < -1e-6) {
                    let node = new FactorySource(
                        res_factory,
                        undefined,
                        0, 0,
                        -delta, item_key
                    );
                    new FlowLine(res_factory, item_key, -delta, node.id, hub_node.id);
                    //Sunk
                }
                if (delta > 1e-6) {
                    let node = new FactorySink(
                        res_factory,
                        undefined,
                        0, 0,
                        delta, item_key
                    );
                    new FlowLine(res_factory, item_key, delta, hub_node.id, node.id);
                }
            } else {
                //console.log(`${FACTORY_DATA.items[item_key].name}: used ${item_cnt[0]}, made ${item_cnt[1]}`);
            }
        });

        //console.log("");

        //Print processing nodes
        solution.values.forEach((recipe_cnt, recipe_key) => {
            if (recipe_key.startsWith("Sink_")) return;

            //console.log(print_recipe(recipe_key, recipe_cnt));

            /*
            let net_in: NetIO = new Map<string, number>();
            let net_out: NetIO = new Map<string, number>();

            FACTORY_DATA.productionRecipes[recipe_key].ingredients.forEach((ingredient) => {
                net_in.set(ingredient.itemClass, ingredient.quantity * recipe_cnt);
            });

            FACTORY_DATA.productionRecipes[recipe_key].products.forEach((product) => {
                net_out.set(product.itemClass, product.quantity * recipe_cnt);
            });*/

            if (recipe_cnt > 1e-6) {
                let node = new FactoryMachine(
                    res_factory,
                    undefined,
                    0, 0,
                    recipe_cnt,
                    recipe_key,
                )

                FACTORY_DATA.productionRecipes[recipe_key].ingredients.forEach((ingredient) => {
                    if (ingredient.quantity * recipe_cnt > 1e-6) {
                        new FlowLine(res_factory, ingredient.itemClass, ingredient.quantity * recipe_cnt, hub_nodes.get(ingredient.itemClass)!, node.id);
                    }
                });

                FACTORY_DATA.productionRecipes[recipe_key].products.forEach((product) => {
                    if (product.quantity * recipe_cnt > 1e-6) {
                        new FlowLine(res_factory, product.itemClass, product.quantity * recipe_cnt, node.id, hub_nodes.get(product.itemClass)!);
                    }
                });
            }
        });


        //console.log("");

        //Print sinking steps
        solution.values.forEach((item_cnt, item_key) => {
            if (!item_key.startsWith("Sink_")) return;
            let item_name = item_key.substring(5);

            let in_str = item_cnt + " * " + FACTORY_DATA.items[item_name].name;
            let out_str = Number(item_cnt) * FACTORY_DATA.items[item_name].sinkPoints;

            let recipe_name = "Sink " + FACTORY_DATA.items[item_name].name;

            //console.log(`${recipe_name}: ${in_str} => ${out_str}`);
        });

        //console.log("");

        //Eliminate useless hubs
        res_factory.elems.forEach(elem => {
            if (elem instanceof FactoryHub) {
                elem.try_eliminate();
            }
        });

        const spacing_x = 500;
        const spacing_y = 200;

        //Auto layout (x)
        let layers: Map<FactoryNodeID, number[]> = new Map<FactoryNodeID, number[]>();

        let y_i = 0;
        res_factory.elems.forEach((val, key) => {
            if (val instanceof FactorySource) {
                layers.set(val.id, [0, y_i++]);
            }
        });


        let work_left = true;
        while (work_left) {

            work_left = false;
            let work_done = false;

            res_factory.elems.forEach((val, key) => {
                if (!layers.has(key)) {
                    let max = 0;
                    let y_sum = 0;
                    let y_cnt = 0;
                    if (val.io[0].everyFlat((flow) => {
                        if (layers.has(flow.from)) {
                            max = Math.max(max, layers.get(flow.from)!.at(0)!);
                            ++y_cnt;
                            y_sum += layers.get(flow.from)!.at(1)!;
                            return true;
                        }
                        return false;
                    })) {
                        let new_y = y_sum / y_cnt;
                        if (isNaN(new_y)) {
                            //console.log(val);
                        }
                        layers.set(key, [max + 1, new_y]);
                        work_done = true;
                    } else {
                        work_left = true;
                    }
                }
            });

            //Pick one to do
            if (!work_done) {
                //Find best node with most ins
                let max_y_cnt = 0;
                let min_y_deficit = Infinity;
                let best_y_id = -1;
                for (let [key, val] of res_factory.elems) {
                    if (!layers.has(key)) {
                        let y_cnt = 0;
                        let y_deficit = 0;

                        val.io[0].forEachFlat((flow) => {
                            if (layers.has(flow.from)) {
                                ++y_cnt;
                                --y_deficit;
                            }
                        });

                        if (y_deficit < min_y_deficit) {
                            best_y_id = val.id;
                            min_y_deficit = y_deficit;
                            max_y_cnt = y_cnt;
                        } else if (y_deficit == min_y_deficit) {
                            if (y_cnt > max_y_cnt) {
                                best_y_id = val.id;
                                max_y_cnt = y_cnt;
                            }
                        }
                    }
                }

                let max = 0;
                let y_sum = 0;
                let y_cnt = 0;

                res_factory.elems.get(best_y_id)!.io[0].forEachFlat((flow) => {
                    if (layers.has(flow.from)) {
                        max = Math.max(max, layers.get(flow.from)!.at(0)!);
                        ++y_cnt;
                        y_sum += layers.get(flow.from)!.at(1)!;
                    }
                });

                //console.log(`Premature accept`, y_cnt, res_factory.elems.get(best_y_id)!);
                let new_y = (y_cnt != 0) ? (y_sum / y_cnt) : 0;
                layers.set(best_y_id, [max + 1, new_y]);
                work_done = true;

            }
        }

        res_factory.elems.forEach((val, key) => {
            val.set_position(layers.get(val.id)!.at(0)! * spacing_x, layers.get(val.id)!.at(1)! * spacing_y * 3);
        });

        return res_factory;
    }

    return undefined;
}

export function createTabSavedata(data: any): FactoryTab | undefined {
    let res = new FactoryTab();
    try {
        res.load(data);
        return res;
    } catch (e) {
        console.error(e);
        return undefined
    }
};

export function createTabSavestring(data: string): FactoryTab | undefined {
    let res = new FactoryTab();
    try {
        res.load(JSON.parse(data));
        return res;
    } catch (e) {
        console.error(e);
        return undefined
    }
};