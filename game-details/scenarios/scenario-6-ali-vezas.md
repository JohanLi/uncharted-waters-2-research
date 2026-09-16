# Scenario 6: Ali Vezas

Ali's story depends more on money, rank, alliance, and choice state than on
Fame. A Fame-only progression model is therefore especially misleading for
his early sections.

## Story and threshold map

| Section | Gate                                 | Story                            |
| ------: | ------------------------------------ | -------------------------------- |
|       0 | Debt repayment and royal progression | Rise to Page and meet the Sultan |
|       1 | Rank/progression                     | Sultan's expansion commission    |
|       2 | 100 gold ingots                      | João, Catalina, and Sapha        |
|       3 | Candidate 15 allied ports            | Radino and Howell's Pietro debt  |
|       4 | Completion of section 3              | Sultan's 100-ingot reward        |
|       5 | 40,000 Trade Fame                    | Sapha and the Istanbul house     |

## Section guide

### 0–1: debt and the Sultan

Istanbul-specific one-shot building flags stage Ali's debt repayment, royal
mission/rank state, and handoff to the Sultan. The expansion commission then
uses Palace summons, investment/alliance instructions, and rewards. This is a
rank/progression gate, not a simple Fame tier.

### 2: 100 ingots and Sapha

`EA 00` is compared directly with literal 100 before activation, supporting a
100-gold-ingot requirement. Subsequences cover João's decoy sail, Catalina, a
voyage-day-5 event, Basra (`0x4C`), and Sapha.

### 3–4: Pietro's debt and Sultan reward

Routes explicitly use Venice (`0x0D`), Lisbon (`0x00`), Sakai (`0x62`), and
Nagasaki (`0x63`). A 15-allied-port prerequisite is strongly supported, but
the alliance-count operand remains unnamed and needs a 14/15 boundary test.

The following short Palace transition awards 100 ingots and advances the
story.

### 5: final family sequence

Two exact 40,000 Trade Fame comparisons gate the criticism and later final
sequence. Routes cover Basra, Venice, the Istanbul house purchase, and Ali's
Pub ending.

## Practical progression guide

| If the story appears stuck at… | Check…                                                                   |
| ------------------------------ | ------------------------------------------------------------------------ |
| Opening debt                   | Finish the Istanbul building stages and royal/rank progression           |
| Sultan commission              | Invest in and ally ports rather than only raising Trade Fame             |
| João/Catalina/Sapha            | Hold 100 gold ingots and complete the voyage-day-5 handoff               |
| Pietro debt                    | Follow Venice → Lisbon → Sakai/Nagasaki and verify allied-port progress  |
| Sultan reward                  | Return to the Palace after completing the debt chain                     |
| Final house sequence           | Reach 40,000 Trade Fame, then follow Basra, Venice, and Istanbul prompts |

## Highest-value validation

- Saves with 99 and 100 ingots before section-2 activation.
- Saves with exactly 14 and 15 allied ports before Istanbul Harbor.
- Identification of the alliance-count VM source and the early rank fields.
