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

SNR strings and generated files preserve the game's `$n` and `$s` name
placeholders and its `$dNN` and `$rNN` variable placeholders.

## Query a save

```sh
pnpm run query-dialog -- FILE SLOT ACTION[:COMMAND[:SELECTION]]
```

The repository's only tracked save, `raw/KOUKAI2.DAT`, is a blank new-game
template whose slot 1 is at sea, so it supports only the at-sea action:

```sh
pnpm run query-dialog -- raw/KOUKAI2.DAT 1 at-sea
```

Building actions require a save made in port. Examples of `ACTION` values:

```text
pub
special-building
harbor:sail:yes
harbor:supply:load:1:food:20
harbor:moor:exchange:1:1:yes
bank:deposit:5000
church:donate:500
house-of-fortune:mates:yes:1
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
`moor:exchange:ACTIVE_SHIP:DOCKED_SHIP[:yes|no]`. Moor is available only at
the six national capitals; at other regular ports the query reports it as a
disabled menu entry. Ship numbers are one-based positions in the displayed
list. Bank commands accept an optional amount.
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
`new-ship[:MODEL[:MATERIAL]]`, `used-ship[:SLOT]`, `repair:SHIP:yes|no`,
`sell:SHIP`, `remodel:SUBCOMMAND[:SHIP[:VALUE]]`, or `invest:AMOUNT`.
For a complete Load Capacity remodel, use
`remodel:load-capacity:SHIP:yes:BUNKS:GUNS:yes`.
For a complete New Ship order at the listed price, use
`new-ship:MODEL:MATERIAL:yes:yes:BUNKS:GUNS:yes`; the two `yes` values
confirm the design and price. To negotiate, replace the second `yes` with
`no:OFFER`, for example
`new-ship:MODEL:MATERIAL:yes:no:OFFER:BUNKS:GUNS:yes`. A `cancel` in place of
the bunk or gun input leaves the paid order with its model-default capacity
allocation. A below-minimum offer ends the attempt, with the refusal line and
possible same-day Shipyard ejection dependent on gameplay RNG.
If all ten active and thirty reserve slots are occupied, New Ship first opens
the shared sale sequence after raw message 167. Select and confirm the ship,
then answer any flagship-replacement, cargo, crew, and final-sale prompts that
apply. The path form is
`new-ship:exchange:SHIP:yes[:yes:NEW_FLAGSHIP][:yes][:yes]:yes:MODEL:MATERIAL:yes:yes:BUNKS:GUNS:yes`;
omit the optional segments when the selected ship has no matching prompt. The
final `yes` before `MODEL` accepts the sale. There is no extra Yes/No input
after raw 167.
When a construction timer reaches zero, selecting New Ship displays the
delivery question; use `new-ship:yes` to accept or `new-ship:no` to leave the
ship docked. If accepting requires an exchange, continue with the sale inputs
after that `yes`, for example `new-ship:yes:SHIP:yes:yes` when no additional
flagship, cargo, or crew prompt appears.
For a Used Ship at the listed price, use
`used-ship:SLOT:yes:yes:NAME`; to negotiate, use
`used-ship:SLOT:yes:no:OFFER:NAME`. The first `yes` confirms the selected
ship, and the second choice accepts or rejects its listed price.
When the fleet requires an exchange, select and confirm the trade-in first:
`used-ship:exchange:SHIP:yes:SLOT:yes:yes:NAME`. Raw message 167 proceeds
directly to ship selection; there is no separate exchange Yes/No input. If the
trade-in is the flagship, also confirm that choice and provide a replacement
ship selector before the Used Ship slot:
`used-ship:exchange:SHIP:yes:yes:NEW_FLAGSHIP:SLOT:yes:yes:NAME`. For
compatibility, the query also accepts the older `exchange:yes:SHIP` form.
For a normal ship sale, use `sell:SHIP:yes:yes` when no cargo or crew
confirmation is needed. The first `yes` confirms the selected ship and the
second accepts the final offer. If the ship is the flagship, confirm the
replacement route and provide the replacement ship selector before the final
offer, for example `sell:1:yes:yes:1:yes`. Cargo and crew prompts, when
present, add one `yes` or `no` each before the final offer; a `no` at any
confirmation returns to ship selection without selling. The query reports the
deterministic sale value and removal/flagship effects after final acceptance.
Ship numbers and model or goods numbers are one-based positions in their
displayed lists; names can be used instead.
Figurehead and gun purchases use
`remodel:figurehead:SHIP:FIGUREHEAD:yes` and
`remodel:guns:SHIP:GUN_TYPE:QUANTITY:yes`. Figurehead type and gun type can be
selected by displayed name or one-based position. When the rare-selection
requirements are met, the exact presence of “We have a great selection today”
and the rare option in the menu remain gameplay-RNG-dependent; the query marks
that branch ambiguous.

At regular ports, Supply prices use saved port-metadata bytes `+0x12` and
`+0x19` (executable record offsets `+0x10` and `+0x17`). At supply ports,
priced loading cannot be reconstructed from a save alone: the executable
reuses a regular-port metadata pointer retained in process memory. Water loading
and every dump operation remain exactly resolvable.

Pub greetings and Treat commands resolve the port's stored specialty, saved
port-metadata byte `+0x26` (executable record offset `+0x24`; the executable
addresses records at `DS:0x6790 + port × 0x25`, save `0x5968`, while
save-metadata offsets are framed from `0x5966`), and its price. Collector,
cartographer, skill-teacher, and locked story residences are selected by port,
including their persistent contract-dependent greetings.

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
