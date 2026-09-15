# Scenario dialogue extraction

Run `npm run extract-dialog` to produce:

- `output/messages.json`: the existing flat list of João's dialogue.
- `output/scenarios.json`: a structural disassembly of all seven `SNR*.DAT`
  and `SNR*.MES` pairs.
- `output/main-exe-vm.json`: reproducible `MAIN.EXE` loader, VM dispatcher,
  opcode-handler, route-matcher, and VM-global evidence.
- `output/readable/`: Markdown transcripts, Mermaid overviews, and a CSV of
  dialogue occurrences generated from the structural disassembly. It also
  contains `instructions.csv` and `control-flow.csv`, the reachable sequential
  VM decode and its graph edges.

`SNR*.MES` contains the strings. `SNR*.DAT` starts with the `SNDT` signature
and contains the scenario program that chooses when those strings are shown.

See [REVERSE_ENGINEERING.md](./REVERSE_ENGINEERING.md) for the known SNR binary
format, opcode evidence, and unresolved questions. See
[QUEST_RESEARCH.md](./QUEST_RESEARCH.md) for the current six-protagonist quest
map and supporting evidence.

The query tool can be used with a local save file when one is available. Run
`npm run query-dialog -- --help` for its supported context, at-sea, and
naval-battle query syntax.
