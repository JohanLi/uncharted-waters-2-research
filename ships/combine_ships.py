import pathlib
from PIL import Image, ImageDraw

pathlib.Path('./output').mkdir(parents=True, exist_ok=True)

ships = [
  'Balsa',
  'Hansa Cog',
  'Dhow',
  'Buss',
  'Tallette',
  'Caravela Latina',
  'Caravela Redonda',
  'Brigantine',
  'Nao',
  'Carrack',
  'Galleon',
  'Xebec',
  'Pinnace',
  'Sloop',
  'Frigate',
  'Barge',
  'Full-rigged Ship',
  'Junk',
  'Light Galley',
  'Flemish Galleon',
  'Venetian Galeass',
  'La Reale',
  'Tekkousen',
  'Atakabune',
  'Kansen'
]

im = Image.new('RGBA', (128 * len(ships), 96), (255, 255, 255, 0))

for i, ship in enumerate(ships):
  filename = ship.replace(' ', '-').lower()

  shipIm = Image.open(f'./ships/img/{filename}.png', 'r')
  im.paste(shipIm, (128 * i, 0))

im.save('./output/combined-ships.png')
