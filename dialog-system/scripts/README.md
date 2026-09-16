# Dialog research tools

This directory contains the reproducible extractor and save-aware query for the
English DOS dialog/scenario data. Player-facing behavior is documented in
[`dialog-system/`](..), while maintained storyline guides live in
[`game-details/scenarios/`](../../game-details/scenarios/).

## Extract

```sh
pnpm run extract-dialog
```

The command recreates the ignored `output/` directory:

- `messages.json`: legacy flat João message export;
- `scenarios.json`: complete structural disassembly of all seven SNR pairs;
- `main-exe-vm.json`: executable offsets and scenario-VM dispatch evidence;
- `readable/scenario-N.md`: generated structural transcripts;
- `readable/dialogue-lines.csv`: one row per recognized dialog occurrence;
- `readable/instructions.csv`: reachable sequential VM instructions;
- `readable/control-flow.csv`: branch and fallthrough edges.

Interpretations and runtime observations belong in the hand-maintained
scenario guides, keeping generated artifacts structural and reproducible.

SNR strings and generated files use the game's `$n` and `$s` placeholders.

## Query a save

```sh
pnpm run query-dialog -- FILE SLOT ACTION
```

Examples:

```sh
pnpm run query-dialog -- raw/KOUKAI2.DAT 1 pub
pnpm run query-dialog -- raw/KOUKAI2.DAT 1 special-building
pnpm run query-dialog -- raw/KOUKAI2.DAT 1 at-sea
```

The query never modifies the save. It symbolically executes the active
protagonist route and also reports shared `SNR0` state: eligibility/invitation
flags, highest-Fame tie result, next-title threshold, cached mission family,
and the matching shared route. Decoded building hours are applied before a
matched route is described as triggerable.

Ordinary executable-driven building dialog and indirect `SNR0` message calls
are not yet evaluated. `none` therefore means no resolved protagonist story
dialog, not that the building displays nothing.

Run `pnpm run query-dialog -- --help` for all actions.

## Canonical documentation

- [Dialog-system overview](../README.md)
- [Technical research notes](./REVERSE_ENGINEERING.md)
- [Open questions](../open-questions.md)
- [Scenario guides](../../game-details/scenarios/README.md)

## Verification

```sh
pnpm test
pnpm run typecheck
```

When a binary interpretation changes, update the implementation, generated
field names, relevant scenario guide, and regression tests together.
