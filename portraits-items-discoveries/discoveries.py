from PIL import Image
import numpy
import pathlib
import math

pathlib.Path('./portraits-items-discoveries/output').mkdir(parents=True, exist_ok=True)

color_map = {
    0: '000000',
    1: '00A060',
    2: 'D04000',
    3: 'F0A060',
    4: '0040D0',
    5: '00A0F0',
    6: 'D060A0',
    7: 'F0E0D0',
}

images = []

for i in range(128, 227):
    raw_bytes = numpy.fromfile(f'./raw/KAO/KAO.{str(i).zfill(3)}', 'uint8')
    raw_bits = numpy.unpackbits(raw_bytes)

    image = []
    pointer = 0

    while pointer < len(raw_bits):
        for j in range(8):
            color_map_index = f'{raw_bits[pointer + j + 0]}{raw_bits[pointer + j + 8]}{raw_bits[pointer + j + 16]}'
            color_map_index = int(color_map_index, 2)

            if color_map[color_map_index] == 'transparent':
                rgb = [0, 0, 0, 0]
            else:
                rgb = list(bytes.fromhex(color_map[color_map_index])) + [255]

            image.append(rgb)

        pointer += 24

    img = Image.fromarray(numpy.array(image, 'uint8').reshape(48, 48, 4))
    images.append(img)

img = Image.new('RGB', (48 * len(images), 48))

for i, image in enumerate(images):
    img.paste(image, (i * 48, 0))

img.save('./portraits-items-discoveries/output/discoveries.png')
