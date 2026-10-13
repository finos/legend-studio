drop schema if exists demo cascade;
create schema demo;
create table demo.sales (id INTEGER PRIMARY KEY, country VARCHAR(10), product VARCHAR(10), year INTEGER, amount INTEGER, price DOUBLE);
insert into demo.sales values (1, 'France', 'Tea', 2022, 120, 2.5), (2, 'France', 'Coffee', 2023, 80, 3.1), (3, 'France', 'Tea', 2024, 150, 2.7), (4, 'Germany', 'Tea', 2022, 90, 2.4), (5, 'Germany', 'Coffee', 2022, 60, 3.0), (6, 'Germany', 'Coffee', 2024, 110, 3.3), (7, 'Japan', 'Tea', 2023, 200, 2.9), (8, 'Japan', 'Tea', 2024, 40, 2.9), (9, 'France', 'Coffee', 2024, 30, 3.2), (10, 'Spain', 'Coffee', 2022, 70, 3.0);
