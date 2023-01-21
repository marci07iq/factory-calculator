import { FACTORY_DATA } from "./factory_data";


export function print_recipe(recipe_key: string, multi: number = 1) {
    let inputs: Array<any> = [];
    let outputs: Array<any> = [];

    FACTORY_DATA.productionRecipes[recipe_key].ingredients.forEach((ingredient) => {
        inputs.push(ingredient.quantity * multi + " * " + FACTORY_DATA.items[ingredient.itemClass].name);
    });

    FACTORY_DATA.productionRecipes[recipe_key].products.forEach((product) => {
        outputs.push(product.quantity * multi + " * " + FACTORY_DATA.items[product.itemClass].name);
    });

    let recipe_name = FACTORY_DATA.productionRecipes[recipe_key].name;
    let in_str = inputs.join(" + ");
    let out_str = outputs.join(" + ");

    return `${recipe_name}: ${in_str} => ${out_str}`;
}

export function tally_recipe(recipe_key: string, tally: Map<string, Array<number>>, multi: number = 1) {
    FACTORY_DATA.productionRecipes[recipe_key].ingredients.forEach((ingredient) => {
        if (!tally.has(ingredient.itemClass)) {
            tally.set(ingredient.itemClass, [0, 0]);
        }
        tally.get(ingredient.itemClass)![0] += ingredient.quantity * multi;
    });

    FACTORY_DATA.productionRecipes[recipe_key].products.forEach((product) => {
        if (!tally.has(product.itemClass)) {
            tally.set(product.itemClass, [0, 0]);
        }
        tally.get(product.itemClass)![1] += product.quantity * multi;
    });
}

export function num_to_str(num: number, digits: number = 2) {
    return num.toFixed(digits);
}