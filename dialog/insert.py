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

with open('./raw/SNR1.MES', 'rb') as file:
    file.seek(4756)

    reachedEnd = False
    id = 0

    while True:
        id += 1
        body = ''

        while True:
            character = file.read(1).decode('utf-8').replace('\'', '’')

            if character == '\u0000':
                break
            elif character == '':
                reachedEnd = True
                break
            else:
                body += character

        if reachedEnd:
            break

        try:
            cursor.execute("INSERT INTO messages (id, body) VALUES (%s, %s)", (id, body))
            connection.commit()
        except (Exception, psycopg2.DatabaseError) as error:
            print(error)
