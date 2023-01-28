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

        this.host.elems.get(this.from)!.io[1].add(this);
        this.host.elems.get(this.to)!.io[0].add(this);

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
            if (part == line) {
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
        if (!this.has(resource)) {
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
        for (const [key, value] of this) {
            res &&= value.parts.every((line) => {
                return callback(line, index++);
            });
            if (!res) return false;
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
            if (res.get_always(entry.resource).parts.every((res_entry) => {
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
            if (res.get_always(entry.resource).parts.every((res_entry) => {
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

    io: [ProcessingIO, ProcessingIO];

    //For rendering
    x: number;
    y: number;

    elem: HTMLDivElement;
    elem_header: HTMLDivElement;
    elem_content: HTMLDivElement;

    count: number;

    constructor(host: FactoryTab, id: number | undefined, x: number, y: number) {
        this.host = host;
        this.io = [new ProcessingIO(), new ProcessingIO()];

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

        this.io.forEach(io_entry => io_entry.forEachFlat(flow => {
            flow.update_position();
        }));
    }
    abstract update_element();

    //Get the effective "recipe" of the node, that count measures
    abstract ratios(): [Map<string, number>, Map<string, number>];
    //Split into multiple nodes, but don't remap
    //abstract split_inner(parts: [Map<string, Array<number>>, Map<string, Array<number>>], dst: SplitResult);
    abstract split_nodes(sizes: Array<number>): Array<FactoryNode>;

    //part[side{resource: [components]}]
    extract(parts: Array<[Map<string, Array<number>>, Map<string, Array<number>>]>) {
        let total_min = 0;
        let total_max = 0;
        let part_requests = new Array<[number, number]>();
        let resource_lims = new Array<[Map<string, [number, number]>, Map<string, [number, number]>]>();

        let ratios = this.ratios();
        //console.log(ratios);

        parts.forEach((part, pidx) => {
            let recipe_min = 0;
            let recipe_max = Infinity;
            let resource_lims_entry: [Map<string, [number, number]>, Map<string, [number, number]>] = [new Map<string, [number, number]>(), new Map<string, [number, number]>()];
            part.forEach((side, sidx) => {
                let side_min = 0;
                let side_max = Infinity;
                for (let [resource, comps] of side) {
                    let resource_min = 0;
                    let resource_max = 0;
                    comps.forEach((comp, cidx) => {
                        let flow = this.io[sidx].get(resource)!.parts[cidx].rate;
                        if (isNaN(comp)) {
                            resource_max += flow;
                        } else {
                            //Cap to limits
                            comps[cidx] = comp = Math.min(Math.max(0, comp), flow);
                            resource_min += comp;
                            resource_max += comp;
                        }
                    });
                    //console.log(pidx, sidx, resource, resource_min, resource_max);
                    resource_lims_entry[sidx].set(resource, [resource_min, resource_max]);


                    let mul = ratios[sidx].get(resource)!;
                    //console.log(mul);
                    let resource_norm_min = (resource_min == 0 && mul == 0) ? 0 : (resource_min / mul);
                    let resource_norm_max = (resource_max == 0 && mul == 0) ? Infinity : (resource_max / mul);
                    side_min = Math.max(resource_norm_min, side_min);
                    side_max = Math.min(resource_norm_max, side_max);

                    //console.log(pidx, sidx, resource, side_min, side_max);
                }
                recipe_min = Math.max(side_min, recipe_min);
                recipe_max = Math.min(side_max, recipe_max);
                //console.log(pidx, sidx, recipe_min, recipe_max);
                if (recipe_min - 1e-6 > recipe_max) {
                    throw new Error("Impossible");
                }
            });
            part_requests.push([recipe_min, recipe_max]);
            resource_lims.push(resource_lims_entry);
            total_min += recipe_min;
            total_max += recipe_max;
            //console.log(pidx, total_min, total_max);
            if (total_min - 1e-6 > total_max) {
                throw new Error("Impossible");
            }
        });

        //Insert a new blank part
        if (total_max < this.count) {
            let resource_lims_entry: [Map<string, [number, number]>, Map<string, [number, number]>] = [new Map<string, [number, number]>(), new Map<string, [number, number]>()];

            let map_io: [Map<string, Array<number>>, Map<string, Array<number>>] = [new Map<string, Array<number>>(), new Map<string, Array<number>>()];
            this.io.forEach((io_entry, io_idx) => io_entry.forEach((item, resource) => {
                map_io[io_idx].set(resource, item.parts.map(flow => NaN));
                resource_lims_entry[io_idx].set(resource, [0, item.total]);
            }));

            parts.push(map_io);
            part_requests.push([0, this.count]);
            resource_lims.push(resource_lims_entry);
            total_max += this.count;
        }

        //Calculate part sizes (greedy)
        let total_free = this.count - total_min;
        let part_sizes = part_requests.map(req => {
            let opt_size = Math.min(req[1] - req[0], total_free);
            total_free -= opt_size;
            return req[0] + opt_size;
        });

        //Assign any-s (greedy)
        parts.forEach((part, pidx) => {
            part.forEach((side, sidx) => {
                for (let [resource, comps] of side) {
                    let mul = ratios[sidx].get(resource)!;
                    //Amount that needs to be allocated to this batch
                    let resource_num = mul * part_sizes[pidx];
                    //Range that can be allocated
                    let resource_lim = resource_lims[pidx][sidx].get(resource)!;
                    //console.log(pidx, sidx, resource_num, resource_lim);
                    //Amount that needs to be allocated to any-s
                    let resource_free = resource_num - resource_lim[0];
                    comps.forEach((comp, cidx) => {
                        if (isNaN(comp)) {
                            let flow = this.io[sidx].get(resource)!.parts[cidx].rate;
                            let new_flow = Math.min(flow, resource_free);
                            //console.log(pidx, sidx, resource, cidx, flow, new_flow);
                            resource_free -= new_flow;
                            this.io[sidx].get(resource)!.parts[cidx].rate -= new_flow;

                            comps[cidx] = new_flow;
                        } else {
                            let flow = this.io[sidx].get(resource)!.parts[cidx].rate;
                            //console.log(pidx, sidx, resource, cidx, flow, comp);
                            this.io[sidx].get(resource)!.parts[cidx].rate -= comp;
                        }
                    });
                }
            });
        });

        //console.log(total_min, total_max);
        //console.log(part_requests);
        //console.log(resource_lims);
        //console.log(part_sizes);
        //console.log(parts);
        //return;

        let new_nodes = this.split_nodes(part_sizes);

        parts.forEach((part, pidx) => {
            part.forEach((side, sidx) => {
                for (let [resource, comps] of side) {
                    let mul = ratios[sidx].get(resource)!;
                    //Amount that needs to be allocated to this batch
                    let resource_num = mul * part_sizes[pidx];
                    //Range that can be allocated
                    let resource_lim = resource_lims[pidx][sidx].get(resource)!;
                    //Amount that needs to be allocated to any-s
                    let resource_free = resource_num - resource_lim[0];
                    comps.forEach((comp, cidx) => {
                        let flow = this.io[sidx].get(resource)!.parts[cidx];
                        if(comp > 1e-6) {
                            new FlowLine(this.host, flow.resource, comp, (sidx == 0) ? flow.from : new_nodes[pidx].id, (sidx == 1) ? flow.to : new_nodes[pidx].id);
                        }
                    });
                }
            });
        });


        this.host.remove_node(this.id);
        new_nodes.forEach(node => {
            node.set_position(node.x, node.y);
            node.update_element();
            if (node instanceof FactoryHub) {
                node.try_eliminate();
            }
        });
    }

    /*split(parts: [Map<string, Array<number>>, Map<string, Array<number>>]): Array<FactoryNode> {
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
                this.host.elems.get(old_id)![1].forEachFlat(flow => {
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
                this.host.elems.get(old_id)![0].forEachFlat(flow => {
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
    }*/

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

    create_sidebar_menu(): Array<HTMLElement> {
        //let extraction_ratios = [Array<number>(this.in.flows.length).fill(0), Array<number>(this.out.flows.length).fill(0)];
        let extraction_ratios: [Map<string, Array<number>>, Map<string, Array<number>>] = [
            new Map<string, Array<number>>(),
            new Map<string, Array<number>>()
        ];

        let res = new Array<HTMLElement>();

        let build_table = (io_idx: number, res_arr: Array<HTMLElement>) => {
            for (let [resource, flows] of this.io[io_idx]) {
                res_arr.push(createElem("div", ["factory-sidebar-io-resource"], undefined, FACTORY_DATA.items[resource].name));

                let extraction_ratio = Array<number>(this.io[io_idx].get_always(resource).parts.length).fill(0);
                extraction_ratios[io_idx].set(resource, extraction_ratio);

                res_arr.push(createElem("table", ["factory-sidebar-io"], undefined, undefined, flows.parts.map((flow, idx) => {
                    const btn_text = ["0", "?", "x", "*"];
                    const btn_vals = [0, NaN, undefined, flow.rate];
                    let btns = btn_text.map(caption => createElem("button", ["factory-sidebar-io-splitter"], undefined, caption));

                    btns.forEach((btn1, idx1) => {
                        btn1.addEventListener("click", () => {
                            extraction_ratio[idx] = btn_vals[idx1] ?? (Number(prompt("Value") ?? "0"));
                            btns.forEach((btn2, idx2) => {
                                if (idx1 == idx2) {
                                    btn2.classList.add("factory-sidebar-io-splitter-selected");
                                } else {
                                    btn2.classList.remove("factory-sidebar-io-splitter-selected");
                                }
                            });
                        })
                    });

                    return createElem("tr", ["factory-sidebar-io-row"], undefined, undefined, [
                        createElem("td", ["factory-sidebar-io-cell"], undefined, num_to_str(flow.rate)),
                        ...btns.map(btn => createElem("td", ["factory-sidebar-io-cell"], undefined, undefined, [btn]))
                    ]);
                })));
            }
        };


        let in_items = new Array<HTMLElement>();
        in_items.push(createElem("div", ["factory-sidebar-io-header"], undefined, "In"));
        build_table(0, in_items);
        res.push(createElem("div", ["factory-sidebar-entry"], undefined, undefined, in_items) as HTMLDivElement);

        let out_items = new Array<HTMLElement>();
        out_items.push(createElem("div", ["factory-sidebar-io-header"], undefined, "Out"));
        build_table(1, out_items);
        res.push(createElem("div", ["factory-sidebar-entry"], undefined, undefined, out_items) as HTMLDivElement);

        res.push(createElem("div", ["factory-sidebar-entry"], undefined, undefined, [0].map(() => {
            let btn = createElem("button", ["factory-sidebar-button"], undefined, "Extract");
            btn.addEventListener("click", () => {
                //console.log(extraction_ratios);
                this.extract([extraction_ratios]);
            })
            return btn;
        })) as HTMLDivElement);

        return res;

    }
    abstract create_context_menu(): Array<HTMLDivElement>;

    static merge(parts: Array<FactoryNode>): FactoryNode | undefined {
        //Test for mergeability
        const first_node = parts[0];

        if (first_node instanceof FactoryLogistic) {
            let total = 0;
            if (parts.every(val => {
                if (val instanceof FactoryLogistic && (val.get_type() == first_node.get_type()) && (first_node.resource == val.resource)) {
                    total += val.count;
                    return true;
                }
                return false;
            })) {
                let merged_node = (new (Object.getPrototypeOf(first_node).constructor)(first_node.host, undefined, first_node.x, first_node.y, first_node.resource, total)) as FactoryLogistic;

                merge_flow_in(parts.map(part => part.io[0]), merged_node.id);
                merge_flow_out(parts.map(part => part.io[1]), merged_node.id);

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
                    total += val.count;
                    return true;
                }
                return false;
            })) {
                let merged_node = new FactoryMachine(first_node.host, undefined, first_node.x, first_node.y, first_node.recipe, first_node.count);

                merge_flow_in(parts.map(part => part.io[0]), merged_node.id);
                merge_flow_out(parts.map(part => part.io[1]), merged_node.id);

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

    /*create_sidebar_menu(): Array<HTMLElement> {
        let extraction_ratios = [Array<number>(this.io[0].get_always(this.resource).parts.length).fill(0), Array<number>(this.io[1].get_always(this.resource).parts.length).fill(0)];

        let res = new Array<HTMLElement>();

        let build_table = (view: ProcessingIO, type: string, arr: Array<HTMLElement>, io: number) => {
            let flows = view.get(type);
            if (flows !== undefined) {
                //arr.push(createElem("div", ["factory-sidebar-io-resource"], undefined, FACTORY_DATA.items[type].name));

                arr.push(createElem("table", ["factory-sidebar-io"], undefined, undefined, flows.parts.map((flow, idx) => {
                    const btn_text = ["0", "?", "x", "*"];
                    const btn_vals = [0, NaN, undefined, flow.rate];
                    let btns = btn_text.map(caption => createElem("button", ["factory-sidebar-io-splitter"], undefined, caption));

                    btns.forEach((btn1, idx1) => {
                        btn1.addEventListener("click", () => {
                            extraction_ratios[io][idx] = btn_vals[idx1] ?? (Number(prompt("Value") ?? "0"));
                            btns.forEach((btn2, idx2) => {
                                if (idx1 == idx2) {
                                    btn2.classList.add("factory-sidebar-io-splitter-selected");
                                } else {
                                    btn2.classList.remove("factory-sidebar-io-splitter-selected");
                                }
                            });
                        })
                    });

                    return createElem("tr", ["factory-sidebar-io-row"], undefined, undefined, [
                        createElem("td", ["factory-sidebar-io-cell"], undefined, num_to_str(flow.rate)),
                        ...btns.map(btn => createElem("td", ["factory-sidebar-io-cell"], undefined, undefined, [btn]))
                    ]);
                })));
            }
        };


        let in_items = new Array<HTMLElement>();
        in_items.push(createElem("div", ["factory-sidebar-io-header"], undefined, "In"));
        build_table(this.io[0], this.resource, in_items, 0)
        res.push(createElem("div", ["factory-sidebar-entry"], undefined, undefined, in_items) as HTMLDivElement);

        let out_items = new Array<HTMLElement>();
        out_items.push(createElem("div", ["factory-sidebar-io-header"], undefined, "Out"));
        build_table(this.io[1], this.resource, out_items, 1)
        res.push(createElem("div", ["factory-sidebar-entry"], undefined, undefined, out_items) as HTMLDivElement);


        res.push(createElem("div", ["factory-sidebar-entry"], undefined, undefined, [0].map(() => {
            let btn = createElem("button", ["factory-sidebar-button"], undefined, "Extract");
            btn.addEventListener("click", () => {
                this.extract([[new Map([[this.resource, extraction_ratios[0]]]), new Map([[this.resource, extraction_ratios[1]]])]]);
            })
            return btn;
        })) as HTMLDivElement);

        return res;

    }*/
    create_context_menu(): Array<HTMLDivElement> {
        return [];
    }

    split_nodes(sizes: Array<number>): Array<FactoryLogistic> {
        return sizes.map((size, idx) => new (Object.getPrototypeOf(this).constructor)(this.host, undefined, this.x, this.y + 200 * idx, this.resource, size) as FactoryLogistic);
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

    update_element() {
        this.elem_content.children[1].textContent = num_to_str(this.count) + " x " + FACTORY_DATA.items[this.resource].name;
    }

    /*split_inner(parts: Array<number>, dst: SplitResult) {
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
    }*/

    get_name(): string {
        return `Source ${FACTORY_DATA.items[this.resource].name}`;
    }
    get_type(): FactoryNodeType {
        return "source";
    }

    create_context_menu(): Array<HTMLDivElement> {
        return [];
    }

    ratios(): [Map<string, number>, Map<string, number>] {
        return [new Map([[this.resource, 0]]), new Map([[this.resource, 1]])];
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

    update_element() {
        this.elem_content.children[1].textContent = num_to_str(this.count) + " x " + FACTORY_DATA.items[this.resource].name;
    }

    /*split_inner(parts: Array<number>, dst: SplitResult) {
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
    }*/

    get_name(): string {
        return `Sink ${FACTORY_DATA.items[this.resource].name}`;
    }
    get_type(): FactoryNodeType {
        return "sink";
    }

    create_context_menu(): Array<HTMLDivElement> {
        return [];
    }

    ratios(): [Map<string, number>, Map<string, number>] {
        return [new Map([[this.resource, 1]]), new Map([[this.resource, 0]])];
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

    update_element() {
        this.elem_content.children[0].textContent = num_to_str(this.count) + " x " + FACTORY_DATA.items[this.resource].name;
    }

    /*split_inner(parts: Array<number>, dst: SplitResult) {
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
    }*/

    try_eliminate() {
        //Nothing in or out, can trivially remove
        let in_cnt = (this.io[0].get(this.resource)?.parts.length ?? 0);
        let out_cnt = (this.io[1].get(this.resource)?.parts.length ?? 0);
        if (in_cnt == 0 || out_cnt == 0) {
            this.host.remove_node(this.id);
            return;
        }

        if (out_cnt == 1) {
            this.io[0].get(this.resource)?.parts.forEach(flow => {
                new FlowLine(this.host, flow.resource, flow.rate,
                    flow.from, this.io[1].get(this.resource)!.parts.at(0)!.to);
            });
            this.host.remove_node(this.id);
        } else {
            if (in_cnt == 1) {
                this.io[1].get(this.resource)?.parts.forEach(flow => {
                    new FlowLine(this.host, flow.resource, flow.rate,
                        this.io[0].get(this.resource)!.parts.at(0)!.from, flow.to);
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

    ratios(): [Map<string, number>, Map<string, number>] {
        return [new Map([[this.resource, 1]]), new Map([[this.resource, 1]])];
    }
};

export class FactoryMachine extends FactoryNode {
    recipe: string;

    constructor(host: FactoryTab, id: number | undefined, x: number, y: number, recipe: string, recipe_count: number) {
        super(host, id, x, y);

        this.recipe = recipe;
        this.count = recipe_count;

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
            num_to_str(this.count * FACTORY_DATA.productionRecipes[this.recipe].craftTime / 60) + " x " + FACTORY_DATA.buildables[FACTORY_DATA.productionRecipes[this.recipe].producedIn].name
        ));
    }

    update_element() {
        this.elem_content.children[0].textContent = FACTORY_DATA.productionRecipes[this.recipe].name;
        this.elem_content.children[1].textContent = num_to_str(this.count * FACTORY_DATA.productionRecipes[this.recipe].craftTime / 60) + " x " + FACTORY_DATA.buildables[FACTORY_DATA.productionRecipes[this.recipe].producedIn].name;
    }

    ratios(): [Map<string, number>, Map<string, number>] {
        return [new Map(
            FACTORY_DATA.productionRecipes[this.recipe].ingredients.map(elem => [elem.itemClass, elem.quantity])
        ), new Map(
            FACTORY_DATA.productionRecipes[this.recipe].products.map(elem => [elem.itemClass, elem.quantity])
        )];
    }
    /*split_inner(parts: Array<number>, dst: SplitResult) {
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
                this.count * part / sum
            );

            dst.mapping.get(this.id)!.push(new_node.id);
        });
    }*/

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
            count: this.count
        };
    }

    /*create_sidebar_menu(): Array<HTMLElement> {
        //let extraction_ratios = [Array<number>(this.in.flows.length).fill(0), Array<number>(this.out.flows.length).fill(0)];
        let extraction_ratios: [Map<string, Array<number>>, Map<string, Array<number>>] = [
            new Map<string, Array<number>>(),
            new Map<string, Array<number>>()
        ];

        let res = new Array<HTMLElement>();

        let build_table = (io_idx: number, res_arr: Array<HTMLElement>) => {
            for (let [resource, flows] of this.io[io_idx]) {
                res_arr.push(createElem("div", ["factory-sidebar-io-resource"], undefined, FACTORY_DATA.items[resource].name));

                let extraction_ratio = Array<number>(this.io[io_idx].get_always(resource).parts.length).fill(0);
                extraction_ratios[io_idx].set(resource, extraction_ratio);

                res_arr.push(createElem("table", ["factory-sidebar-io"], undefined, undefined, flows.parts.map((flow, idx) => {
                    const btn_text = ["0", "?", "x", "*"];
                    const btn_vals = [0, NaN, undefined, flow.rate];
                    let btns = btn_text.map(caption => createElem("button", ["factory-sidebar-io-splitter"], undefined, caption));

                    btns.forEach((btn1, idx1) => {
                        btn1.addEventListener("click", () => {
                            extraction_ratio[idx] = btn_vals[idx1] ?? (Number(prompt("Value") ?? "0"));
                            btns.forEach((btn2, idx2) => {
                                if (idx1 == idx2) {
                                    btn2.classList.add("factory-sidebar-io-splitter-selected");
                                } else {
                                    btn2.classList.remove("factory-sidebar-io-splitter-selected");
                                }
                            });
                        })
                    });

                    return createElem("tr", ["factory-sidebar-io-row"], undefined, undefined, [
                        createElem("td", ["factory-sidebar-io-cell"], undefined, num_to_str(flow.rate)),
                        ...btns.map(btn => createElem("td", ["factory-sidebar-io-cell"], undefined, undefined, [btn]))
                    ]);
                })));
            }
        };


        let in_items = new Array<HTMLElement>();
        in_items.push(createElem("div", ["factory-sidebar-io-header"], undefined, "In"));
        build_table(0, in_items);
        res.push(createElem("div", ["factory-sidebar-entry"], undefined, undefined, in_items) as HTMLDivElement);

        let out_items = new Array<HTMLElement>();
        out_items.push(createElem("div", ["factory-sidebar-io-header"], undefined, "Out"));
        build_table(1, out_items);
        res.push(createElem("div", ["factory-sidebar-entry"], undefined, undefined, out_items) as HTMLDivElement);

        res.push(createElem("div", ["factory-sidebar-entry"], undefined, undefined, [0].map(() => {
            let btn = createElem("button", ["factory-sidebar-button"], undefined, "Extract");
            btn.addEventListener("click", () => {
                //console.log(extraction_ratios);
                this.extract([extraction_ratios]);
            })
            return btn;
        })) as HTMLDivElement);

        return res;

    }*/
    create_context_menu(): Array<HTMLDivElement> {
        return [];
    }

    split_nodes(sizes: Array<number>): Array<FactoryMachine> {
        return sizes.map((size, idx) => new FactoryMachine(this.host, undefined, this.x, this.y + 200 * idx, this.recipe, size));
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
