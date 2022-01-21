import json
import pathlib
import sys

try:
    ports = json.load(open('./output/ports.json'))
    ships = json.load(open('./output/ships.json'))
except FileNotFoundError:
  print('You need to run ports/extract_metadata.py and ships/extract_metadata.py first')
  sys.exit()

pathlib.Path('./output').mkdir(parents=True, exist_ok=True)

port_to_shipyard = {}
shipyard_to_ships = {}

shipyard_id = 0

with open('./ships/shipyard_data.txt') as file:
    for i, line in enumerate(file):
        if i == 0:
            continue

        if line == '\n':
            shipyard_id += 1
            shipyard_to_ships[shipyard_id] = []

        port = line[1:15].strip()
        ship = line[35:51].strip()
        industryRequirement = line[52:56].strip()

        if port:
            found = False

            for portId in ports:
                if not portId.isnumeric():
                    continue

                if port == ports[portId]['name']:
                    found = True
                    port_to_shipyard[portId] = str(shipyard_id)

            if not found:
                print(f'"{port}" was not found in the list of ports')


        if ship:
            found = False

            for shipId in ships:
                if ship == ships[shipId]['name']:
                    found = True
                    shipyard_to_ships[shipyard_id].append({
                        'shipId': shipId,
                        'industryRequirement': int(industryRequirement)
                    })

            if not found:
                print(f'"{ship}" was not found in the list of ships')

port_to_shipyard = dict(sorted(port_to_shipyard.items(), key=lambda x:int(x[0])))

with open('./output/portToShipyard.json', 'w') as file:
    json.dump(port_to_shipyard, file, indent=2)

with open('./output/shipyardToShips.json', 'w') as file:
    json.dump(shipyard_to_ships, file, indent=2)
