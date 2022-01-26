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
        message = ''

        while True:
            character = file.read(1).decode('utf-8').replace('\'', '’')

            if character == '\u0000':
                break
            elif character == '':
                reachedEnd = True
                break
            else:
                message += character

        if reachedEnd:
            break

        try:
            cursor.execute("INSERT INTO dialog (id, file, message) VALUES (%s, %s, %s)", (id, "SNR1.MES", message))
            connection.commit()
        except (Exception, psycopg2.DatabaseError) as error:
            print(error)
