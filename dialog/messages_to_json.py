import os
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv
import json
import re

load_dotenv()

connection = psycopg2.connect(
    host = os.getenv('POSTGRES_HOST'),
    user = os.getenv('POSTGRES_USER'),
    password = os.getenv('POSTGRES_PASSWORD')
)

cursor = connection.cursor(cursor_factory = psycopg2.extras.RealDictCursor)

cursor.execute('SELECT body, character_id AS "characterId", position FROM messages ORDER BY id ASC')
messages = cursor.fetchall()

# we will be displaying character names at all times. In the original game, names appear when the character is first encountered
for message in messages:
   message['body'] = re.sub(r'\|.*?\|\n', '', message['body'])
   message['body'] = message['body'].replace('$n', '$firstName')
   message['body'] = message['body'].replace('$s', '$lastName')

   if message['characterId'] is None:
      del message['characterId']
   else:
      message['characterId'] = str(message['characterId'])

   if message['position'] is None:
      message['position'] = 0

with open('./dialog/output/messages.json', 'w') as file:
    json.dump(messages, file, indent=2, ensure_ascii = False)
