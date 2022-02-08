from PIL import Image
import numpy
import pathlib
import math

pathlib.Path('./portraits-items-discoveries/output').mkdir(parents=True, exist_ok=True)

color_map = {
    0: '000000',
    # 1: '717192',
    2: '00A261',
    # 3: '0082F3',
    4: 'D34100',
    # 5: 'A26100',
    6: 'F3A261',
    # 7: '00B261',
    8: '0041D3',
    # 9: '0041C3',
    10: '00A2F3',
    # 11: '007161',
    12: 'D361A2',
    # 13: 'E3B251',
    14: 'F3E3D3',
    # 15: 'F3E3D3',
}

for char in range(0, 7):
    raw_bytes = numpy.fromfile(f'./raw/CHAR/CHAR.{str(char).zfill(3)}', 'uint8')
    raw_bits = numpy.unpackbits(raw_bytes)

    pointer = 0

    frames = []

    for frame in range(0, 8 if char < 6 else 24):
        image = numpy.zeros((32, 32, 4), 'uint8')

        for i in range(0, 4):
            for j in range(0, 16 * 16):
                color_map_index = f'{raw_bits[pointer + j]}{raw_bits[pointer + j + 32 * 8]}{raw_bits[pointer + j + 64 * 8]}{raw_bits[pointer + j + 96 * 8]}'
                color_map_index = int(color_map_index, 2)

                last_bit = raw_bits[pointer + j + 128 * 8]

                if last_bit == 1:
                    rgb = [0, 0, 0, 0]
                else:
                    rgb = list(bytes.fromhex(color_map[color_map_index])) + [255]

                if i == 0:
                    image[math.floor(j / 16)][j % 16] = rgb

                if i == 1:
                    image[math.floor(j / 16)][j % 16 + 16] = rgb

                if i == 2:
                    image[math.floor(j / 16 + 16)][j % 16] = rgb

                if i == 3:
                    image[math.floor(j / 16 + 16)][j % 16 + 16] = rgb

            pointer += 160 * 8

        frames.append(Image.fromarray(image))

    img = Image.new('RGBA', (32 * len(frames), 32))

    for i, image in enumerate(frames):
        img.paste(image, (i * 32, 0))

    img.save(f'./portraits-items-discoveries/output/char{char}.png')
