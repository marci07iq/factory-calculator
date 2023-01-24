import { triggerAsyncId } from "async_hooks";
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

        this.host.elems.get(this.from)!.out.add(this);
        this.host.elems.get(this.to)!.in.add(this);

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

export class FlowViewItem {
    total: number;
    parts: Array<FlowLine>;
    
    constructor(parts: Array<FlowLine> = []) {
        this.parts = parts;
        this.total = parts.reduce<number>((sum, part) => {
            return sum = part.rate;
        }, 0);
    }

    add(line: FlowLine) {
        this.parts.push(line);
        this.total += line.rate;
    }

    remove(line: FlowLine) {
        this.parts = this.parts.filter((part) => {
            if(part == line) {
                this.total -= part.rate;
                return false;
            }
            return true;
        });
    }
};

export class ProcessingIO extends Map<string, FlowViewItem>{

    constructor() {
        super();
    }

    get_always(resource: string) {
        if(!this.has(resource)) {
            this.set(resource, new FlowViewItem());
        }
        return this.get(resource)!;
    }

    add(line: FlowLine) {
        this.get_always(line.resource).add(line);
    }


    remove(line: FlowLine) {
        this.get(line.resource)?.remove(line);
    }

    forEachFlat(callback: (val: FlowLine, index: number) => void) {
        let index = 0;
        this.forEach((batch) => {
            batch.parts.forEach((line) => {
                callback(line, index++);
            });
        });
    }

    everyFlat(callback: (val: FlowLine, index: number) => boolean) {
        let index = 0;
        let res: boolean = true;
        for(const [key, value] of this) {
            res &&= value.parts.every((line) => {
                return callback(line, index++);
            });
            if(!res) return false;
        }
        return res;
    }
};

/*function collapse_flows(parts: Array<FlowLine>): FlowView {
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
}*/

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

function merge_flow_in(parts: Array<ProcessingIO>, new_to: FactoryNodeID): ProcessingIO {
    let res = new ProcessingIO();

    parts.forEach((part) => {
        part.forEachFlat((entry) => {
            if(res.get_always(entry.resource).parts.every((res_entry) => {
                if (res_entry.from == entry.from && res_entry.resource == entry.resource) {
                    res_entry.rate += entry.rate;
                    return false;
                }
                return true;
            })) {
                res.get_always(entry.resource).add(new FlowLine(
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

function merge_flow_out(parts: Array<ProcessingIO>, new_from: FactoryNodeID): ProcessingIO {
    let res = new ProcessingIO();

    parts.forEach((part) => {
        part.forEachFlat((entry) => {
            if(res.get_always(entry.resource).parts.every((res_entry) => {
                if (res_entry.to == entry.to && res_entry.resource == entry.resource) {
                    res_entry.rate += entry.rate;
                    return false;
                }
                return true;
            })) {
                res.get_always(entry.resource).add(new FlowLine(
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
        this.in = new ProcessingIO();
        this.out = new ProcessingIO();

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

        this.in.forEachFlat(flow => {
            flow.update_position();
        });

        this.out.forEachFlat(flow => {
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
                this.host.elems.get(old_id)!.out.forEachFlat(flow => {
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
                this.host.elems.get(old_id)!.in.forEachFlat(flow => {
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

    abstract create_sidebar_menu(): Array<HTMLElement>;
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

                merge_flow_in(parts.map(part => part.in), merged_node.id);
                merge_flow_out(parts.map(part => part.out), merged_node.id);

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

                merge_flow_in(parts.map(part => part.in), merged_node.id);
                merge_flow_out(parts.map(part => part.out), merged_node.id);

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

                merge_flow_in(parts.map(part => part.in), merged_node.id);
                merge_flow_out(parts.map(part => part.out), merged_node.id);

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

                merge_flow_in(parts.map(part => part.in), merged_node.id);
                merge_flow_out(parts.map(part => part.out), merged_node.id);

                parts.forEach(part => {
                    part.host.remove_node(part.id);
                });

                return merged_node;
            }
        }

        return undefined;
    }
};

export abstract class FactoryLogistic extends FactoryNode {
    resource: string;
    count: number;

    constructor(host: FactoryTab, id: number | undefined, x: number, y: number, resource: string, count: number) {
        super(host, id, x, y);

        this.resource = resource;
        this.count = count;
    }

    save(): any {
        return {
            type: this.get_type(),
            id: this.id,
            x: this.x,
            y: this.y,
            resource: this.resource,
            count: this.count
        };
    }

    create_sidebar_menu(): Array<HTMLElement> {
        let extraction_ratios = [Array<number>(this.in.get_always(this.resource).parts.length).fill(0), Array<number>(this.out.get_always(this.resource).parts.length).fill(0)];

        let res = new Array<HTMLElement>();

        let build_table = (view: ProcessingIO, type: string, arr: Array<HTMLElement>, io: number) => {
            let flows = view.get(type);
            if (flows !== undefined) {
                //arr.push(createElem("div", ["factory-sidebar-io-resource"], undefined, FACTORY_DATA.items[type].name));

                arr.push(createElem("table", ["factory-sidebar-io"], undefined, undefined, flows.parts.map((flow, idx) => {
                    const btn_text = ["0", "?", "*"];
                    const btn_vals = [0, NaN, flow.rate];
                    let btns = btn_text.map(caption => createElem("button", ["factory-sidebar-io-splitter"], undefined, caption));

                    btns.forEach((btn1, idx1) => {
                        btn1.addEventListener("click", () => {
                        extraction_ratios[io][idx] = btn_vals[idx1];
                        btns.forEach((btn2, idx2) => {
                            if(idx1 == idx2) {
                                btn2.classList.add("factory-sidebar-io-splitter-selected");
                            } else {
                                btn2.classList.remove("factory-sidebar-io-splitter-selected");
                            }
                        });
                    })});

                    return createElem("tr", ["factory-sidebar-io-row"], undefined, undefined, [
                        createElem("td", ["factory-sidebar-io-cell"], undefined, num_to_str(flow.rate)),
                        ...btns.map(btn => createElem("td", ["factory-sidebar-io-cell"], undefined, undefined, [btn]))
                    ]);
                })));
            }
        };


        let in_items = new Array<HTMLElement>();
        in_items.push(createElem("div", ["factory-sidebar-io-header"], undefined, "In"));
        build_table(this.in, this.resource, in_items, 0)
        res.push(createElem("div", ["factory-sidebar-entry"], undefined, undefined, in_items) as HTMLDivElement);

        let out_items = new Array<HTMLElement>();
        out_items.push(createElem("div", ["factory-sidebar-io-header"], undefined, "Out"));
        build_table(this.out, this.resource, out_items, 1)
        res.push(createElem("div", ["factory-sidebar-entry"], undefined, undefined, out_items) as HTMLDivElement);


        res.push(createElem("div", ["factory-sidebar-entry"], undefined, undefined, [0].map(() => {
            let btn = createElem("button", ["factory-sidebar-button"], undefined, "Extract");
            btn.addEventListener("click", () => {
                this.extract(this.resource, extraction_ratios[0], extraction_ratios[1]);
            })
            return btn;
        })) as HTMLDivElement);

        return res;

    }

    create_context_menu(): Array<HTMLDivElement> {
        return [];
    }


    extract(resource: string, in_parts: Array<number>, out_parts: Array<number>) {
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
                let new_total = Math.min(total, total_in + this.in.get_always(resource).parts[idx].rate);
                arr[idx] = new_total - total_in;
                total_in = new_total;
            }
        });
        out_parts.forEach((val, idx, arr) => {
            if (isNaN(val)) {
                let new_total = Math.min(total, total_out + this.out.get_always(resource).parts[idx].rate);
                arr[idx] = new_total - total_out;
                total_out = new_total;
            }
        });

        let node = new (Object.getPrototypeOf(this).constructor)(this.host, undefined, this.x, this.y + 200, this.resource, total) as FactoryLogistic;

        let to_remove = new Array<FlowLine>();
        in_parts.forEach((val, idx) => {
            let left = this.in.get_always(resource).parts[idx].rate - val;
            to_remove.push(this.in.get_always(resource).parts[idx]);
            //float error
            if (left > 1e-6) {
                new FlowLine(this.host, this.resource, left, this.in.get_always(resource).parts[idx].from, this.id);
            }
            if (val > 1e-6) {
                new FlowLine(this.host, this.resource, val, this.in.get_always(resource).parts[idx].from, node.id);
            }
        });
        out_parts.forEach((val, idx) => {
            let left = this.out.get_always(resource).parts[idx].rate - val;
            to_remove.push(this.out.get_always(resource).parts[idx]);
            //float error
            if (left > 1e-6) {
                new FlowLine(this.host, this.resource, left, this.id, this.out.get_always(resource).parts[idx].to);
            }
            if (val > 1e-6) {
                new FlowLine(this.host, this.resource, val, node.id, this.out.get_always(resource).parts[idx].to);
            }
        });
        to_remove.forEach(flow => {
            this.host.remove_flow(flow);
        });

        if (node instanceof FactoryHub) {
            node.try_eliminate();
        }

        this.set_position(this.x, this.y);
        node.set_position(node.x, node.y);
    }

};

export class FactorySource extends FactoryLogistic {
    constructor(host: FactoryTab, id: number | undefined, x: number, y: number, resource: string, count: number) {
        super(host, id, x, y, resource, count);

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

    create_context_menu(): Array<HTMLDivElement> {
        return [];
    }
};

export class FactorySink extends FactoryLogistic {

    constructor(host: FactoryTab, id: number | undefined, x: number, y: number, resource: string, count: number) {
        super(host, id, x, y, resource, count);

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

    create_context_menu(): Array<HTMLDivElement> {
        return [];
    }
};

export class FactoryHub extends FactoryLogistic {
    constructor(host: FactoryTab, id: number | undefined, x: number, y: number, resource: string, count: number) {
        super(host, id, x, y, resource, count);

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
        //Nothing in or out, can trivially remove
        let in_cnt = (this.in.get(this.resource)?.parts.length ?? 0);
        let out_cnt = (this.out.get(this.resource)?.parts.length ?? 0);
        if (in_cnt == 0 || out_cnt == 0) {
            this.host.remove_node(this.id);
            return;
        }

        if (out_cnt == 1) {
            this.in.get(this.resource)?.parts.forEach(flow => {
                new FlowLine(this.host, flow.resource, flow.rate,
                    flow.from, this.out.get(this.resource)!.parts.at(0)!.to);
            });
            this.host.remove_node(this.id);
        } else {
            if (in_cnt == 1) {
                this.out.get(this.resource)?.parts.forEach(flow => {
                    new FlowLine(this.host, flow.resource, flow.rate,
                        this.in.get(this.resource)!.parts.at(0)!.from, flow.to);
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
        return FACTORY_DATA.productionRecipes[this.recipe].name;
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

    create_sidebar_menu(): Array<HTMLElement> {
        //let extraction_ratios = [Array<number>(this.in.flows.length).fill(0), Array<number>(this.out.flows.length).fill(0)];

        let res = new Array<HTMLElement>();

        let build_table = (view, arr, io) => {
            for (let [type, flows] of view) {
                arr.push(createElem("div", ["factory-sidebar-io-resource"], undefined, FACTORY_DATA.items[type].name));

                arr.push(createElem("table", ["factory-sidebar-io"], undefined, undefined, flows.parts.map((flow, idx) => {
                    /*let btn_a = createElem("button", ["factory-sidebar-io-splitter"], undefined, "0");
                    let btn_b = createElem("button", ["factory-sidebar-io-splitter"], undefined, "?");
                    let btn_c = createElem("button", ["factory-sidebar-io-splitter"], undefined, "*");

                    btn_a.addEventListener("click", () => {
                        extraction_ratios[io][idx] = 0;
                        btn_a.classList.add("factory-sidebar-io-splitter-selected");
                        btn_b.classList.remove("factory-sidebar-io-splitter-selected");
                        btn_c.classList.remove("factory-sidebar-io-splitter-selected");
                    });
                    btn_b.addEventListener("click", () => {
                        extraction_ratios[io][idx] = NaN;
                        btn_a.classList.remove("factory-sidebar-io-splitter-selected");
                        btn_b.classList.add("factory-sidebar-io-splitter-selected");
                        btn_c.classList.remove("factory-sidebar-io-splitter-selected");
                    });
                    btn_c.addEventListener("click", () => {
                        extraction_ratios[io][idx] = flow.rate;
                        btn_a.classList.remove("factory-sidebar-io-splitter-selected");
                        btn_b.classList.remove("factory-sidebar-io-splitter-selected");
                        btn_c.classList.add("factory-sidebar-io-splitter-selected");
                    });*/

                    return createElem("tr", ["factory-sidebar-io-row"], undefined, undefined, [
                        createElem("td", ["factory-sidebar-io-cell"], undefined, num_to_str(flow.rate)),
                        //createElem("td", ["factory-sidebar-io-cell"], undefined, undefined, [btn_a]),
                        //createElem("td", ["factory-sidebar-io-cell"], undefined, undefined, [btn_b]),
                        //createElem("td", ["factory-sidebar-io-cell"], undefined, undefined, [btn_c]),
                    ]);
                })));
            }
        };


        let in_items = new Array<HTMLElement>();
        in_items.push(createElem("div", ["factory-sidebar-io-header"], undefined, "In"));
        build_table(this.in, in_items, 0);
        res.push(createElem("div", ["factory-sidebar-entry"], undefined, undefined, in_items) as HTMLDivElement);

        let out_items = new Array<HTMLElement>();
        out_items.push(createElem("div", ["factory-sidebar-io-header"], undefined, "Out"));
        build_table(this.out, out_items, 1);
        res.push(createElem("div", ["factory-sidebar-entry"], undefined, undefined, out_items) as HTMLDivElement);


        /*res.push(createElem("div", ["factory-sidebar-entry"], undefined, undefined, [0].map(() => {
            let btn = createElem("button", ["factory-sidebar-button"], undefined, "Extract");
            btn.addEventListener("click", () => {
                this.extract(extraction_ratios[0], extraction_ratios[1]);
            })
            return btn;
        })) as HTMLDivElement);*/

        return res;

    }

    create_context_menu(): Array<HTMLDivElement> {
        return [];
    }
};

/*
export class FactoryComposite extends FactoryNode {
    name: string;
    components: Map<FactoryNodeID, FactoryNode>;
    io_hubs =  

    constructor(host: FactoryTab, id: FactoryNodeID | undefined, x: number, y: number, name: string, components: Array<FactoryNode>) {
        super(
            host,
            id,
            x,
            y
        );

        this.name = name;
        this.components = new Map<FactoryNodeID, FactoryNode>();
        components.forEach(comp => {
            this.components.set(comp.id, comp);
        });


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
