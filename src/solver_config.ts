import { FactoryWindow } from "./index";
import { FACTORY_DATA } from "./factory_data";
import { createTabSolution } from "./factory_tab";
import { SolverOperation, solve_factory } from "./solver";
import { createElem } from "./utils";
import { create } from "domain";

class SolverConfigEntry {
    host: SolverConfig;
    group: number;

    resource: string;
    min: number;
    max: number;

    elem: HTMLElement;
    elem_min: HTMLInputElement;
    elem_max: HTMLInputElement;

    constructor(host: SolverConfig, group: number, resource: string, min: number, max: number) {
        this.host = host;
        this.group = group;

        this.resource = resource;
        this.min = min;
        this.max = max;

        let delete_elem: HTMLElement;

        this.elem = createElem("tr", [], undefined, undefined, [
            createElem("td", [], undefined, this.resource.startsWith("Recipe_") ? FACTORY_DATA.productionRecipes[this.resource].name : FACTORY_DATA.items[this.resource].name),
            createElem("td", [], undefined, undefined, [
                this.elem_min = createElem("input", ["factory-solver-io-input", "factory-textbox"], new Map([["pattern", "(?:(?:(?:[1-9][0-9]*[.]?|[0][.]?|[.][0-9])[0-9]*)|)"], ["title", "Enter a number or leave blank"], ["type", "text"], ["placeholder", "Min"], ["value", isNaN(min) ? "" : min.toString()]]), undefined) as HTMLInputElement,
            ]),
            createElem("td", [], undefined, undefined, [
                this.elem_max = createElem("input", ["factory-solver-io-input", "factory-textbox"], new Map([["pattern", "(?:(?:(?:[1-9][0-9]*[.]?|[0][.]?|[.][0-9])[0-9]*)|)"], ["title", "Enter a number or leave blank"], ["type", "text"], ["placeholder", "Max"], ["value", isNaN(max) ? "" : max.toString()]]), undefined) as HTMLInputElement,
            ]),
            delete_elem = createElem("td", [], undefined, "X"),
        ]);
        delete_elem.addEventListener("click", () => {
            this.host.remove_io_entry(this.group, this.resource);
        })

        this.elem_min.addEventListener("input", (ev) => {
            if (this.elem_min.value.length == 0) {
                this.min = NaN;
            } else {
                this.min = Number(this.elem_min.value);
            }
        });

        this.elem_max.addEventListener("input", (ev) => {
            if (this.elem_max.value.length == 0) {
                this.max = NaN;
            } else {
                this.max = Number(this.elem_max.value);
            }
        });
    }
}

export class SolverConfig {
    host: FactoryWindow;

    elem: HTMLElement;

    elem_iro: [HTMLElement, HTMLElement, HTMLElement];
    elem_goal: HTMLElement;

    prod_iro: [Map<string, SolverConfigEntry>, Map<string, SolverConfigEntry>, Map<string, SolverConfigEntry>];

    on_done: (() => void) | undefined = undefined;

    constructor(host: FactoryWindow) {
        this.host = host;

        let elem_in: HTMLElement;
        let elem_recipe: HTMLElement;
        let elem_out: HTMLElement;

        let select_in: HTMLSelectElement;
        let select_recipe: HTMLSelectElement;
        let select_out: HTMLSelectElement;

        let btn_select_in: HTMLButtonElement;
        let btn_select_recipe: HTMLButtonElement;
        let btn_select_out: HTMLButtonElement;

        let btn_lims: HTMLButtonElement;
        let elem_ok: HTMLInputElement;

        let generate_options = (data) => {
            let res: Array<HTMLOptionElement> = [];
            for (const [key, value] of Object.entries(data)) {
                res.push(createElem("option", [], new Map([["value", key]]), (value as any).name) as HTMLOptionElement);
            }
            return res;
        }

        this.elem = createElem("form", ["factory-solver"], new Map([["action", "javascript:void(0);"]]), undefined, [
            createElem("div", ["factory-solver-ios"], undefined, undefined, [
                createElem("div", ["factory-solver-io", "factory-solver-in"], undefined, undefined, [
                    createElem("div", ["factory-solver-title"], undefined, "Inputs"),
                    createElem("div", undefined, undefined, undefined, [
                        select_in = createElem("select", ["factory-solver-add", "factory-context-button"], undefined, undefined, generate_options(FACTORY_DATA.items)) as HTMLSelectElement,
                        btn_select_in = createElem("button", ["factory-menu-button", "factory-context-button"], new Map([["type", "button"]]), "+") as HTMLButtonElement,
                    ]),
                    btn_lims = createElem("button", ["factory-menu-button", "factory-context-button"], new Map([["type", "button"]]), "Use map limits") as HTMLButtonElement,
                    elem_in = createElem("table")
                ]),
                createElem("div", ["factory-solver-io", "factory-solver-recipe"], undefined, undefined, [
                    createElem("div", ["factory-solver-title"], undefined, "Intermedaite steps"),
                    createElem("div", undefined, undefined, undefined, [
                        select_recipe = createElem("select", ["factory-solver-add", "factory-context-button"], undefined, undefined, generate_options(FACTORY_DATA.productionRecipes)) as HTMLSelectElement,
                        btn_select_recipe = createElem("button", ["factory-menu-button", "factory-context-button"], new Map([["type", "button"]]), "+") as HTMLButtonElement,
                    ]),
                    elem_recipe = createElem("table")
                ]),
                createElem("div", ["factory-solver-io", "factory-solver-out"], undefined, undefined, [
                    createElem("div", ["factory-solver-title"], undefined, "Outputs"),
                    createElem("div", undefined, undefined, undefined, [
                        select_out = createElem("select", ["factory-solver-add", "factory-context-button"], undefined, undefined, generate_options(FACTORY_DATA.items)) as HTMLSelectElement,
                        btn_select_out = createElem("button", ["factory-menu-button", "factory-context-button"], new Map([["type", "button"]]), "+") as HTMLButtonElement,
                    ]),
                    elem_out = createElem("table")
                ]),
            ]),
            createElem("div", ["factory-solver-ctrls"], undefined, undefined, [
                this.elem_goal = createElem("table", ["factory-solver-io", "factory-solver-goal"], undefined, undefined, [
                    createElem("tr", [], undefined, undefined, [
                        createElem("td", [], undefined, undefined, [
                            createElem("input", [], new Map([["type", "radio"], ["name", "goal"], ["value", "max_points"]]))
                        ]),
                        createElem("td", [], undefined, undefined, [
                            createElem("label", [], new Map([["for", "max_points"]]), "Max Awesome points")
                        ])
                    ]),
                    createElem("tr", [], undefined, undefined, [
                        createElem("td", [], undefined, undefined, [
                            createElem("input", [], new Map([["type", "radio"], ["name", "goal"], ["value", "min_waste"]]))
                        ]),
                        createElem("td", [], undefined, undefined, [
                            createElem("label", [], new Map([["for", "min_points"]]), "Minimal waste")
                        ])
                    ]),
                ]),

                elem_ok = createElem("button", ["factory-menu-button", "factory-context-button"], new Map([["type", "submit"]]), "Solve") as HTMLInputElement,
            ]),
        ]);

        this.elem_iro = [elem_in, elem_recipe, elem_out];
        this.prod_iro = [new Map(), new Map(), new Map()];

        this.elem.addEventListener("submit", (ev) => { this.submit() });

        btn_select_in.addEventListener("click", () => {
            this.add_io_entry(0, select_in.value, NaN, NaN);
        });
        btn_select_recipe.addEventListener("click", () => {
            this.add_io_entry(1, select_recipe.value, NaN, NaN);
        });
        btn_select_out.addEventListener("click", () => {
            this.add_io_entry(2, select_out.value, NaN, NaN);
        });

        btn_lims.addEventListener("click", () => {
            for (const [resource, desc] of Object.entries(FACTORY_DATA.resources)) {
                this.add_io_entry(0, resource, NaN, desc.maxExtraction ?? NaN);
            }
            this.add_io_entry(0, 'Desc_Water_C', NaN, NaN);
        });
    }

    add_io_entry(side: number, resource: string, min: number, max: number) {
        this.remove_io_entry(side, resource);

        let chooser = new SolverConfigEntry(this, side, resource, min, max);
        this.prod_iro[side].set(resource, chooser);
        this.elem_iro[side].appendChild(chooser.elem);
    }

    remove_io_entry(side: number, resource: string) {
        if (this.prod_iro[side].has(resource)) {
            this.elem_iro[side].removeChild(this.prod_iro[side].get(resource)!.elem);
            this.prod_iro[side].delete(resource);
        }
    }

    submit() {
        let goal = (this.elem_goal.querySelector('input[name="goal"]:checked') as HTMLInputElement).value;

        let iro = [new Map<string, [number, number]>(), new Map<string, [number, number]>(), new Map<string, [number, number]>()];

        [0, 1, 2].forEach(i => {
            this.prod_iro[i].forEach((val, resource) => {
                iro[i].set(resource, [val.min, val.max]);
            });
        });

        let solution = solve_factory(
            iro[0], iro[1], iro[2],
            goal as SolverOperation);

        if (!solution.feasible) {
            alert("No solution found");
        } else {
            let new_tab = createTabSolution(solution);
            if (new_tab !== undefined) {
                this.host.addTab(new_tab);
                alert("Solution found, " + solution.result + " Awesome Points / min");
            } else {
                alert("Unexpected error");
            }

            if (this.on_done !== undefined) {
                this.on_done();
            }
        }

        return false;
    }
}