/*
 The database is used as a tool to figure out what the extra bytes mean. So far I’ve been unable to, and it’ll
 be faster to just manually add in the message effects.
 */

CREATE TABLE messages
(
    id           serial
        CONSTRAINT messages_pk
            PRIMARY KEY,
    body         text,
    character_id integer,
    position     smallint,
    byte5        integer,
    byte8        integer,
    byte9        integer
);

/*
TRUNCATE messages;
ALTER SEQUENCE messages_id_seq RESTART WITH 1;
 */
