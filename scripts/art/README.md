# Art extraction

This directory extracts the game's GRAPH-style image archives.

- `npm run extract-event-art` writes the 32 native 192×144 event images to
  `output/event-art`.
- `npm run extract-graph-art` scans `GRAPH.DAT`, `GRAPH2.DAT`, `ENDGRP.DAT`,
  and the split `OPGRAPH` archives, writing every compatible image and a
  contact sheet to `output/graph-art`.
- `npm run extract-art` runs both extractors.
