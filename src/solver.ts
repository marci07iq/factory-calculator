import { FACTORY_DATA } from "./factory_data";
import { IModel, Solve } from "@bygdle/javascript-lp-solver";
import { assert } from "console";


export type SolverRelation = Map<string, number>;
export type SolverRelations = Map<string, SolverRelation>;

export interface SolverResult {
    feasible: Boolean;
    bounded: Boolean;
    result: number;
    values: Map<string, number>
}

export type SolverOperation = "max_points" | "min_waste";

export function solve_factory(input_limits: Map<string, [number, number]>, recipe_needs: Map<string, [number, number]>, output_needs: Map<string, [number, number]>, task: SolverOperation) {
    let model: IModel<string, string, string>;

    if (task == "max_points") {
        model = {
            optimize: "SN_sinkPoints",
            opType: "max",
            constraints: {},
            variables: {},
        };
    }else if (task == "min_waste") {
        model = {
            optimize: "SN_sinkPoints",
            opType: "min",
            constraints: {},
            variables: {},
        };
    } else {
        throw new Error("Invalid input");
    }

    input_limits.forEach((limit, resource) => {
        model.constraints[resource] = { };
        if(!isNaN(limit[0])) {
            model.constraints[resource]!["min"] = limit[0];
        }
        if(!isNaN(limit[1])) {
            model.constraints[resource]!["max"] = limit[1];
        }
    });

    recipe_needs.forEach((limit, resource) => {
        model.constraints[resource] = { };
        if(!isNaN(limit[0])) {
            model.constraints[resource]!["min"] = limit[0];
        }
        if(!isNaN(limit[1])) {
            model.constraints[resource]!["max"] = limit[1];
        }
    });

    output_needs.forEach((limit, resource) => {
        model.constraints[resource] = { };
        if(!isNaN(limit[0])) {
            model.constraints[resource]!["max"] = -limit[0];
        }
        if(!isNaN(limit[1])) {
            model.constraints[resource]!["min"] = -limit[1];
        }
    });
    
    //Insert recipes
    for (const [recipe_key, recipe] of Object.entries(FACTORY_DATA.productionRecipes)) {
        if (recipe.machineCraftable) {
            let item = {};

            item[recipe_key] = 1;

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


    //Insert points and constain all items
    for (const [item_key, item] of Object.entries(FACTORY_DATA.items)) {
        //Sinkable
        if (item.sinkPoints > 0 && !item.isFluid) {
            let var_entry = {
                "SN_sinkPoints": item.sinkPoints
            };
            var_entry[item_key] = 1;

            model.variables["Sink_" + item_key] = var_entry;

        }
        //All resources not covered in resource nodes must be net-0
        if (!(item_key in model.constraints)) {
            model.constraints[item_key] = { equal: 0 };
        }

    }

    console.log(model);

    const result = Solve(model);

    console.log(result);

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

    return res;
}

