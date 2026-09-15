# Scenarios

This directory documents how the game's scenario programs behave from a
player's point of view. The numbered scenario is the matching `SNR*.DAT` and
`SNR*.MES` pair in `raw/`.

Evidence labels used in these notes:

- **Confirmed**: observed during play or in controlled save files and
  consistent with the program.
- **Decoded**: directly represented by a known scenario route, comparison,
  state change, or dialogue call.
- **Likely**: supported by the program structure or game text, but at least one
  relevant VM operation still needs a gameplay name or runtime test.
- **Unknown**: not established by the current research.

## Current coverage

| Scenario | Content                                | Documentation                                                                                                         |
| -------: | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
|        0 | Common Guild quests and royal missions | [Overview](./scenario-0-common-quests-and-royal-missions.md), [royal mission catalog](./scenario-0-royal-missions.md) |
|        1 | João Franco                            | [Scenario guide](./scenario-1-joao-franco.md)                                                                         |
|        2 | Catalina Erantzo                       | Not started                                                                                                           |
|        3 | Otto Baynes                            | Not started                                                                                                           |
|        4 | Ernst von Bohr                         | Not started                                                                                                           |
|        5 | Pietro Conti                           | Not started                                                                                                           |
|        6 | Ali Vezas                              | Not started                                                                                                           |

## Primary research sources

- `scripts/dialog/output/scenarios.json`: decoded sections, routes,
  instructions, messages, and state operations.
- `scripts/dialog/output/readable/scenario-0.md`: generated structural view of
  Scenario 0.
- `scripts/dialog/REVERSE_ENGINEERING.md`: VM, save-state, title, and runtime
  evidence.
- `game-details/fame/`: sources and effects of the three Fame values.
- `game-details/friendship.md`: Relation changes made by diplomatic royal
  missions.
