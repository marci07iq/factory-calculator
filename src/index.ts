import { FACTORY_DATA } from "./factory_data";
import { tally_recipe, print_recipe } from "./helper";
import { FactoryTab } from "./factory_tab";
import { createElem } from "./utils";
import { solve_factory } from "./solver";
import { FactoryHub, FactoryMachine, FactoryNodeID, FactorySink, FactorySource, FlowLine } from "./factory_node";

//console.log(model);

declare global {
    interface Window { factory: FactoryTab; }
}

window.addEventListener("load", () => {
    let optimal_factory = new FactoryTab();
    window.factory = optimal_factory;

    document.body.appendChild(createElem("div", ["factory-tab-container"], undefined, undefined, [
        optimal_factory.htmls.root!
    ]));

    if (
        ((JSON.parse(localStorage.getItem("save-meta") || "{}").version ?? 0) === 1) &&
        ((JSON.parse(localStorage.getItem("save-meta") || "{}").slots ?? 0) >= 1)
    ) {
        optimal_factory.load(JSON.parse(localStorage.getItem("slot-1") || "{}"));
    } else {
        //Set up limits
        let map_limits = new Map<string, number>();
        for (const [resource, desc] of Object.entries(FACTORY_DATA.resources)) {
            map_limits.set(resource, desc.maxExtraction ?? NaN);
        }
        map_limits.set('Desc_Water_C', NaN);

        //Solve
        const FACTORY_SOLUTION = solve_factory(
            map_limits,
            new Map<string, number>([
                ["Recipe_NuclearReactorUranium", 50.4]
            ]),
            "max_points");

        console.log("feasible", FACTORY_SOLUTION.feasible);
        console.log("result", FACTORY_SOLUTION.result);
        console.log("bounded", FACTORY_SOLUTION.bounded);

        if (FACTORY_SOLUTION.feasible) {
            let tally: Map<string, Array<number>> = new Map<string, Array<number>>();

            //Create tally
            FACTORY_SOLUTION.values.forEach((item_cnt, item_key) => {
                if (item_key.startsWith("Sink_")) return;

                tally_recipe(item_key, tally, item_cnt);
            });

            console.log("");

            let hub_nodes: Map<string, number> = new Map<string, FactoryNodeID>();

            //Print tally
            //Create hub nodes
            tally.forEach((item_cnt, item_key) => {
                //console.log(item_key, item_cnt);
                let delta = item_cnt[1] - item_cnt[0];

                //Hub node
                let hub_node = new FactoryHub(
                    optimal_factory,
                    undefined,
                    0, 0,
                    item_key, Math.max(item_cnt[1], item_cnt[0])
                );
                hub_nodes.set(item_key, hub_node.id);

                if (Math.abs(delta) > 1e-6) {
                    console.log(`${FACTORY_DATA.items[item_key].name}: used ${item_cnt[0]}, made ${item_cnt[1]}, delta ${delta}`);

                    //Sourced
                    if (delta < -1e-6) {
                        let node = new FactorySource(
                            optimal_factory,
                            undefined,
                            0, 0,
                            item_key, -delta
                        );
                        new FlowLine(optimal_factory, item_key, -delta, node.id, hub_node.id);
                        //Sunk
                    }
                    if (delta > 1e-6) {
                        let node = new FactorySink(
                            optimal_factory,
                            undefined,
                            0, 0,
                            item_key, delta
                        );
                        new FlowLine(optimal_factory, item_key, delta, hub_node.id, node.id);
                    }
                } else {
                    console.log(`${FACTORY_DATA.items[item_key].name}: used ${item_cnt[0]}, made ${item_cnt[1]}`);
                }
            });

            console.log("");

            //Print processing nodes
            FACTORY_SOLUTION.values.forEach((recipe_cnt, recipe_key) => {
                if (recipe_key.startsWith("Sink_")) return;

                console.log(print_recipe(recipe_key, recipe_cnt));

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
                        optimal_factory,
                        undefined,
                        0, 0,
                        recipe_key,
                        recipe_cnt
                    )

                    FACTORY_DATA.productionRecipes[recipe_key].ingredients.forEach((ingredient) => {
                        if (ingredient.quantity * recipe_cnt > 1e-6) {
                            new FlowLine(optimal_factory, ingredient.itemClass, ingredient.quantity * recipe_cnt, hub_nodes.get(ingredient.itemClass)!, node.id);
                        }
                    });

                    FACTORY_DATA.productionRecipes[recipe_key].products.forEach((product) => {
                        if (product.quantity * recipe_cnt > 1e-6) {
                            new FlowLine(optimal_factory, product.itemClass, product.quantity * recipe_cnt, node.id, hub_nodes.get(product.itemClass)!);
                        }
                    });
                }
            });


            console.log("");

            //Print sinking steps
            FACTORY_SOLUTION.values.forEach((item_cnt, item_key) => {
                if (!item_key.startsWith("Sink_")) return;
                let item_name = item_key.substring(5);

                let in_str = item_cnt + " * " + FACTORY_DATA.items[item_name].name;
                let out_str = Number(item_cnt) * FACTORY_DATA.items[item_name].sinkPoints;

                let recipe_name = "Sink " + FACTORY_DATA.items[item_name].name;

                console.log(`${recipe_name}: ${in_str} => ${out_str}`);
            });

            console.log("");

            //Eliminate useless hubs
            optimal_factory.elems.forEach(elem => {
                if (elem instanceof FactoryHub) {
                    elem.try_eliminate();
                }
            });

            const spacing_x = 500;
            const spacing_y = 200;

            //Auto layout (x)
            let layers: Map<FactoryNodeID, number[]> = new Map<FactoryNodeID, number[]>();

            let y_i = 0;
            optimal_factory.elems.forEach((val, key) => {
                if (val instanceof FactorySource) {
                    layers.set(val.id, [0, y_i++]);
                }
            });


            let work_left = true;
            while (work_left) {

                work_left = false;
                let work_done = false;

                optimal_factory.elems.forEach((val, key) => {
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
                                console.log(val);
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
                    for (let [key, val] of optimal_factory.elems) {
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

                    optimal_factory.elems.get(best_y_id)!.io[0].forEachFlat((flow) => {
                        if (layers.has(flow.from)) {
                            max = Math.max(max, layers.get(flow.from)!.at(0)!);
                            ++y_cnt;
                            y_sum += layers.get(flow.from)!.at(1)!;
                        }
                    });

                    console.log(`Premature accept`, y_cnt, optimal_factory.elems.get(best_y_id)!);
                    let new_y = (y_cnt != 0) ? (y_sum / y_cnt) : 0;
                    layers.set(best_y_id, [max + 1, new_y]);
                    work_done = true;

                }
            }

            optimal_factory.elems.forEach((val, key) => {
                val.set_position(layers.get(val.id)!.at(0)! * spacing_x, layers.get(val.id)!.at(1)! * spacing_y * 3);
            });
        }
    }
}); 