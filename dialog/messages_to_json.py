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

cursor.execute('SELECT body, character_id AS "characterId", upper_or_lower AS "upperOrLower" FROM dialog WHERE id >= 23 AND id <= 61 ORDER BY id ASC')
messages = cursor.fetchall()

# we will be displaying character names at all times. In the original game, names appear when the character is first encountered
for message in messages:
   message['body'] = re.sub(r'\|.*?\|\n', '', message['body'])
   message['body'] = message['body'].replace('$n', '$firstName')
   message['body'] = message['body'].replace('$s', '$lastName')
   message['characterId'] = str(message['characterId'])

with open('./dialog/output/mansion.json', 'w') as file:
    json.dump(messages, file, indent=2, ensure_ascii = False)

cursor.execute('SELECT body, character_id AS "characterId", upper_or_lower AS "upperOrLower" FROM dialog ORDER BY id ASC')
messages = cursor.fetchall()

for message in messages:
   message['body'] = re.sub(r'\|.*?\|\n', '', message['body'])
   message['body'] = message['body'].replace('$n', '$firstName')
   message['body'] = message['body'].replace('$s', '$lastName')
   message['characterId'] = str(message['characterId'])

with open('./dialog/output/messages.json', 'w') as file:
    json.dump(messages, file, indent=2, ensure_ascii = False)
