import data_file from "./data.json"; // read the Docs.json file from wherever
//import parseDocs from "satisfactory-docs-parser";

//let old_console = console.warn;
//console.warn = () => {};
//export const FACTORY_DATA = parseDocs(JSON.stringify(data_file)); // parseDocs accepts either a Buffer or a string
//console.warn = old_console;

//Inject nuclear recipes
data_file.productionRecipes["Recipe_NuclearReactorUranium"] = {
    slug: "Recipe_NuclearReactorUranium",
    name: "Uranium power",
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
    }],
    products: [{
        itemClass: "Desc_NuclearWaste_C",
        quantity: 50
    }],
    producedIn: "Desc_GeneratorNuclear_C",
    event: "NONE",
};

data_file.productionRecipes["Recipe_NuclearReactorPlutonium"] = {
    slug: "Recipe_NuclearReactorPlutonium",
    name: "Plutonium power",
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
    producedIn: "Desc_GeneratorNuclear_C",
    event: "NONE",
};

export type FactoryData = typeof data_file;
export const FACTORY_DATA: FactoryData = data_file;
