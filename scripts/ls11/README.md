# LS11

A codec for KOEI's LS10/LS11 archives, the game's `.LZW` files. They are not
LZW: each entry is LZSS-compressed with gamma-like codes, and all entries
share one 256-byte literal table. `index.ts` describes the layout; the format
is documented at https://sites.google.com/site/drrkdriller/uncharted-waters-2/lsw.

- `decodeArchive(data)` returns every entry; `readArchive` and `decodeEntry`
  read the index and one entry.
- `encodeArchive(files)` builds an archive with a shortest-path parse. On
  `KAO.LZW` its streams come out about 5.5% smaller than KOEI's.

`ls11.test.ts` checks that all 14 archives in `raw/` (`LS10`: `CHAR`, `IAE1`,
`IAP1`–`IAP6`; `LS11`: the rest) decode to the extracted parts in the
matching `raw/` folders, and that an encoded archive decodes back.

`KAO.LZW` continues past its last entry: the generated-portrait parts bank
at `0x49F01` is stored uncompressed after the archive
(`scripts/temporary-sailors`).
