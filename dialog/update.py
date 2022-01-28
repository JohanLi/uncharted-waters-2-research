import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

connection = psycopg2.connect(
    host = os.getenv('POSTGRES_HOST'),
    user = os.getenv('POSTGRES_USER'),
    password = os.getenv('POSTGRES_PASSWORD')
)

cursor = connection.cursor()

with open('./raw/SNR1.DAT', 'rb') as file:
    while True:
        byte1 = file.read(1)

        if byte1 == b'':
            break

        if not (byte1 == b'\x01' or byte1 == b'\x02'):
            continue

        byte2 = file.read(1)

        if byte2 != b'\xcc':
            file.seek(-1, 1)
            continue

        character_id = int.from_bytes(file.read(2), 'big') + 1
        byte5 = int.from_bytes(file.read(1), 'big')
        dialog_id = int.from_bytes(file.read(2), 'big')
        byte8 = int.from_bytes(file.read(1), 'big')
        byte9 = int.from_bytes(file.read(1), 'big')

        try:
            cursor.execute(
                'UPDATE dialog SET character_id = %s, upper_or_lower = %s, byte5 = %s, byte8 = %s, byte9 = %s WHERE id = %s',
                (character_id, int.from_bytes(byte1, 'big'), byte5, byte8, byte9, dialog_id + 1)
            )
            connection.commit()
        except (Exception, psycopg2.DatabaseError) as error:
            print(error)
