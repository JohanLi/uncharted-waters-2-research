# NPC fleet navigation

NPC fleets do not choose a straight line to a remote port. The game contains a
world-navigation graph. It finds graph nodes near the fleet and its
destination, searches that graph, caches the next few nodes in the fleet
record, and then uses a separate map-aware movement routine to sail toward the
current node.

This explains two otherwise surprising observations:

- Fleets bound for Pernambuco follow West Africa, continue around the Cape of
  Good Hope and along the far south of the map, and only then turn west.
- Fleets crossing from Europe toward Veracruz can go north by Ireland and
  Greenland before following North America south.

Those are graph routes, not direct great-circle-like courses and not evidence
that the game has mistaken the horizontal wrap seam. The paths can be poor in
geographical terms because the search minimizes graph hops rather than sailing
distance.

## Fleet navigation state

The 0x85-byte fleet record contains considerably more route state than the two
previously identified coordinate pairs:

```text
fleet[0x00..0x03]  current world position
fleet[0x04..0x07]  final/current mission navigation target
fleet[0x08..0x0B]  local terrain-aware temporary waypoint
fleet[0x0C..0x0D]  route-slot index and navigation flags
fleet[0x0E..0x0F]  unidentified navigation-adjacent word
fleet[0x10..0x17]  four cached navigation-graph node IDs (u16 each)
fleet[0x1B]        objective
fleet[0x1C]        objective argument
```

The low bits of `+0x0C` select one of the four cached node IDs. The upper bits
of the `+0x0C/+0x0D` word record which slots are populated and which phase of
navigation is active. The most useful confirmed flag is `fleet[0x0D] & 0x20`:
when set, the target selector uses the final target at `+0x04/+0x06` directly.
Without that flag it normally resolves the selected node ID from
`+0x10..+0x16` and uses that node's coordinates.

`fleet[0x0D] & 0x80` takes precedence over the graph cache and selects the
local temporary waypoint at `+0x08/+0x0A`. The route-state code normally
derives this waypoint from the current cached graph node by running a second,
terrain-aware search. Bit `0x08` marks a cached graph route that reaches the
graph node nearest the final destination; after its cached nodes have been
consumed, navigation switches to the exact `+0x04/+0x06` target. Bit `0x40`
participates in route exhaustion and rebuilding. Some flag combinations remain
to be named.

The word at `+0x0E/+0x0F` changes in timed saves, but the principal movement,
local-search, and route-advancement routines described below do not read it.
Calling it a movement accumulator would therefore be premature. Its exact
meaning remains unidentified.

For objectives 5–7, the pursuit refresh at `MAIN.EXE`
`0x1F94E–0x1F9CF` continually copies the tracked fleet's coordinates into
`+0x04/+0x06`. Pursuit therefore changes the endpoint continually, but it can
still pass through the same graph routing machinery when the target is remote.

## The world-navigation graph

The graph is held in a dynamically allocated block referenced through the
handle at runtime data word `0x0E1A`. The allocation made at `MAIN.EXE`
`0x1C3B1–0x1C3C8` reserves `0x300` paragraphs, or 12,288 bytes. Graph-node IDs
seen in saves run at least as high as 619.

The loader at `MAIN.EXE` `0x1B7BA–0x1B80A` opens `C:DATA1.LZW`. It expands
archive member 5 into runtime data beginning at `0xC1C2`, then member 4 into
the block referenced by `0x0E1A`. The already extracted files establish the
contents directly:

```text
raw/DATA1/DATA1.005  u16 node count: 0x026E = 622
raw/DATA1/DATA1.004  768 × 16-byte graph-node storage
```

Nodes 0–621 are active. The allocation and extracted member have capacity for
768 nodes; records after the active count are ignored.

The earlier identification of `KOUKAI2.COM` was caused by using the wrong
DS-to-file base. At startup the program makes `DS` equal to its relocated stack
segment. With that segment accounted for, `DS:0x0B64` maps to the embedded
`C:DATA1.LZW` string at file offset `0x3C6D4`.

Each graph node is 16 bytes:

```text
node[0x00]  world X; bit 15 is also used as a marker
node[0x02]  world Y
node[0x04]  neighbor 0 node ID, or 0xFFFF
node[0x06]  neighbor 1 node ID, or 0xFFFF
node[0x08]  neighbor 2 node ID, or 0xFFFF
node[0x0A]  neighbor 3 node ID, or 0xFFFF
node[0x0C]  cost of edge 0
node[0x0D]  cost of edge 1
node[0x0E]  cost of edge 2
node[0x0F]  cost of edge 3
```

Thus a node has at most four outgoing connections. Each connection also has an
unsigned-byte value which the search accumulates, but, importantly, does not
use to prioritize its work queue. This is a sparse authored sea-lane graph,
not a waypoint list attached to each port.

The route builder at `MAIN.EXE` `0x28A18–0x28F37` works as follows:

1. `0x28939–0x28A17` scans the graph and selects the node with the smallest
   squared wrapped-world distance from the fleet's current position.
2. It repeats that scan for the final navigation target.
3. It initializes a 768-entry word array to `0xFFFF`, seeds the destination
   node, and visits neighbor links in a FIFO queue.
4. It reconstructs a path from the current node toward the destination node.
5. At `0x28F05–0x28F23` it stores as many as four successive node IDs in the
   fleet's `+0x10..+0x16` cache and initializes the active route slot.

Although the routine accumulates the bytes at node offsets `+0x0C..+0x0F`, it
marks a node visited on first discovery and uses a FIFO queue. It neither picks
the lowest accumulated cost next nor relaxes an already visited node. The
selected route therefore minimizes number of graph edges, with neighbor-slot
order breaking ties. It is breadth-first graph traversal, not Dijkstra's
algorithm. This implementation detail is the reason a shorter real-world route
can lose to an extremely long route containing fewer authored graph links.

## Reproducing the observed routes

Running that breadth-first traversal over `DATA1.004`, using the count from
`DATA1.005`, reproduces both observations from Lisbon `(120,358)`.

Pernambuco `(2064,722)` maps from node 184 to node 463 in 49 graph hops. Its
route begins south along West Africa, passes the Cape, follows the southern map
boundary west, and then turns north to Pernambuco. The exact node sequence is:

```text
184, 618, 617, 602, 601, 24, 25, 26, 27, 28, 29, 603, 30, 31,
32, 33, 34, 35, 36, 296, 604, 297, 298, 299, 557, 556, 555, 554,
553, 552, 551, 550, 549, 548, 547, 546, 545, 544, 543, 476, 475,
474, 473, 469, 468, 467, 466, 465, 464, 463
```

Veracruz `(1736,532)` maps from node 184 to node 441 in 43 hops. Its route goes
north from Lisbon, across the Ireland/Greenland corridor, and south along North
America. These results confirm that the observed tracks are the graph search's
intended output, not a local collision-avoidance accident.

## Following the cached route

`MAIN.EXE` `0x1F340–0x1F3E2` chooses the coordinate toward which an NPC fleet
will move during the current update. Its relevant priority is:

1. use the temporary waypoint at `+0x08/+0x0A` when flag `0x80` is set;
2. otherwise use the exact mission target at `+0x04/+0x06` when flag `0x20`
   is set; and
3. otherwise resolve the selected graph-node ID from the four-node cache.

In ordinary graph mode the third branch:

1. reads the active slot from `fleet[0x0C]`;
2. reads the corresponding node ID from `fleet[0x10 + slot * 2]`;
3. multiplies the ID by 16;
4. reads that graph node's X and Y; and
5. passes those coordinates to the movement routine.

The matching route-state code at `0x2980C–0x299CC` notices when the fleet has
reached a temporary waypoint or cached node, advances to another populated
slot, refills/rebuilds the cache when necessary, and finally switches to the
exact target when the graph portion of the route is complete.

### Local terrain waypoint layer

The four-node cache is the long-distance layer; it does not directly account
for every coastline tile between graph nodes. Before ordinary movement, the
route-state routine resolves the selected graph node into coordinates and
writes those coordinates to `+0x08/+0x0A`. It then invokes the local search at
`MAIN.EXE` `0x291FD–0x294DF`.

That routine constructs a 72-by-72-cell terrain work area, explores as many as
eight neighboring directions, reconstructs a local path, and overwrites
`+0x08/+0x0A` with a nearer sub-waypoint. Flag `0x80` then makes that
sub-waypoint the fleet's effective target. Only after the fleet reaches it
exactly does `0x2980C–0x299CC` generate another local waypoint or resume
advancing through the graph-node cache. The resulting hierarchy is:

```text
final mission target
  -> 622-node world-graph route
  -> selected node from the four-node cache
  -> 72x72 local terrain search
  -> temporary waypoint at fleet +0x08
  -> incremental ship movement
```

The movement routine at `MAIN.EXE` `0x1F456–0x1F71A` then moves between the
selected coordinates. It works in a world of width `0x870` and height `0x438`,
handles the horizontal wrap, intersects the intended line with the currently
processed world-map block, tests candidate points with the terrain predicate
at logical address `2DFF:387C`, and searches along a block edge when the first
candidate is blocked.

This routine supplies local land avoidance and incremental movement. It is not
the long-distance route planner and cannot by itself explain the full observed
corridors; those come from the upstream graph traversal.

## Confirmed temporary-waypoint deadlock

In one observed pair of timed saves from the same campaign, taken 15 days
apart, Jossepi Arleo and John Davis do not move at all. Their positions, exact
mission targets, route-state words, four cached node IDs, objectives, and home
ports are unchanged.

Both fleets have flag `0x80` set and share the same effective temporary
waypoint, `(144,312)`:

| Fleet         | Position    | Route state | Cached graph target          | Temporary waypoint |
| ------------- | ----------- | ----------- | ---------------------------- | ------------------ |
| Jossepi Arleo | `(145,381)` | `0x8071`    | slot 1: node 617 `(131,382)` | `(144,312)`        |
| John Davis    | `(185,346)` | `0x80F0`    | slot 0: node 136 `(242,365)` | `(144,312)`        |

Jossepi's cache contains `619, 617, 602, 601`; he is trading toward Shiraz.
John's contains `136, 180, 14, 139`; his return-home objective ultimately
targets Margarita. Nevertheless, neither cached graph node currently controls
movement because the `0x80` temporary-waypoint branch has priority.

The extracted terrain grid contains land along both straight segments to
`(144,312)`. In the game this appears as Jossepi remaining outside Ceuta and
John following the coast between Valencia and Barcelona without making route
progress. The incremental movement routine repeatedly tries to approach the
same temporary waypoint and performs only local block-edge avoidance.

Route advancement requires exact coordinate equality with the temporary
waypoint. No no-progress counter, timeout, or fallback is evident in the
relevant routines. Consequently the `0x80` flag is never cleared, a new local
waypoint is never generated, and the global graph cache is never advanced.
This is a genuine navigation deadlock caused by an unusable local waypoint,
not by the FIFO world-graph route itself.

The local search at `0x291FD–0x294DF` is the code which creates `(144,312)`.
Both fleets were handled in the same local terrain area, and the search chose
the same boundary-aligned point for them despite their different graph goals.
The exact internal condition which makes that cell win remains to be isolated,
but the saved target-selection and deadlock sequence are confirmed.

## Coordinate seam

Port coordinates in the save use the game's raw world X coordinate. The map
extractor rotates X for presentation, placing the pieces in the intuitive
Americas → Europe/Africa → Asia order. For example:

```text
             raw game coordinate    rotated display coordinate
Lisbon             (120, 358)              (840, 358)
Veracruz          (1736, 532)              (296, 532)
Pernambuco        (2064, 722)              (624, 722)
```

With the raw width of 2160, Lisbon to Pernambuco correctly wraps west by 216
X units. Lisbon to Veracruz also chooses the westward Atlantic direction. The
peculiar routes therefore do not arise from choosing the wrong side of the
world seam.

## What remains to extract

The graph, node count, and basic search are now identified. Useful remaining
work is to:

- plot all 622 nodes and their four possible links over the world map;
- transcribe the FIFO search and four-node cache refill into reusable code;
- identify the semantic purpose of the accumulated per-edge bytes; and
- identify the word at fleet offset `+0x0E`; and
- isolate why the local terrain search selects the unusable `(144,312)` cell.

Timed saves are still useful for assigning friendly names to the route flags
and confirming when a four-node cache is refilled, but they are no longer
needed to distinguish graph routing from purely local coast following.

## Relevant code

- `MAIN.EXE` `0x1C3B1–0x1C3C8`: allocate the navigation-graph block and store
  its handle at runtime word `0x0E1A`.
- `MAIN.EXE` `0x1B7BA–0x1B80A`: load graph members 5 and 4 from `DATA1.LZW`.
- `DATA1.005`: active graph-node count, 622.
- `DATA1.004`: 16-byte graph-node records.
- `MAIN.EXE` `0x28939–0x28A17`: find the graph node nearest a world coordinate.
- `MAIN.EXE` `0x28A18–0x28F37`: FIFO graph search and route reconstruction.
- `MAIN.EXE` `0x28F05–0x28F23`: cache as many as four route-node IDs in a fleet.
- `MAIN.EXE` `0x291FD–0x294DF`: construct a 72-by-72 local terrain route and
  write a temporary waypoint.
- `MAIN.EXE` `0x295B8–0x2965B`: select a graph node or exact mission endpoint.
- `MAIN.EXE` `0x2980C–0x299CC`: advance cached graph nodes and rebuild route
  state.
- `MAIN.EXE` `0x1F340–0x1F3E2`: resolve an NPC fleet's active movement target.
- `MAIN.EXE` `0x1F456–0x1F71A`: wrapped-world incremental movement and local
  terrain avoidance.
- `MAIN.EXE` `0x1F94E–0x1F9CF`: refresh a moving fleet target for pursuit.
- `MAIN.EXE` logical address `2DFF:387C`: terrain predicate used by the local
  movement routines.
