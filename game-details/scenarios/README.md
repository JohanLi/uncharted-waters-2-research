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
|        2 | Catalina Erantzo                       | [Scenario guide](./scenario-2-catalina-erantzo.md)                                                                    |
|        3 | Otto Baynes                            | [Scenario guide](./scenario-3-otto-baynes.md)                                                                         |
|        4 | Ernst von Bohr                         | [Scenario guide](./scenario-4-ernst-von-bohr.md)                                                                      |
|        5 | Pietro Conti                           | [Scenario guide](./scenario-5-pietro-conti.md)                                                                        |
|        6 | Ali Vezas                              | [Scenario guide](./scenario-6-ali-vezas.md)                                                                           |

## Primary research sources

- `raw/SNR*.DAT` and `raw/SNR*.MES`: scenario programs and their message banks.
- [`dialog-system/scripts/REVERSE_ENGINEERING.md`](../../dialog-system/scripts/REVERSE_ENGINEERING.md):
  VM, save-state, title, and runtime evidence.
- `game-details/fame/`: sources and effects of the three Fame values.
- `game-details/friendship.md`: Relation changes made by diplomatic royal
  missions.
