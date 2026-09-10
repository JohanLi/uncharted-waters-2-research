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

Every save also sets gold to 1,000,000 and replaces the inventory with an
equipped Crusader's Sword and Crusader's Armor. All other inventory items are
removed.

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
