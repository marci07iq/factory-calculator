import { validate } from "json-schema";
import { FACTORY_DATA } from "./factory_data";
import { FactoryTab } from "./factory_tab";
import { num_to_str } from "./helper";
import { createElem } from "./utils";

export type FactoryNodeID = number;

export class FlowLine {
    host: FactoryTab;

    resource: string;
    rate: number;

    from: FactoryNodeID;
    to: FactoryNodeID;

    elem: HTMLDivElement;
    elem_line: HTMLDivElement;
    elem_text: HTMLDivElement;

    constructor(host: FactoryTab, resource: string, rate: number, from: FactoryNodeID, to: FactoryNodeID) {
        this.host = host;

        this.resource = resource;
        this.rate = rate;

        this.from = from;
        this.to = to;

        this.elem = createElem("div", ["factory-flow"], undefined, undefined, [
            this.elem_line = createElem("div", ["factory-flow-line"]) as HTMLDivElement,
            this.elem_text = createElem("div", ["factory-flow-text"], undefined, `${num_to_str(this.rate)} x ${FACTORY_DATA.items[this.resource].name}`) as HTMLDivElement,
        ]) as HTMLDivElement;
        this.host.htmls.canvas_lines!.appendChild(this.elem);

        this.host.elems.get(this.from)!.out.flows.push(this);
        this.host.elems.get(this.to)!.in.flows.push(this);

        this.elem.setAttribute("data-id-from", this.from.toString());
        this.elem.setAttribute("data-id-to", this.to.toString());

        this.update_position();

        this.elem_text.addEventListener("contextmenu", (ev) => {
            ev.preventDefault();

            let entry_hub = createElem("div", ["factory-context-row"], undefined, "Insert hub");
            entry_hub.addEventListener("click", () => {
                this.host.htmls.context_menu!.innerHTML = "";

                // bottom right
                const x1 = this.host.elems.get(this.from)!.x;
                const y1 = this.host.elems.get(this.from)!.y;
                // top right
                const x2 = this.host.elems.get(this.to)!.x;
                const y2 = this.host.elems.get(this.to)!.y;

                let hub = new FactoryHub(this.host, undefined, (x1 + x2) / 2, (y1 + y2) / 2, this.resource, this.rate);
                new FlowLine(this.host, this.resource, this.rate, this.from, hub.id);
                new FlowLine(this.host, this.resource, this.rate, hub.id, this.to);
                this.host.remove_flow(this);
            });

            let menu = createElem("div", ["factory-context-menu"], undefined, undefined, [
                entry_hub
            ]);
            menu.style.left = `${ev.clientX}px`;
            menu.style.top = `${ev.clientY}px`;

            this.host.htmls.context_menu!.innerHTML = "";
            this.host.htmls.context_menu!.appendChild(menu);
        });
    }

    update_position() {
        // bottom right
        const x1 = this.host.elems.get(this.from)!.x;
        const y1 = this.host.elems.get(this.from)!.y;
        // top right
        const x2 = this.host.elems.get(this.to)!.x;
        const y2 = this.host.elems.get(this.to)!.y;
        // distance
        const length = Math.sqrt(((x2 - x1) * (x2 - x1)) + ((y2 - y1) * (y2 - y1)));
        // center
        const cx = ((x1 + x2) / 2) - (length / 2);
        const cy = ((y1 + y2) / 2);
        // angle
        var angle = Math.atan2((y1 - y2), (x1 - x2)) * (180 / Math.PI);
        // make hr
        this.elem_line.style.left = `${cx}px`;
        this.elem_line.style.top = `${cy}px`;
        this.elem_line.style.width = `${length}px`;
        this.elem_line.style.rotate = `${angle}deg`;

        this.elem_text.style.left = `${((x1 + x2) / 2)}px`;
        this.elem_text.style.top = `${((y1 + y2) / 2)}px`;
        this.elem_text.style.translate = `-50% -50%`;
    }

    save(): any {
        return {
            from: this.from,
            to: this.to,

            resource: this.resource,
            rate: this.rate,
        };
    }

    static load(data, host: FactoryTab): FlowLine {
        return new FlowLine(host, data.resource, data.rate, data.from, data.to);
    }
};

export type FlowViewItemPart = {
    rate: number;
    from: FactoryNodeID;
    to: FactoryNodeID;
};

export type FlowViewItem = {
    total: number;
    parts: Array<FlowViewItemPart>;
};

export type FlowView = Map<string, FlowViewItem>;

export type ProcessingFlows = Array<FlowLine>;

export type ProcessingIO = {
    //total: NetIO;
    flows: ProcessingFlows;
}

/*function sum_io(parts: Array<NetIO>): NetIO {
    let res: NetIO = new Map<string, number>();

    parts.forEach((part) => {
        part.forEach((val, key) => {
            if (!res.has(key)) {
                res.set(key, 0);
            }
            res.set(key, res.get(key)! + val);
        });
    });

    return res;
}

function mul_io(io: NetIO, num: number): NetIO {
    let res: NetIO = new Map<string, number>();

    io.forEach((val, key) => {
        res.set(key, val * num);
    });

    return res;
}*/

function collapse_flows(parts: Array<FlowLine>): FlowView {
    let res: FlowView = new Map<string, FlowViewItem>();

    parts.forEach((entry) => {
        if (!res.has(entry.resource)) {
            res.set(entry.resource, {
                total: 0,
                parts: []
            });
        }
        res.get(entry.resource)!.total += entry.rate;
        res.get(entry.resource)!.parts.push({
            rate: entry.rate,
            from: entry.from,
            to: entry.to,
        });
    });

    return res;
}

/*function sum_flow(parts: Array<Array<FlowLine>>): Array<FlowLine> {
    let res: Array<FlowLine> = new Array<FlowLine>();

    parts.forEach((part) => {
        part.forEach((entry) => {
            if (res.every((res_entry) => {
                if (res_entry.to == entry.to && res_entry.resource == entry.resource) {
                    entry.rate += res_entry.rate;
                    return false;
                }
                return true;
            })) {
                res.push(new FlowLine(
                    entry.host,
                    entry.resource,
                    entry.rate,
                    entry.from,
                    entry.to,
                ));
            }
        });
    });

    return res;
}

function mul_flow(io: Array<FlowLine>, num: number): Array<FlowLine> {
    return io.map((entry) => {
        return new FlowLine(
            entry.host,
            entry.resource,
            entry.rate * num,
            entry.from,
            entry.to,
        );
    });
}*/

function merge_flow_in(parts: Array<Array<FlowLine>>, new_to: FactoryNodeID): Array<FlowLine> {
    let res: Array<FlowLine> = new Array<FlowLine>();

    parts.forEach((part) => {
        part.forEach((entry) => {
            if (res.every((res_entry) => {
                if (res_entry.from == entry.from && res_entry.resource == entry.resource) {
                    entry.rate += res_entry.rate;
                    return false;
                }
                return true;
            })) {
                res.push(new FlowLine(
                    entry.host,
                    entry.resource,
                    entry.rate,
                    entry.from,
                    new_to,
                ));
            }
        });
    });

    return res;
}

function merge_flow_out(parts: Array<Array<FlowLine>>, new_from: FactoryNodeID): Array<FlowLine> {
    let res: Array<FlowLine> = new Array<FlowLine>();

    parts.forEach((part) => {
        part.forEach((entry) => {
            if (res.every((res_entry) => {
                if (res_entry.to == entry.to && res_entry.resource == entry.resource) {
                    entry.rate += res_entry.rate;
                    return false;
                }
                return true;
            })) {
                res.push(new FlowLine(
                    entry.host,
                    entry.resource,
                    entry.rate,
                    new_from,
                    entry.to,
                ));
            }
        });
    });

    return res;
}

type SplitResult = {
    mapping: Map<FactoryNodeID, Array<FactoryNodeID>>;
}

export type FactoryNodeType = "source" | "sink" | "hub" | "machine";

export abstract class FactoryNode {
    host: FactoryTab;
    id: FactoryNodeID;

    in: ProcessingIO;
    out: ProcessingIO;

    //For rendering
    x: number;
    y: number;

    elem: HTMLDivElement;
    elem_header: HTMLDivElement;
    elem_content: HTMLDivElement;

    constructor(host: FactoryTab, id: number | undefined, x: number, y: number) {
        this.host = host;
        this.in = {
            flows: []
        };
        this.out = {
            flows: []
        };

        this.elem = createElem(
            "div",
            ["factory-node"],
            new Map([["style", `position: absolue; left: ${this.x}; top: ${this.y}`]]),
            undefined,
            [
                this.elem_header = createElem("div", ["factory-node-header"]) as HTMLDivElement,
                this.elem_content = createElem("div", ["factory-node-content"]) as HTMLDivElement,
            ]
        ) as HTMLDivElement;
        this.set_position(x, y);

        this.elem_header.addEventListener("mousedown", (ev: MouseEvent) => {
            if (ev.target == this.elem_header) {
                if (ev.button == 0) {
                    ev.preventDefault();
                    this.host.add_selected_node(this, ev.ctrlKey);
                    this.host.drag_mode = "node";
                }
            }
        });

        this.elem_header.addEventListener("contextmenu", (ev: MouseEvent) => {
            ev.preventDefault();

            let menu = createElem("div", ["factory-context-menu"], undefined, undefined, this.create_context_menu());
            menu.style.left = `${ev.clientX}px`;
            menu.style.top = `${ev.clientY}px`;

            this.host.htmls.context_menu!.innerHTML = "";
            this.host.htmls.context_menu!.appendChild(menu);
            return false;
        });



        this.id = host.add_node(this, id);
        this.elem.setAttribute("data-id", this.id.toString());
    }

    set_position(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.elem.style.left = this.x + "px";
        this.elem.style.top = this.y + "px";

        this.in.flows.forEach(flow => {
            flow.update_position();
        });

        this.out.flows.forEach(flow => {
            flow.update_position();
        });
    }

    //Split into multiple nodes, but don't remap
    abstract split_inner(parts: Array<number>, dst: SplitResult);
    split(parts: Array<number>): Array<FactoryNode> {
        let dst: SplitResult = {
            mapping: new Map<FactoryNodeID, Array<FactoryNodeID>>()
        };

        let res: Array<FactoryNode> = [];

        this.split_inner(parts, dst);

        //For all old nodes
        dst.mapping.forEach((new_ids, old_id) => {
            //For all new children
            new_ids.forEach((new_id, split_idx) => {
                //For all old edges, insert a new one

                //Flows from old node:
                this.host.elems.get(old_id)!.out.flows.forEach(flow => {
                    let new_to = dst.mapping.get(flow.to)?.at(split_idx) ?? flow.to;

                    new FlowLine(
                        this.host,
                        flow.resource,
                        flow.rate * parts[split_idx],
                        new_id,
                        new_to
                    );

                });

                //Flows into old node:
                this.host.elems.get(old_id)!.in.flows.forEach(flow => {
                    if (!dst.mapping.has(flow.from)) {
                        let new_from = flow.from;

                        new FlowLine(
                            this.host,
                            flow.resource,
                            flow.rate * parts[split_idx],
                            new_from,
                            new_id,
                        );
                    }
                });

            })
        });

        //Delete all split nodes
        dst.mapping.forEach((new_ids, old_id) => {
            this.host.remove_node(old_id);
        });

        return res;
    }

    abstract get_name(): string;
    abstract get_type(): FactoryNodeType;

    static load(data, host: FactoryTab): FactoryNode {
        switch (data.type as FactoryNodeType) {
            case "source":
                return new FactorySource(host, data.id, data.x, data.y, data.resource, data.count);
                break;
            case "sink":
                return new FactorySink(host, data.id, data.x, data.y, data.resource, data.count);
                break;
            case "hub":
                return new FactoryHub(host, data.id, data.x, data.y, data.resource, data.count);
                break;
            case "machine":
                return new FactoryMachine(host, data.id, data.x, data.y, data.recipe, data.count);
                break;

        }
    }
    abstract save();

    abstract create_context_menu(): Array<HTMLDivElement>;

    static merge(parts: Array<FactoryNode>): FactoryNode | undefined {
        //Test for mergeability
        const first_node = parts[0];

        if (first_node instanceof FactorySource) {
            let total = 0;
            if (parts.every(val => {
                if ((val instanceof FactorySource) && (first_node.resource == val.resource)) {
                    total += val.count;
                    return true;
                }
                return false;
            })) {
                let merged_node = new FactorySource(first_node.host, undefined, first_node.x, first_node.y, first_node.resource, total);

                merge_flow_in(parts.map(part => part.in.flows), merged_node.id);
                merge_flow_out(parts.map(part => part.out.flows), merged_node.id);

                parts.forEach(part => {
                    part.host.remove_node(part.id);
                });

                return merged_node;
            }
        }

        if (first_node instanceof FactorySink) {
            let total = 0;
            if (parts.every(val => {
                if ((val instanceof FactorySink) && (first_node.resource == val.resource)) {
                    total += val.count;
                    return true;
                }
                return false;
            })) {
                let merged_node = new FactorySink(first_node.host, undefined, first_node.x, first_node.y, first_node.resource, total);

                merge_flow_in(parts.map(part => part.in.flows), merged_node.id);
                merge_flow_out(parts.map(part => part.out.flows), merged_node.id);

                parts.forEach(part => {
                    part.host.remove_node(part.id);
                });

                return merged_node;
            }
        }

        if (first_node instanceof FactoryHub) {
            let total = 0;
            if (parts.every(val => {
                if ((val instanceof FactoryHub) && (first_node.resource == val.resource)) {
                    total += val.count;
                    return true;
                }
                return false;
            })) {
                let merged_node = new FactoryHub(first_node.host, undefined, first_node.x, first_node.y, first_node.resource, total);

                merge_flow_in(parts.map(part => part.in.flows), merged_node.id);
                merge_flow_out(parts.map(part => part.out.flows), merged_node.id);

                parts.forEach(part => {
                    part.host.remove_node(part.id);
                });

                return merged_node;
            }
        }

        if (first_node instanceof FactoryMachine) {
            let total = 0;
            if (parts.every(val => {
                if ((val instanceof FactoryMachine) && (first_node.recipe == val.recipe)) {
                    total += val.recipe_count;
                    return true;
                }
                return false;
            })) {
                let merged_node = new FactoryMachine(first_node.host, undefined, first_node.x, first_node.y, first_node.recipe, first_node.recipe_count);

                merge_flow_in(parts.map(part => part.in.flows), merged_node.id);
                merge_flow_out(parts.map(part => part.out.flows), merged_node.id);

                parts.forEach(part => {
                    part.host.remove_node(part.id);
                });

                return merged_node;
            }
        }

        return undefined;
    }
};

export class FactorySource extends FactoryNode {
    resource: string;
    count: number;

    constructor(host: FactoryTab, id: number | undefined, x: number, y: number, resource: string, count: number) {
        super(host, id, x, y);

        this.resource = resource;
        this.count = count;

        this.elem.classList.add("factory-source");
        this.elem_content.appendChild(createElem(
            "div",
            ["factory-source-text"],
            undefined,
            "Source"
        ));
        this.elem_content.appendChild(createElem(
            "div",
            ["factory-source-amount"],
            undefined,
            num_to_str(this.count) + " x " + FACTORY_DATA.items[this.resource].name
        ));
    }

    split_inner(parts: Array<number>, dst: SplitResult) {
        let sum = parts.reduce((cumsum, val) => cumsum + val, 0);

        if (dst.mapping.has(this.id)) throw Error("assert");
        dst.mapping.set(this.id, []);

        parts.forEach((part) => {
            let new_node = new FactorySource(
                this.host,
                undefined,
                this.x,
                this.y,
                this.resource,
                this.count * part / sum
            );

            dst.mapping.get(this.id)!.push(new_node.id);
        });
    }

    get_name(): string {
        return `Source ${FACTORY_DATA.items[this.resource].name}`;
    }
    get_type(): FactoryNodeType {
        return "source";
    }

    save(): any {
        return {
            type: "source",
            id: this.id,
            x: this.x,
            y: this.y,
            resource: this.resource,
            count: this.count
        };
    }

    create_context_menu(): Array<HTMLDivElement> {
        return [];
    }
};

export class FactorySink extends FactoryNode {
    resource: string;
    count: number;

    constructor(host: FactoryTab, id: number | undefined, x: number, y: number, resource: string, count: number) {
        super(host, id, x, y);

        this.resource = resource;
        this.count = count;

        this.elem.classList.add("factory-sink");
        this.elem_content.appendChild(createElem(
            "div",
            ["factory-sink-text"],
            undefined,
            "Sink"
        ));
        this.elem_content.appendChild(createElem(
            "div",
            ["factory-sink-amount"],
            undefined,
            num_to_str(this.count) + " x " + FACTORY_DATA.items[this.resource].name
        ));
    }

    split_inner(parts: Array<number>, dst: SplitResult) {
        let sum = parts.reduce((cumsum, val) => cumsum + val, 0);

        if (dst.mapping.has(this.id)) throw Error("assert");
        dst.mapping.set(this.id, []);

        parts.forEach((part) => {
            let new_node = new FactorySink(
                this.host,
                undefined,
                this.x,
                this.y,
                this.resource,
                this.count * part / sum
            );

            dst.mapping.get(this.id)!.push(new_node.id);
        });
    }

    get_name(): string {
        return `Sink ${FACTORY_DATA.items[this.resource].name}`;
    }
    get_type(): FactoryNodeType {
        return "sink";
    }

    save(): any {
        return {
            type: "sink",
            id: this.id,
            x: this.x,
            y: this.y,
            resource: this.resource,
            count: this.count
        };
    }

    create_context_menu(): Array<HTMLDivElement> {
        return [];
    }
};

export class FactoryHub extends FactoryNode {
    resource: string;
    count: number;

    constructor(host: FactoryTab, id: number | undefined, x: number, y: number, resource: string, count: number) {
        super(host, id, x, y);

        this.resource = resource;
        this.count = count;

        this.elem.classList.add("factory-hub");
        this.elem_content.appendChild(createElem(
            "div",
            ["factory-hub-amount"],
            undefined,
            num_to_str(this.count) + " x " + FACTORY_DATA.items[this.resource].name
        ));
    }

    split_inner(parts: Array<number>, dst: SplitResult) {
        let sum = parts.reduce((cumsum, val) => cumsum + val, 0);

        if (dst.mapping.has(this.id)) throw Error("assert");
        dst.mapping.set(this.id, []);

        parts.forEach((part) => {
            let new_node = new FactoryHub(
                this.host,
                undefined,
                this.x,
                this.y,
                this.resource,
                this.count * part / sum
            );

            dst.mapping.get(this.id)!.push(new_node.id);
        });
    }

    try_eliminate() {
        if (this.in.flows.length == 0 || this.out.flows.length == 0) {
            this.host.remove_node(this.id);
            return;
        }

        if (this.out.flows.length == 1) {
            this.in.flows.forEach(flow => {
                new FlowLine(this.host, flow.resource, flow.rate,
                    flow.from, this.out.flows[0].to);
            });
            this.host.remove_node(this.id);
        } else {
            if (this.in.flows.length == 1) {
                this.out.flows.forEach(flow => {
                    new FlowLine(this.host, flow.resource, flow.rate,
                        this.in.flows[0].from, flow.to);
                });
                this.host.remove_node(this.id);
            }
        }
    }

    get_name(): string {
        return `Hub ${FACTORY_DATA.items[this.resource].name}`;
    }
    get_type(): FactoryNodeType {
        return "hub";
    }

    save(): any {
        return {
            type: "hub",
            id: this.id,
            x: this.x,
            y: this.y,
            resource: this.resource,
            count: this.count
        };
    }

    extract(in_parts: Array<number>, out_parts: Array<number>) {
        let total_in = 0;
        let total_out = 0;
        let any_in = false;
        let any_out = false;

        in_parts.forEach((val) => {
            if (isNaN(val)) {
                any_in = true;
            } else {
                total_in += val;
            }
        });

        out_parts.forEach((val) => {
            if (isNaN(val)) {
                any_out = true;
            } else {
                total_out += val;
            }
        });

        let total = Math.max(total_in, total_out);

        if (total == total_in) any_in = false;
        if (total == total_out) any_out = false;

        //Assign any-s
        in_parts.forEach((val, idx, arr) => {
            if (isNaN(val)) {
                let new_total = Math.min(total, total_in + this.in.flows[idx].rate);
                arr[idx] = new_total - total_in;
                total_in = new_total;
            }
        });
        out_parts.forEach((val, idx, arr) => {
            if (isNaN(val)) {
                let new_total = Math.min(total, total_out + this.out.flows[idx].rate);
                arr[idx] = new_total - total_out;
                total_out = new_total;
            }
        });

        console.log(in_parts, out_parts);

        let node = new FactoryHub(this.host, undefined, this.x, this.y + 200, this.resource, total);

        let to_remove = new Array<FlowLine>();
        in_parts.forEach((val, idx) => {
            let left = this.in.flows[idx].rate - val;
            to_remove.push(this.in.flows[idx]);
            //float error
            if (left > 1e-6) {
                new FlowLine(this.host, this.resource, left, this.in.flows[idx].from, this.id);
            }
            if (val > 1e-6) {
                new FlowLine(this.host, this.resource, val, this.in.flows[idx].from, node.id);
            }
        });
        out_parts.forEach((val, idx) => {
            let left = this.out.flows[idx].rate - val;
            to_remove.push(this.out.flows[idx]);
            //float error
            if (left > 1e-6) {
                new FlowLine(this.host, this.resource, left, this.id, this.out.flows[idx].to);
            }
            if (val > 1e-6) {
                new FlowLine(this.host, this.resource, val, node.id, this.out.flows[idx].to);
            }
        });
        to_remove.forEach(flow => {
            this.host.remove_flow(flow);
        });

        node.try_eliminate();

        this.set_position(this.x, this.y);
        node.set_position(node.x, node.y);
    }

    create_context_menu(): Array<HTMLDivElement> {
        let entry_eliminate = createElem("div", ["factory-context-row"], undefined, "Eliminate") as HTMLDivElement;
        entry_eliminate.addEventListener("click", () => {
            this.host.htmls.context_menu!.innerHTML = "";
            this.try_eliminate();
        });

        return [
            entry_eliminate
        ];
    }
};

export class FactoryMachine extends FactoryNode {
    recipe: string;
    recipe_count: number;

    constructor(host: FactoryTab, id: number | undefined, x: number, y: number, recipe: string, recipe_count: number) {
        super(host, id, x, y);

        this.recipe = recipe;
        this.recipe_count = recipe_count;

        this.elem.classList.add("factory-machine");
        this.elem_content.appendChild(createElem(
            "div",
            ["factory-machine-recipe"],
            undefined,
            FACTORY_DATA.productionRecipes[this.recipe].name
        ));
        this.elem_content.appendChild(createElem(
            "div",
            ["factory-machine-name"],
            undefined,
            num_to_str(this.recipe_count * FACTORY_DATA.productionRecipes[this.recipe].craftTime / 60) + " x " + FACTORY_DATA.buildables[FACTORY_DATA.productionRecipes[this.recipe].producedIn].name
        ));
    }

    split_inner(parts: Array<number>, dst: SplitResult) {
        let sum = parts.reduce((cumsum, val) => cumsum + val, 0);

        if (dst.mapping.has(this.id)) throw Error("assert");
        dst.mapping.set(this.id, []);

        parts.forEach((part) => {
            let new_node = new FactoryMachine(
                this.host,
                undefined,
                this.x,
                this.y,
                this.recipe,
                this.recipe_count * part / sum
            );

            dst.mapping.get(this.id)!.push(new_node.id);
        });
    }

    get_name(): string {
        return `${num_to_str(this.recipe_count * FACTORY_DATA.productionRecipes[this.recipe].craftTime / 60)} x ${FACTORY_DATA.buildables[FACTORY_DATA.productionRecipes[this.recipe].producedIn].name}`;
    }
    get_type(): FactoryNodeType {
        return "machine";
    }

    save(): any {
        return {
            type: "machine",
            id: this.id,
            x: this.x,
            y: this.y,
            recipe: this.recipe,
            count: this.recipe_count
        };
    }

    create_context_menu(): Array<HTMLDivElement> {
        return [];
    }
};

/*
export class FactoryComposite extends FactoryNode {
    name: string;
    components: Array<FactoryNode>;

    constructor(host: FactoryTab, x: number, y: number, name: string, components: Array<FactoryNode>) {
        super(
            host,
            x,
            y
        );

        this.name = name;
        this.components = components;

        this.elem.classList.add("factory-composite");
        let in_elem: HTMLInputElement;
        this.elem_content.appendChild(in_elem = createElem(
            "input",
            ["factory-composite-name"],
            new Map([["value", this.name]])) as HTMLInputElement);
        in_elem.onchange = (ev) => {
            this.name = in_elem.value
        };
    }


    split_inner(parts: Array<number>, dst: SplitResult) {
        let split_components = this.components.map(comp => comp.split(parts));

        if (dst.mapping.has(this.id)) throw Error("assert");
        dst.mapping.set(this.id, []);

        parts.forEach((part, i) => {
            let new_node = new FactoryComposite(
                this.host,
                this.x,
                this.y,
                "Unnamed",
                split_components.map(split => split[i])
            );

            dst.mapping.get(this.id)!.push(new_node.id);
        });
    }
}*/
