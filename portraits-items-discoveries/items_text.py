import json
import pathlib

pathlib.Path('./portraits-items-discoveries/output').mkdir(parents=True, exist_ok=True)

descriptions = []

with open('./raw/ITEM.MES', 'rb') as file:
    while True:
        bytes = file.read(172)

        if not bytes:
            break

        description = bytes.decode('utf-8').strip('\u0000')

        descriptions.append(description)

items = {}

with open('./raw/MAIN.EXE', 'rb') as file:
    file.seek(277192)

    for i, description in enumerate(descriptions):
        name = file.read(17).decode('utf-8').strip('\u0000')
        imageSlice = int.from_bytes(file.read(1), 'big')
        price = int.from_bytes(file.read(2), 'little') * 100
        rating = int.from_bytes(file.read(1), 'big')
        unknown4 = int.from_bytes(file.read(1), 'big')

        # another check could be to exclude ids that are not sold by Item Shops
        if name in ['106', 'bendadecan', 'chakuses', 'Expiation', 'Pardon', 'null'] or description == 'Expiation':
            continue

        if name == 'Reserve':
            break

        items[i + 1] = {
           'name': name,
           'description': description,
           'price': price,
           'imageSlice': imageSlice,
           'rating': rating,
           'categoryId': str(unknown4 + 1),
       }

with open('./portraits-items-discoveries/output/items.json', 'w') as file:
    json.dump(items, file, indent=2, ensure_ascii = False)

categories = {}

with open('./raw/MAIN.EXE', 'rb') as file:
    file.seek(245902)

    for i in range(1, 15):
        categories[i] = ''

        while True:
            category = file.read(1).decode('utf-8').replace('\'', '’')

            if category == '\u0000':
                break
            else:
                categories[i] += category

with open('./portraits-items-discoveries/output/itemTypes.json', 'w') as file:
    json.dump(categories, file, indent=2, ensure_ascii = False)
