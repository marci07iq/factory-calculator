import { threadId } from "worker_threads";
import { FactoryTab } from "./factory_tab";
import { createElem } from "./utils";

export type ProcessingIO = Map<string, number>;


function sum_io(parts: Array<ProcessingIO>): ProcessingIO {
    let res: ProcessingIO = new Map<string, number>();

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

function mul_io(io: ProcessingIO, num: number): ProcessingIO {
    let res: ProcessingIO = new Map<string, number>();

    io.forEach((val, key) => {
        res.set(key, val * num);
    });

    return res;
}

export abstract class ProcessingNode {
    host: FactoryTab;

    in: ProcessingIO;
    out: ProcessingIO;

    //For rendering
    x: number;
    y: number;

    elem: HTMLDivElement;
    elem_header: HTMLDivElement;
    elem_content: HTMLDivElement;

    constructor(host: FactoryTab, input: ProcessingIO, output: ProcessingIO, x: number, y: number) {
        this.host = host;
        this.in = input;
        this.out = output;

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

    }

    set_position(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.elem.style.left = this.x + "px";
        this.elem.style.top = this.y + "px";
    }

    abstract split(parts: Array<number>): Array<ProcessingNode>;
};

export class MachineNode extends ProcessingNode {
    machine: string;
    machine_count: number;

    constructor(host: FactoryTab, input: ProcessingIO, output: ProcessingIO, x: number, y: number, machine: string, machine_count: number) {
        super(host, input, output, x, y);

        this.machine = machine;
        this.machine_count = machine_count;

        this.elem.classList.add("factory-machine");
        this.elem_content.innerText = this.machine_count + " x " + this.machine;
    }

    split(parts: Array<number>): Array<MachineNode> {
        let res: Array<MachineNode> = new Array<MachineNode>();

        let sum = parts.reduce((cumsum, val) => cumsum + val, 0);

        parts.forEach((part) => {
            res.push(new MachineNode(
                this.host,
                mul_io(this.in, part / sum),
                mul_io(this.out, part / sum),
                this.x,
                this.y,
                this.machine,
                this.machine_count * part / sum)
            );
        });

        return res;
    }
};

export class FactoryNode extends ProcessingNode {
    name: string;
    components: Array<ProcessingNode>;

    constructor(host: FactoryTab, x: number, y: number, name: string, components: Array<ProcessingNode>) {
        super(
            host,
            sum_io(components.map(comp => comp.in)),
            sum_io(components.map(comp => comp.out)),
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


    split(parts: Array<number>): Array<FactoryNode> {
        let res: Array<FactoryNode> = new Array<FactoryNode>();

        let split_components = this.components.map(comp => comp.split(parts));

        parts.forEach((part, i) => {
            res.push(new FactoryNode(
                this.host,
                this.x,
                this.y,
                "Unnamed",
                split_components.map(split => split[i])
            ));
        });

        return res;
    }
}