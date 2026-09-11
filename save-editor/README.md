# DOS save editor

A local browser editor for the DOS version of _Uncharted Waters: New Horizons_.
It supports the 319,591-byte `KOUKAI2.DAT` save format used by this repository.

## Run

From the repository root:

```sh
npm install
npm run save-editor
```

Open http://127.0.0.1:4173 in Chrome, select **Open game folder**, and choose the
folder containing `KOUKAI2.DAT`.

The editor updates slot 1 and can change:

- the current port
- the date and time
- the protagonist's trade, piracy, and adventure fame

Every save also sets gold to 1,000,000 and sets an equipped Crusader's Sword
and Crusader's Armor in the first two inventory slots.
All other inventory items, including Letters of Marque, are preserved. The current
protagonist's leadership, seamanship, knowledge, intuition,
courage, swordsmanship, charm, luck, Navigation Level, and Battle Level are all
set to 100.
The current player's first ship is converted to a Tekkousen while preserving its
ship name. Both the current crew and the configured crew maximum are set to the
Tekkousen's maximum crew capacity.
The configured gun count is set to 0.
The stored cargo capacity is adjusted to 800 (1,100 capacity minus 300 crew and 0 guns).
Durability is set to the game's construction cap of 100/100.
The Tekkousen's provisions are set to 300 water and 500 food.

On the first save, the app creates `KOUKAI2-original.DAT` beside the game file.
It never overwrites an existing backup. Close the game before saving and keep
the backup until the edited save has been tested in-game.

Port changes are experimental. The editor moves the player and camera to the
destination harbor and resets friendly NPC positions, but does not generate
hostile-port harbor guards or change the fleet's saved sea position. Saves made
at sea cannot change port.

## Verify

```sh
npm run test:save-editor
npm run typecheck
```
