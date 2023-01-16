import { FACTORY_DATA } from "./factory_data";
import { IModel, Solve } from "@bygdle/javascript-lp-solver";

let model: IModel<string, string, string> = {
    optimize: "sinkPoints",
    opType: "max",
    constraints: {},
    variables: {},

};

//console.log(data.productionRecipes);

model.constraints['Desc_OreIron_C'] = { max: 70380 };
model.constraints['Desc_OreCopper_C'] = { max: 28860 };
model.constraints['Desc_Stone_C'] = { max: 52860 };
model.constraints['Desc_Coal_C'] = { max: 30900 };
model.constraints['Desc_OreGold_C'] = { max: 11040 };
model.constraints['Desc_RawQuartz_C'] = { max: 10500 };
model.constraints['Desc_Sulfur_C'] = { max: 6840 };
model.constraints['Desc_OreUranium_C'] = { max: 2100 };
model.constraints['Desc_OreBauxite_C'] = { max: 9780 };
model.constraints['Desc_LiquidOil_C'] = { max: 11700 };
model.constraints['Desc_NitrogenGas_C'] = { max: 12000 };
model.constraints['Desc_Water_C'] = {},

    model.constraints['SN_Electricity'] = { min: 50.4 };

//Insert recipes
for (const [recipe_key, recipe] of Object.entries(FACTORY_DATA.productionRecipes)) {
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
for (const [item_key, item] of Object.entries(FACTORY_DATA.items)) {
    //Sinkable
    if (item.sinkPoints > 0 && !item.isFluid) {
        let var_entry = {
            "sinkPoints": item.sinkPoints
        };
        var_entry[item_key] = 1;

        model.variables["Sink_" + item_key] = var_entry;

    }
    //All resources not covered in resource nodes must be net-0
    if (!(item_key in model.constraints)) {
        model.constraints[item_key] = { equal: 0 };
    }

}

const result = Solve(model);

export type SolverRelation = Map<string, number>;
export type SolverRelations = Map<string, SolverRelation>;

export interface SolverResult {
    feasible: Boolean;
    bounded: Boolean;
    result: number;
    values: Map<string, number>
}

let res: SolverResult = {
    feasible: Boolean(result.feasible),
    bounded: Boolean(result.bounded),
    result: Number(result.result),

    values: new Map<string, number>()
};

for (const [item_key, item] of Object.entries(result)) {
    if (item_key == "feasible") continue;
    if (item_key == "result") continue;
    if (item_key == "bounded") continue;

    res.values.set(item_key, Number(item));
}

export const FACTORY_SOLUTION = res;