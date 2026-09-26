# NPC fleet navigation

NPC fleets do not choose a straight line to a remote port. The game contains a
world-navigation graph. It finds graph nodes near the fleet and its
destination, searches that graph, caches the next few nodes in the fleet
record, and then uses a separate map-aware movement routine to sail toward the
current node.

Two routes computed from the stored graph (see
[Worked routes from Lisbon](#worked-routes-from-lisbon)) show the consequences:

- Fleets bound from Lisbon for Pernambuco follow West Africa, continue around
  the Cape of Good Hope and along the far south of the map, and only then turn
  west.
- Fleets crossing from Lisbon toward Veracruz go north by Ireland and
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
fleet[0x0E..0x0F]  in-area step accumulator
fleet[0x10..0x17]  four cached navigation-graph node IDs (u16 each)
fleet[0x1B]        objective
fleet[0x1C]        objective argument
```

The low bits of `+0x0C` select one of the four cached node IDs. The upper bits
of the `+0x0C/+0x0D` word record which slots are populated and which phase of
navigation is active. The most useful decoded flag is `fleet[0x0D] & 0x20`:
when set, the target selector uses the final target at `+0x04/+0x06` directly.
Without that flag it normally resolves the selected node ID from
`+0x10..+0x16` and uses that node's coordinates.

`fleet[0x0D] & 0x80` takes precedence over the graph cache and selects the
local temporary waypoint at `+0x08/+0x0A`. The route-state code normally
derives this waypoint from the current cached graph node by running a second,
terrain-aware search. Bit `0x08` marks a cached graph route that reaches the
graph node nearest the final destination; after its cached nodes have been
consumed, navigation switches to the exact `+0x04/+0x06` target.

### Route state

The high byte `+0x0D` holds these flags:

| Bit    | Meaning                                                                                          |
| ------ | ------------------------------------------------------------------------------------------------ |
| `0x01` | Preserved by the view-shift reset (`0xBE3D`); no reader found                                    |
| `0x02` | Reset the step accumulator at `+0x0E` on the next in-area step (`0x36F6A–0x36F7C`), then cleared |
| `0x08` | The cached route reaches the graph node nearest the destination (`0x28F23`)                      |
| `0x20` | Steer to the exact target at `+0x04/+0x06`                                                       |
| `0x40` | The cached route is empty or used up and must be rebuilt                                         |
| `0x80` | The temporary waypoint at `+0x08/+0x0A` is active                                                |

Bit `0x40` is set when advancing through the cache leaves no filled slot
(`0x2989A`, `0x2998B`). The route-state code then either switches to the exact
target, when bit `0x08` is set, or calls the route builder (`0x28A18`), which
refills the cache and clears `0x40` (`0x28F2B`). When a fleet is given a new
destination, the game writes the whole word as `0x4000`, or `0x6000` for an
exact target in the loaded area (`0x395AB`, `0x39671`, `0x20379`,
`0x36DAC`, `0x36E4F`): cache slot 0, no cached nodes, no waypoint, and a
rebuild pending. Scenario scripts use the same value. When the loaded sea area
shifts, fleets whose waypoint now lies on land are reset the same way,
keeping only bit `0x01` (`0xBDD8`, `0xBE3D–0xBE42`).

The word at `+0x0E/+0x0F` is the step accumulator of the in-area heading
routine (`0x36EC1`): it is seeded with `−(|dx| / 2)` when bit `0x02` is set
and drives a line-drawing walk toward the target (`0x36F6A–0x36FAC`).

The objective byte `+0x1B` selects what a fleet is doing. Speaking to a fleet
with **Gossip** at sea reports it through a line chosen by objective
(`MAIN.EXE 0x2589B`, dispatch table at `0x25954`):

| Objective | Gossip line                                                                                                              | Argument `+0x1C`         |
| --------: | ------------------------------------------------------------------------------------------------------------------------ | ------------------------ |
|         0 | 152, “We're on our way home.”                                                                                            | port                     |
|         1 | 153, “We're heading for %s to make an investment there.”                                                                 | port                     |
|         2 | 154, “We're off to trade goods in %s.”                                                                                   | port                     |
|         3 | 155, “Ohhh, I was waiting for you to sail by. It's time to teach you a lesson.”                                          | port                     |
|         4 | 156, “Unlucky fool! You don't know who I am.”                                                                            | none; follows the player |
|       5–7 | 157, “We're looking for %s of %s.” (161, “And you know what? You are my next prey.”, when the target is the protagonist) | sailor; 7 pursues        |
|         8 | 158, “We're sailing in a convoy to protect merchant fleets. …”                                                           | —                        |
|         9 | 159, “I'm on the lookout for pirates. They won't get away from me!”                                                      | port                     |
|        10 | 160, “I have some business with you.”                                                                                    | sailor; follows          |

Objectives 3, 4, and 5–7 aimed at the protagonist are hostile: Gossip then
starts a battle at any hour ([Nightfall](../naval-battle.md#nightfall)).

For objectives 5–7, the pursuit refresh at `MAIN.EXE`
`0x1F94E–0x1F9CF` continually copies the tracked fleet's coordinates into
`+0x04/+0x06`. Pursuit therefore changes the endpoint continually, but it can
still pass through the same graph routing machinery when the target is remote.

## The world-navigation graph

The graph is held in a dynamically allocated block referenced through the
handle at runtime data word `0x0E1A`. The allocation made at `MAIN.EXE`
`0x1C3B1–0x1C3C8` reserves `0x300` paragraphs, or 12,288 bytes.

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

## Worked routes from Lisbon

Running that breadth-first traversal over `DATA1.004`, using the count from
`DATA1.005`, gives the following routes from Lisbon `(120,358)`. The node
nearest Lisbon is node 184 at `(115,357)`.

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
America. Both corridors are therefore the graph search's intended output, not a
local collision-avoidance accident.

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
the long-distance route planner and cannot by itself produce the long corridors
above; those come from the upstream graph traversal.

## Temporary-waypoint deadlock

The route-state routine gives the temporary waypoint priority and advances only
on exact arrival. When flag `0x80` is set, `MAIN.EXE` `0x29819–0x29836`
compares the fleet position at `+0x00/+0x02` with the waypoint at
`+0x08/+0x0A`. If either coordinate differs, the routine returns without
changing the route state. Neither it nor the incremental movement routine keeps
a no-progress counter, timeout, or fallback.

Consequently, if the local search at `0x291FD–0x294DF` writes a waypoint that
incremental movement never reaches exactly, the `0x80` flag is never cleared, a
new local waypoint is never generated, and the global graph cache is never
advanced. The fleet keeps its mission, exact target, and cached graph nodes,
but the movement routine repeatedly tries to approach the same waypoint and
performs only local block-edge avoidance. Because the `0x80` branch has
priority, the cached graph nodes do not control movement meanwhile. This is a
navigation deadlock caused by an unusable local waypoint, not by the FIFO
world-graph route itself. It persists while the fleet remains inside the
currently loaded sea-map area; it is not necessarily permanent once the player
sails away.

## Off-screen recovery

The game explicitly discards a local temporary waypoint after a fleet leaves
the currently loaded 72-by-72-cell sea-map area. The fleet loop at `MAIN.EXE`
`0x2025D–0x20417` tests each active fleet with the same loaded-area predicate
used by local navigation. Its off-screen branch at `0x203FD` clears
`fleet[0x0D] & 0x80`. The ordinary updater at `0x1FE94–0x1FF39` also skips its
world-coordinate movement while a fleet is inside that loaded area, but calls
the graph-target selector and incremental movement routines when the fleet is
outside it.

This provides a recovery path for the deadlock above: once the fleet is outside
the loaded area, the unusable waypoint no longer controls it, and its mission
is unchanged. The target selector resolves the selected world-graph node from
the four-node cache, and the fleet advances its graph cache normally. The stale
waypoint words remain at `+0x08/+0x0A`, but they are ignored after flag `0x80`
has been cleared. This is visibility/loaded-area dependent rather than a
no-progress timer attached to the fleet.

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
- isolate the conditions under which the local terrain search can select a
  waypoint that incremental movement never reaches exactly.

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
- `MAIN.EXE` `0x1FE94–0x1FF39`: skip ordinary world movement for a fleet in
  the loaded sea area and update it normally when off-screen.
- `MAIN.EXE` `0x2025D–0x20417`: active-fleet sea-area loop; the branch at
  `0x203FD` clears the temporary-waypoint flag for an off-screen fleet.
- `MAIN.EXE` logical address `2DFF:387C`: terrain predicate used by the local
  movement routines.
