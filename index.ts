import solver from "javascript-lp-solver";
const fs = require("fs");

const file = fs.readFileSync("Docs.json"); // read the Docs.json file from wherever
const parseDocs = require("satisfactory-docs-parser");

let old_console = console.warn;
console.warn = () => {};
const data = parseDocs(file); // parseDocs accepts either a Buffer or a string
console.warn = old_console;

const utils = require("./helper.js");

//console.log(data.productionRecipes);

let model = {
    //"optimize": "SN_Electricity",
    "optimize": "sinkPoints",
    "opType": "max",
    "constraints": {
        'Desc_OreIron_C': { "max": 70380 },
        'Desc_OreCopper_C': { "max": 28860 },
        'Desc_Stone_C': { "max": 52860 },
        'Desc_Coal_C': { "max": 30900 },
        'Desc_OreGold_C': { "max": 11040 },
        'Desc_RawQuartz_C': { "max": 10500 },
        'Desc_Sulfur_C': { "max": 6840 },
        'Desc_OreUranium_C': { "max": 2100 },
        'Desc_OreBauxite_C': { "max": 9780 },
        'Desc_LiquidOil_C': { "max": 11700 },
        'Desc_NitrogenGas_C': { "max": 12000 },
        'Desc_Water_C': {},

        'SN_Electricity': { "min": 50.4 },
    },
    "variables": {},

    "options": {
        "tolerance": 0
    }
};

data.productionRecipes["Recipe_NuclearReactorUranium"] = {
    slug: "Recipe_NuclearReactorUranium",
    name: "Recipe_NuclearReactorUranium",
    craftTime: 300,
    maunalCraftMultiplier: 0,
    isAlternate: false,
    handCraftable: false,
    workshopCraftable: false,
    machineCraftable: true,
    ingredients: [{
        itemClass: "Desc_NuclearFuelRod_C",
        quantity: 1
    }, {
        itemClass: "Desc_Water_C",
        quantity: 1200
    }, {
        itemClass: "SN_Electricity",
        quantity: 1
    }],
    products: [{
        itemClass: "Desc_NuclearWaste_C",
        quantity: 50
    }],
    producedIn: "Nuclear reactor",
    event: "NONE",
};

data.productionRecipes["Recipe_NuclearReactorPlutonium"] = {
    slug: "Recipe_NuclearReactorPlutonium",
    name: "Recipe_NuclearReactorPlutonium",
    craftTime: 300,
    maunalCraftMultiplier: 0,
    isAlternate: false,
    handCraftable: false,
    workshopCraftable: false,
    machineCraftable: true,
    ingredients: [{
        itemClass: "Desc_PlutoniumFuelRod_C",
        quantity: 1
    }, {
        itemClass: "Desc_Water_C",
        quantity: 2400
    }],
    products: [{
        itemClass: "Desc_PlutoniumWaste_C",
        quantity: 10
    }],
    producedIn: "Nuclear reactor",
    event: "NONE",
};

//Insert recipes
for (const [recipe_key, recipe] of Object.entries(data.productionRecipes)) {
    if (recipe.machineCraftable) {
        let item = {};

        recipe.ingredients.forEach((ingredient) => {
            item[ingredient.itemClass] = ingredient.quantity;
        });

        recipe.products.forEach((product) => {
            item[product.itemClass] = -product.quantity;
        });

        model.variables[recipe_key] = item;

        //console.log(utils.print_recipe(data, recipe_key));
    }
}


//Insert points
for (const [item_key, item] of Object.entries(data.items)) {
    //Sinkable
    if (item.sinkPoints > 0 && !item.isFluid) {
        let var_entry = { "sinkPoints": item.sinkPoints };
        var_entry[item_key] = 1;
        model.variables["Sink_" + item_key] = var_entry;

    }
    //All resources not covered in resource nodes must be net-0
    if (!(item_key in model.constraints)) {
        model.constraints[item_key] = { "equal": 0 };
    }

}

//console.log(model);

console.log("");
console.log("");

results = solver.Solve(model);
//console.log(results);
console.log("feasible", results.feasible);
console.log("result", results.result);
console.log("bounded", results.bounded);

let tally = {};

console.log("");

//Print processing steps
for (const [item_key, item] of Object.entries(results)) {
    if (item_key == "feasible") continue;
    if (item_key == "result") continue;
    if (item_key == "bounded") continue;

    if (item_key.startsWith("Sink_")) continue;

    utils.tally_recipe(data, item_key, tally, item);
    console.log(utils.print_recipe(data, item_key, item));
}

console.log("");

//Print tally
for (const [item_key, item] of Object.entries(tally)) {
    if (Math.abs(item[1] - item[0]) > 1e-6) {
        console.log(`${data.items[item_key].name}: used ${item[0]}, made ${item[1]}, delta ${item[1] - item[0]}`);
    }
}

console.log("");

//Print sinking steps
for (const [item_key, item] of Object.entries(results)) {
    if (item_key == "feasible") continue;
    if (item_key == "result") continue;
    if (item_key == "bounded") continue;

    if (!item_key.startsWith("Sink_")) continue;
    let item_name = item_key.substring(5);

    let in_str = item + " * " + data.items[item_name].name;
    let out_str = item * data.items[item_name].sinkPoints;

    let recipe_name = "Sink " + data.items[item_name].name;

    console.log(`${recipe_name}: ${in_str} => ${out_str}`);
}

console.log("");