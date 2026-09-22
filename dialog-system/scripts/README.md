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
- `general-message-call-sites.json`: direct `MAIN.EXE` references to the
  combined `MESSAGE.DAT`/`MESSAGE2.DAT` namespace, with decoded text;
- `readable/scenario-N.md`: generated structural transcripts;
- `readable/dialogue-lines.csv`: one row per recognized dialog occurrence;
- `readable/instructions.csv`: reachable sequential VM instructions;
- `readable/control-flow.csv`: branch and fallthrough edges.

Interpretations and runtime observations belong in the hand-maintained
scenario guides, keeping generated artifacts structural and reproducible.

SNR strings and generated files use the game's `$n` and `$s` placeholders.

## Query a save

```sh
pnpm run query-dialog -- FILE SLOT ACTION[:COMMAND[:SELECTION]]
```

Examples:

```sh
pnpm run query-dialog -- raw/KOUKAI2.DAT 1 pub
pnpm run query-dialog -- raw/KOUKAI2.DAT 1 special-building
pnpm run query-dialog -- raw/KOUKAI2.DAT 1 at-sea
pnpm run query-dialog -- raw/KOUKAI2.DAT 1 harbor:sail:yes
pnpm run query-dialog -- raw/KOUKAI2.DAT 1 harbor:supply:load:1:food:20
pnpm run query-dialog -- raw/KOUKAI2.DAT 1 harbor:moor:exchange:1:1:yes
pnpm run query-dialog -- raw/KOUKAI2.DAT 1 bank:deposit:5000
pnpm run query-dialog -- raw/KOUKAI2.DAT 1 church:donate:500
pnpm run query-dialog -- raw/KOUKAI2.DAT 1 house-of-fortune:mates:yes:1
```

The query never modifies the save. It symbolically executes the active
protagonist route and also reports shared `SNR0` state: eligibility/invitation
flags, highest-Fame tie result, next-title threshold, cached mission family,
and the matching shared route. Decoded building hours are applied before a
matched route is described as triggerable. Building actions also report the
ordinary entry greeting or access response and visible main menu when story
handling does not certainly suppress them. Possible hostile-country
interception remains marked as unresolved because it uses the separate general
gameplay RNG.

It also resolves the indirect active-cartographer field used by Ernst's
Mercator routes, including automatic contract renewal when another
cartographer is active. Gold-ingot and item-inventory reads are modeled
for Pietro's Golden Medallion Pub gate. Indirect reads from protagonist Fame
and sailor records are modeled for storyline affiliation and Fame gates. The
calendar-day source used by Catalina's Lucia sequence is also resolved, so its
same-day and after-midnight paths no longer appear as ambiguous alternatives.

Building actions can include colon-separated ordinary command selections. The
save-aware resolvers cover all Harbor and Bank commands, supply-port Rename
Port, Lodge Check In and Port Info, Church/Mosque Pray and Donate amounts, and
all four House of Fortune readings. Guild, Palace, collector, cartographer,
and skill-teacher commands are also resolved. Supply paths use
`supply:load|dump:SHIP:RESOURCE[:QUANTITY]`; Moor paths use
`moor:store|commission:SHIP[:yes|no]` or
`moor:exchange:ACTIVE_SHIP:DOCKED_SHIP[:yes|no]`. Ship numbers are one-based
positions in the displayed list. Bank commands accept an optional amount.
Fortune readings use `life|career|love:yes|no`; Mates additionally accepts a
one-based employed-mate selector. Palace paths include
`meet-ruler:sphere-of-influence`, `meet-ruler:letter-of-marque`,
`meet-ruler:tax-free-permit:yes[:yes|no]`, `defect:yes|no`, `gold`, and
`ship:NAME`. Pub and Lodge sailor paths use
`meet|gossip:SAILOR:treat|gossip|hire|duel[:yes|no]`. Pub also supports
`recruit-crew[:yes]:AMOUNT`, `dismiss-crew`, `treat:BOTTLES`,
`waitress[:COMMAND[:SELECTION]]`, and `gamble:black-jack|dice`. Market paths use
`buy-goods:GOODS:SHIP:LOTS:yes`, `sell-goods:SHIP:GOODS:LOTS`,
`invest:AMOUNT`, or `market-rate`. Shipyard paths use
`new-ship[:MODEL[:MATERIAL]]`, `used-ship`, `repair:SHIP:yes|no`,
`sell:SHIP`, `remodel:SUBCOMMAND[:SHIP[:VALUE]]`, or `invest:AMOUNT`.
Ship numbers and model or goods numbers are one-based positions in their
displayed lists; names can be used instead.

At supply ports, priced loading cannot be reconstructed from a save alone:
the executable reuses a regular-port metadata pointer retained in process
memory. Water loading and every dump operation remain exactly resolvable.

Pub greetings and Treat commands resolve the port's stored specialty and
price. Collector, cartographer, skill-teacher, and locked story residences are selected by port, including
their persistent contract-dependent greetings.

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
