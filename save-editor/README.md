# DOS save editor

A local browser editor for the DOS version of _Uncharted Waters: New Horizons_.
It supports the 319,591-byte `KOUKAI2.DAT` save format used by this repository.

## Run

From the repository root:

```sh
pnpm install
pnpm run save-editor
```

Open http://127.0.0.1:4173 in Chrome, select **Open game folder**, and choose the
folder containing `KOUKAI2.DAT`.

The editor updates slot 1 and can change:

- the current port
- the date and time
- the protagonist's rank (No Rank through Duke)
- the protagonist's trade, piracy, and adventure fame
- carried gold, entered in coins (prefilled with 1,000,000, displayed in-game
  as 100 Gold Ingots and 0 Gold Coins; 10,000 coins make one ingot; maximum
  600,000,000)

Every save also sets an equipped Crusader's Sword and Crusader's Armor in
the first two inventory slots, overwriting whatever items those two slots held.
Items in the remaining inventory slots, including Letters of Marque, are
preserved. The current
protagonist's leadership, seamanship, knowledge, intuition,
courage, swordsmanship, charm, luck, Navigation Level, and Battle Level are all
set to 100.
The current player's first ship is converted to a Tekkousen, renamed "Edited",
and fitted with a Goddess figurehead. Both the current crew and the configured crew maximum are set to the
Tekkousen's maximum crew capacity.
The configured gun count is set to 0.
The stored cargo capacity is adjusted to 800 (1,100 capacity minus 300 crew and 0 guns).
Durability is set to the game's construction cap of 100/100.
The Tekkousen's provisions are set to 300 water and 500 food, and it carries
nothing else: lumber, shot, and all five cargo slots are emptied so the load
never exceeds the new capacity.
Its Assign Crew split is set to 20% navigation, 4% lookout, and 76% combat
(the game stores the lookout and navigation percentages; combat is the rest).
4% lookout on 300 crew already reaches the game's lookout cap of 12
tiles; see [At sea](../game-details/at-sea.md#lookout-range).

On the first save, the app creates `KOUKAI2-original.DAT` beside the game file.
It never overwrites an existing backup. Close the game before saving and keep
the backup until the edited save has been tested in-game.

Port changes are experimental. The editor moves the player and camera to the
destination harbor and resets friendly NPC positions, but does not generate
hostile-port harbor guards or change the fleet's saved sea position. Saves made
at sea cannot change port.

## Verify

```sh
pnpm run test:save-editor
pnpm run typecheck
```
