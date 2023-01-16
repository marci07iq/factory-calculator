import { FACTORY_DATA } from "./factory_data";
import { FACTORY_SOLUTION } from "./solver";
import { tally_recipe, print_recipe } from "./helper";

//console.log(model);


//console.log(results);
console.log("feasible", FACTORY_SOLUTION.feasible);
console.log("result", FACTORY_SOLUTION.result);
console.log("bounded", FACTORY_SOLUTION.bounded);

let tally: Map<string, Array<number>> = new Map<string, Array<number>>();

console.log("");

//Print processing steps
FACTORY_SOLUTION.values.forEach((item_cnt, item_key) => {
    if (item_key.startsWith("Sink_")) return;

    tally_recipe(item_key, tally, item_cnt);
    console.log(print_recipe(item_key, item_cnt));
});

console.log("");

//Print tally
tally.forEach((item_cnt, item_key) => {
    if (Math.abs(item_cnt[1] - item_cnt[0]) > 1e-6) {
        console.log(`${FACTORY_DATA.items[item_key].name}: used ${item_cnt[0]}, made ${item_cnt[1]}, delta ${item_cnt[1] - item_cnt[0]}`);
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