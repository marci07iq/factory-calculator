

export function print_recipe(data, recipe_key, multi = 1) {
    let inputs = [];
    let outputs = [];

    data.productionRecipes[recipe_key].ingredients.forEach((ingredient) => {
        if (!ingredient.itemClass.startsWith("SN_")) {
            inputs.push(ingredient.quantity * multi + " * " + data.items[ingredient.itemClass].name);
        }
    });

    data.productionRecipes[recipe_key].products.forEach((product) => {
        outputs.push(product.quantity * multi + " * " + data.items[product.itemClass].name);
    });

    let recipe_name = data.productionRecipes[recipe_key].name;
    let in_str = inputs.join(" + ");
    let out_str = outputs.join(" + ");

    return `${recipe_name}: ${in_str} => ${out_str}`;
}

export function tally_recipe(data, recipe_key, tally, multi = 1) {
    data.productionRecipes[recipe_key].ingredients.forEach((ingredient) => {
        if (!ingredient.itemClass.startsWith("SN_")) {
            if (!(ingredient.itemClass in tally)) {
                tally[ingredient.itemClass] = [0, 0];
            }
            tally[ingredient.itemClass][0] += ingredient.quantity * multi;
        }
    });

    data.productionRecipes[recipe_key].products.forEach((product) => {
        if (!(product.itemClass in tally)) {
            tally[product.itemClass] = [0, 0];
        }
        tally[product.itemClass][1] += product.quantity * multi;
    });
}