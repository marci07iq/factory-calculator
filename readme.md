# Production calculator for Satisfactory

Click [here](https://marci07iq.github.io/factory-calculator/) to open latest stable deployment.

A production calculator and factory planner for Satisfactory

## Features

- Linear progamming solver (note: currently only available from code, defaults to max Awesome Points)
- Fully re-arrangable flow graph editor
- Group multiple nodes into one large "factory"
- Split nodes to show multiple facilities producing the same product
- Save, import and export flow graph
- Multiple different tabs

# Usage

- Simple UI features
  - Left click background to drag canvas
  - Left click stripy header to drag nodes
  - Ctrl+click stripy header to select multiple
  - Shift+drag left to select area
  - Right click stripy header to access node specific actions
  - Right click text of flow line to access actions
- Sidebar (single element)
  - Displays all the inputs and outputs
  - Make hub button: merges all flows of that type into a single outgoing line, to a distribution hub
  - Split node (see below)
- Sidebar (multiple elements)
  - If identical types, trivially merge
  - If different types, merge into composite factory node

## Splitting

To split a node in the flow graph into two, you need to select the composition of one of the parts. For each input/output flow, you can define how much of it should end up in one half of the split, using the buttons next to the flow:
- `0`: None of this flow should end up in the extracted node
- `?`: Any amount can end up in the extracted node
- `x`: Specific number (enter amount)
- `*`: All of this flow

To split a node, all inputs/outputs must keep their current ratios (as dictated by the recipe) in both resulting parts. It is not possible to take a machine that produces both A and B, and split it into parts that produce only A or B.
However, a machine may for example produce a product for two different destinations, and it can be split so that each resulting component only exports to one destination.

For the best experience, choose one in/output resource type that you would like to guide the split. For each of it's flows select `0`, `x` or `*`. For all other resources, select `?` on at least one flow.

Experiment freely. The graph is not saved until you click the save button. Simply reloading the tab will undo any unsaved progress.

# Development

- Download code
- Install required npm packages (todo: provide list)
- Locate the file `<Satisfacotry game folder>/CommunityResources/Docs/Docs.json`
- Copy this file into `src/Docs.json`
- Run `npx parse-docs -i .\src\Docs.json -o .\src\data.json -f`
- Run `webpack` to build

## Updating game version

To update to a new version of the game, locate the new `Docs.json`, and repeat the above steps

## Adapting for other games

It should be reasonalby easy to adapt the software to other production based games. You need to obtain a data file describing the items and recipes in the game, and convert it to the same format output by the Satisfactory docs parser node module.

## TODOs

- Add UI to set up LP solver
- Make UI look nice
- Adopt a game-neutral format for recipe input, to make chaning games easier