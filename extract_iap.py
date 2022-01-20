from PIL import Image
import numpy
import pathlib

# contains player sprites for dueling

pathlib.Path('./output').mkdir(parents=True, exist_ok=True)

color_map = {
    0: '000000',
    1: 'transparent',
    2: '00A261',
    4: 'D34100',
    6: 'F3A200',
    8: '0041D3',
    9: '0040D0',
    10: '00A2F3',
    12: 'F341C3',
    13: 'F040C0',
    14: 'F3E3D3',
}

for y in range(1, 7):
    for x in range(35):
        filepath = f'./raw/IAP{y}/IAP{y}.{str(x).zfill(3)}'

        file = open(filepath, 'rb')
        bytes_read = 0

        metadataList = []

        while True:
            metadataList.append({
                'x':  int.from_bytes(file.read(1), byteorder='big'),
                'y':  int.from_bytes(file.read(1), byteorder='big'),
                'columns':  int.from_bytes(file.read(1), byteorder='big'),
                'rows':  int.from_bytes(file.read(1), byteorder='big'),
                'start_address':  int.from_bytes(file.read(4), byteorder='big'),
            })

            bytes_read += 8

            if bytes_read >= metadataList[0]['start_address']:
                break

        raw_bytes = numpy.fromfile(filepath, 'uint8')

        for i, metadata in enumerate(metadataList):
            start = metadata['start_address']
            end = metadata['start_address'] + metadata['columns'] * 4 * metadata['rows']

            raw_bits = numpy.unpackbits(raw_bytes[start:end])

            pointer = 0

            output = []

            while pointer < len(raw_bits):
                for j in range(8):
                    color_map_index = f'{raw_bits[pointer + j + 0]}{raw_bits[pointer + j + 8]}{raw_bits[pointer + j + 16]}{raw_bits[pointer + j + 24]}'
                    color_map_index = int(color_map_index, 2)

                    if color_map[color_map_index] == 'transparent':
                        rgb = [0, 0, 0, 0]
                    else:
                        rgb = list(bytes.fromhex(color_map[color_map_index])) + [255]

                    output.append(rgb)

                pointer += 32

            output = numpy.array(output, 'uint8').reshape(metadata['rows'], metadata['columns'] * 8, 4)

            img = Image.fromarray(output)
            img.save(f'./output/IAP{y}.{str(x).zfill(3)}-{i}.png')
