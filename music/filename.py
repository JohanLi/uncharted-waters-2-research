import os

path = './converted/'

for filename in os.listdir(path):
    newFilename = filename.lower().replace(' ', '-').replace('’', '')

    os.rename(path + filename, path + newFilename.lower())

then = os.listdir(path)
print(then)
