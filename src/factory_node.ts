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

    line: HTMLDivElement;

    constructor(host: FactoryTab, resource: string, rate: number, from: FactoryNodeID, to: FactoryNodeID) {
        this.host = host;

        this.resource = resource;
        this.rate = rate;

        this.from = from;
        this.to = to;

        this.line = createElem("div", ["factory-flow"]) as HTMLDivElement;
        this.host.htmls.canvas?.appendChild(this.line);

        this.host.elems.get(this.from)!.out.flows.push(this);
        this.host.elems.get(this.to)!.in.flows.push(this);
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
        this.line.style.left = `${cx}px`;
        this.line.style.top = `${cy}px`;
        this.line.style.width = `${length}px`;
        this.line.style.rotate = `${angle}deg`;
    }
};

export type NetIO = Map<string, number>;

export type ProcessingFlows = Array<FlowLine>;

export type ProcessingIO = {
    total: NetIO;
    flows: ProcessingFlows;
}

function sum_io(parts: Array<NetIO>): NetIO {
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
}

function sum_flow(parts: Array<Array<FlowLine>>): Array<FlowLine> {
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
}

type SplitResult = {
    mapping: Map<FactoryNodeID, Array<FactoryNodeID>>;
}

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

    constructor(host: FactoryTab, input: NetIO, output: NetIO, x: number, y: number) {
        this.host = host;
        this.in = {
            total: input,
            flows: []
        };
        this.out = {
            total: output,
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

        let onmove_fn = (e: MouseEvent) => {
            e.preventDefault();
            this.set_position(this.x + e.movementX / this.host.zoom, this.y + e.movementY / this.host.zoom);
            e.stopPropagation();
        }

        let onup_fn = () => {
            // stop moving when mouse button is released:
            document.removeEventListener("mouseup", onup_fn);
            document.removeEventListener("mousemove", onmove_fn);
        }

        this.elem_header.onmousedown = (e: MouseEvent) => {
            if (e.target == this.elem_header) {
                if (e.button == 0) {
                    e.preventDefault();
                    document.addEventListener("mouseup", onup_fn);
                    document.addEventListener("mousemove", onmove_fn);
                    e.stopPropagation();
                }
            }
        }

        this.id = host.add_node(this);
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
};

export class FactorySource extends FactoryNode {
    resource: string;
    count: number;

    constructor(host: FactoryTab, x: number, y: number, resource: string, count: number) {
        super(host, new Map<string, number>([[
            resource, count
        ]]), new Map<string, number>(), x, y);

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
                this.x,
                this.y,
                this.resource,
                this.count * part / sum
            );

            dst.mapping.get(this.id)!.push(new_node.id);
        });
    }
};

export class FactorySink extends FactoryNode {
    resource: string;
    count: number;

    constructor(host: FactoryTab, x: number, y: number, resource: string, count: number) {
        super(host, new Map<string, number>(), new Map<string, number>([[
            resource, count
        ]]), x, y);

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
                this.x,
                this.y,
                this.resource,
                this.count * part / sum
            );

            dst.mapping.get(this.id)!.push(new_node.id);
        });
    }
};

export class FactoryHub extends FactoryNode {
    resource: string;
    count: number;

    constructor(host: FactoryTab, x: number, y: number, resource: string, count: number) {
        super(host, new Map<string, number>([[
            resource, count
        ]]), new Map<string, number>([[
            resource, count
        ]]), x, y);

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
            this.out.flows.forEach(flow => {
                new FlowLine(this.host, flow.resource, flow.rate,
                    this.in.flows[0].from, flow.to);
            });
            this.host.remove_node(this.id);
        }
    }
};

export class FactoryMachine extends FactoryNode {
    recipe: string;
    recipe_count: number;

    constructor(host: FactoryTab, input: NetIO, output: NetIO, x: number, y: number, recipe: string, recipe_count: number) {
        super(host, input, output, x, y);

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
                mul_io(this.in.total, part / sum),
                mul_io(this.out.total, part / sum),
                this.x,
                this.y,
                this.recipe,
                this.recipe_count * part / sum
            );

            dst.mapping.get(this.id)!.push(new_node.id);
        });
    }
};

export class FactoryComposite extends FactoryNode {
    name: string;
    components: Array<FactoryNode>;

    constructor(host: FactoryTab, x: number, y: number, name: string, components: Array<FactoryNode>) {
        super(
            host,
            sum_io(components.map(comp => comp.in.total)),
            sum_io(components.map(comp => comp.out.total)),
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
}