import { FACTORY_DATA } from "./factory_data";

import { createTabSavedata, createTabSavestring, createTabSolution, FactoryTab } from "./factory_tab";
import { createElem } from "./utils";
import { solve_factory } from "./solver";
import { FactoryHub, FactoryMachine, FactoryNodeID, FactorySink, FactorySource, FlowLine } from "./factory_node";

//console.log(model);

class FactoryWindow {
    tabs: Array<FactoryTab> = [];
    selected: number = 0;

    elem_root: HTMLDivElement;
    elem_main_menu: HTMLDivElement;
    elem_ribbon: HTMLDivElement;
    elem_ribbon_entries: Array<HTMLDivElement> = [];
    elem_current: HTMLDivElement;

    constructor() {
        let save_button: HTMLButtonElement;
        let import_button: HTMLButtonElement;
        let export_button: HTMLButtonElement;
        let delete_button: HTMLButtonElement;

        document.body.appendChild(this.elem_root = createElem("div", ["factory-root"], undefined, undefined, [
            this.elem_main_menu = createElem("div", ["factory-menu"], undefined, undefined, [
                save_button = createElem("button", ["factory-menu-button"], undefined, "Save") as HTMLButtonElement,
                import_button = createElem("button", ["factory-menu-button"], undefined, "Import") as HTMLButtonElement,
                export_button = createElem("button", ["factory-menu-button"], undefined, "Export tab") as HTMLButtonElement,
                delete_button = createElem("button", ["factory-menu-button"], undefined, "Delete tab") as HTMLButtonElement,
                
            ]) as HTMLDivElement,
            this.elem_ribbon = createElem("div", ["factory-ribbon"]) as HTMLDivElement,
            this.elem_current = createElem("div", ["factory-current"]) as HTMLDivElement,
        ]) as HTMLDivElement);

        save_button.addEventListener("click", () => {
            this.save();
        });

        import_button.addEventListener("click", () => {
            let item = prompt("Paste JSON");
            if (item !== null) {
                let new_tab = createTabSavestring(item);
                if (new_tab !== undefined) {
                    this.addTab(new_tab);
                }
            }
        });

        export_button.addEventListener("click", () => {
            navigator.clipboard.writeText(JSON.stringify(this.tabs[this.selected].save()));
            alert("Copied to clipboard");
        });

        delete_button.addEventListener("click", () => {
            if(confirm("Confirm delete")) {
                this.removeTab(this.selected);
            }
        });

        this.tabs = [];
        this.selected = 0;

        //Load
        try {
            let storage = localStorage.getItem("save-meta");
            if (storage !== null) {
                let meta = JSON.parse(storage);
                let meta_version = (meta.version ?? 0);
                if ((meta_version == 2 || meta_version == 3) && meta.save_id !== undefined) {
                    let file = localStorage.getItem(meta.save_id);
                    if (file !== null) {
                        let savedata = JSON.parse(file);
                        savedata.forEach(entry => {
                            let new_tab = createTabSavedata(entry);
                            if (new_tab !== undefined) {
                                this.addTab(new_tab);
                            }
                        })
                    }
                }
                else {
                    alert("Unknown save version " + meta_version);
                }
            }
        } catch (e) {
            console.error(e);
        }

        //No tabs: create default
        if (this.tabs.length == 0) {
            //Set up limits
            let map_limits = new Map<string, number>();
            for (const [resource, desc] of Object.entries(FACTORY_DATA.resources)) {
                map_limits.set(resource, desc.maxExtraction ?? NaN);
            }
            map_limits.set('Desc_Water_C', NaN);

            //Solve
            let new_tab = createTabSolution(solve_factory(
                map_limits,
                new Map<string, number>([
                    ["Recipe_NuclearReactorUranium", 50.4]
                ]),
                "max_points"));

            if (new_tab !== undefined) {
                this.addTab(new_tab);
            }
        }
    }

    save() {
        let current_save = localStorage.getItem("save-meta");

        let write_key = "save-loc-1";

        if (current_save != null) {
            let meta = JSON.parse(current_save);
            let meta_version = (meta.version ?? 0);
            if (meta_version == 2 || meta_version == 3) {
                let old_key = meta.save_id;
                if (write_key == old_key) {
                    write_key = "save-loc-2";
                }
            }
        }

        let save_data = this.tabs.map(tab => tab.save());

        //Write save data
        localStorage.setItem(write_key, JSON.stringify(save_data));

        //Write meta
        localStorage.setItem("save-meta", JSON.stringify({ version: 3, save_id: write_key, selected: this.selected }));
    }

    selectTab(id: number) {
        this.selected = id;

        this.elem_current.innerHTML = "";
        this.elem_ribbon_entries.forEach(elem => {
            elem.classList.remove("factory-ribbon-selected");
        })
        
        if(this.selected >= 0) {
            this.elem_current.append(this.tabs[this.selected].htmls.root!);
            this.elem_ribbon_entries[this.selected].classList.add("factory-ribbon-selected");
        }
    }

    updateRibbon() {
        this.elem_ribbon.innerHTML = "";
        this.elem_ribbon_entries = [];

        this.tabs.forEach((tab, idx) => {
            let ribbon_button = createElem("div", ["factory-ribbon-button"], undefined, tab.name) as HTMLDivElement;
            ribbon_button.addEventListener("click", () => {
                this.selectTab(idx);
            });
            ribbon_button.addEventListener("dblclick", () => {
                let name = prompt("New name");
                if(name !== null) {
                    this.tabs[idx].name = name;
                    this.updateRibbon();
                }
            });
    
            this.elem_ribbon_entries.push(ribbon_button);
            this.elem_ribbon.appendChild(ribbon_button);
        });
    }

    addTab(tab: FactoryTab): number {
        let new_id = this.tabs.length;

        this.tabs.push(tab);
        
        this.updateRibbon();

        this.selectTab(new_id);
        return new_id;
    }

    removeTab(id: number) {
        this.tabs.splice(id, 1);
        
        this.updateRibbon();

        let select = this.selected;
        if(select > id) {
            select -= 1;
        }
        select = Math.min(select, this.tabs.length - 1);
        this.selectTab(select);
    }
}

declare global {
    interface Window { factory: FactoryWindow; }
}

window.addEventListener("load", () => {
    let main = new FactoryWindow();
    window.factory = main;
    document.body.appendChild(main.elem_root);
}); 