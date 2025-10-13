
# Amazon Datenbank Lab 1

## Operationale Abfrage

### SQL-Abfrage (zum Wireframe)


~~~sql
SELECT customers.name, orders.order_date, order_positions.quantity, order_positions.buying_price, products.title, products.category  
FROM customers  
INNER JOIN orders ON customers.id = orders.customer_id  
INNER JOIN order_positions ON orders.id = order_positions.order_id  
INNER JOIN products ON order_positions.product_id = products.id  
WHERE customers.name = 'Tom Frech' AND orders.order_date = '2022-05-06';
~~~

### Sinnvolle Indizes

~~~sql
Foreign-Key-Indizes:  
CREATE INDEX idx_orders_customer_id ON orders(customer_id);  
CREATE INDEX idx_order_positions_order_id ON order_positions(order_id);  
CREATE INDEX idx_order_positions_product_id ON order_positions(product_id);

Index für WHERE-Klausel (Namenssuche):  
CREATE INDEX idx_customers_name ON customers(name);
~~~

### Anmerkungen

"Explain Analyse" vor Anlegen der Indizes

~~~sql
 Nested Loop  (cost=13843.19..98265.51 rows=5 width=82) (actual time=110.571..399.171 rows=3 loops=1)
   ->  Nested Loop  (cost=13842.90..98264.00 rows=5 width=35) (actual time=110.535..399.121 rows=3 loops=1)
         Join Filter: (customers.id = orders.customer_id)
         Rows Removed by Join Filter: 4617
         ->  Seq Scan on customers  (cost=0.00..377.70 rows=1 width=18) (actual time=0.157..1.308 rows=1 loops=1)
               Filter: ((name)::text = 'Tom Frech'::text)
               Rows Removed by Filter: 19975
         ->  Gather  (cost=13842.90..97829.80 rows=4520 width=25) (actual time=42.857..397.332 rows=4620 loops=1)
               Workers Planned: 2
               Workers Launched: 2
               ->  Parallel Hash Join  (cost=12842.90..96377.80 rows=1883 width=25) (actual time=32.177..380.382 rows=1540 loops=3)
                     Hash Cond: (order_positions.order_id = orders.id)
                     ->  Parallel Seq Scan on order_positions  (cost=0.00..76292.81 rows=2758881 width=21) (actual time=0.083..146.774 rows=2207083 loops=3)
                     ->  Parallel Hash  (cost=12838.61..12838.61 rows=343 width=12) (actual time=29.699..29.700 rows=288 loops=3)
                           Buckets: 1024  Batches: 1  Memory Usage: 104kB
                           ->  Parallel Seq Scan on orders  (cost=0.00..12838.61 rows=343 width=12) (actual time=0.054..29.428 rows=288 loops=3)
                                 Filter: (order_date = '2022-05-06'::date)
                                 Rows Removed by Filter: 401544
   ->  Index Scan using products_pkey on products  (cost=0.29..0.30 rows=1 width=61) (actual time=0.013..0.013 rows=1 loops=3)
         Index Cond: (id = order_positions.product_id)
 Planning Time: 0.529 ms
 Execution Time: 399.228 ms
 ~~~

"Explain Analyse" nach anlegen der Indizes

~~~sql
 Nested Loop  (cost=1.43..28.45 rows=5 width=82) (actual time=0.073..0.098 rows=3 loops=1)
   ->  Nested Loop  (cost=1.15..26.94 rows=5 width=35) (actual time=0.062..0.072 rows=3 loops=1)
         ->  Nested Loop  (cost=0.71..18.40 rows=1 width=22) (actual time=0.050..0.059 rows=1 loops=1)
               ->  Index Scan using idx_customers_name on customers  (cost=0.29..8.30 rows=1 width=18) (actual time=0.027..0.028 rows=1 loops=1)
                     Index Cond: ((name)::text = 'Tom Frech'::text)
               ->  Index Scan using idx_orders_customer_id on orders  (cost=0.43..10.09 rows=1 width=12) (actual time=0.017..0.024 rows=1 loops=1)
                     Index Cond: (customer_id = customers.id)
                     Filter: (order_date = '2022-05-06'::date)
                     Rows Removed by Filter: 76
         ->  Index Scan using idx_order_positions_order_id on order_positions  (cost=0.43..8.43 rows=11 width=21) (actual time=0.010..0.011 rows=3 loops=1)
               Index Cond: (order_id = orders.id)
   ->  Index Scan using products_pkey on products  (cost=0.29..0.30 rows=1 width=61) (actual time=0.008..0.008 rows=1 loops=3)
         Index Cond: (id = order_positions.product_id)
 Planning Time: 1.136 ms
 Execution Time: 0.132 ms
 ~~~

## Analytische Abfrage

### SQL-Abfrage

~~~sql
SELECT products.category, COUNT(DISTINCT products.id) AS products, COUNT(DISTINCT orders.id) AS orders,  
SUM(order_positions.quantity * order_positions.buying_price) AS revenue  
FROM products  
INNER JOIN order_positions ON order_positions.product_id = products.id  
INNER JOIN orders ON order_positions.order_id = orders.id  
GROUP BY products.category;
~~~

### Optimierung / Performance

~~~sql
CREATE INDEX idx_op_product_order_cover
  ON order_positions (product_id, order_id)
  INCLUDE (quantity, buying_price);
~~~

- Keine weiteren sinnvollen Indizes (FK-Indizes bereits vorhanden)  
- Stattdessen wurden folgende Einstellungen angepasst:  
  SET max_parallel_workers_per_gather = 4;  
  SET parallel_leader_participation = on;  
- Erhöhung der Worker-Zahl führte zu einer Zeitersparnis von etwa 2 Sekunden  

Hier sieht man nocheinmal, dass dann vier Worker verwendet werden. Das führt insgesamt zu den Kosten von 389372.79 und der Execution Time von 8354.037ms.

~~~sql
 GroupAggregate  (cost=389372.79..1281542.90 rows=24 width=68) (actual time=4138.678..8346.496 rows=24 loops=1)
   Group Key: products.category
   ->  Gather Merge  (cost=389372.79..1182217.39 rows=6621681 width=41) (actual time=3984.057..5520.849 rows=6621249 loops=1)
         Workers Planned: 4
         Workers Launched: 4
         ->  Sort  (cost=388372.74..392511.29 rows=1655420 width=41) (actual time=3930.066..4104.018 rows=1324250 loops=5)
               Sort Key: products.category, products.id
               Sort Method: external merge  Disk: 71472kB
               Worker 0:  Sort Method: external merge  Disk: 71456kB
               Worker 1:  Sort Method: external merge  Disk: 67040kB
               Worker 2:  Sort Method: external merge  Disk: 68912kB
               Worker 3:  Sort Method: external merge  Disk: 73376kB
               ->  Hash Join  (cost=20214.09..115528.07 rows=1655420 width=41) (actual time=648.699..1251.949 rows=1324250 loops=5)
                     Hash Cond: (order_positions.product_id = products.id)
                     ->  Parallel Hash Join  (cost=19824.50..110791.20 rows=1655420 width=21) (actual time=499.835..814.921 rows=1324250 loops=5)
                           Hash Cond: (order_positions.order_id = orders.id)
                           ->  Parallel Seq Scan on order_positions  (cost=0.00..65258.20 rows=1655420 width=21) (actual time=0.050..118.632 rows=1324250 loops=5)
                           ->  Parallel Hash  (cost=11582.89..11582.89 rows=502289 width=4) (actual time=53.720..53.721 rows=241099 loops=5)
                                 Buckets: 262144  Batches: 8  Memory Usage: 8032kB
                                 ->  Parallel Seq Scan on orders  (cost=0.00..11582.89 rows=502289 width=4) (actual time=0.034..17.433 rows=241099 loops=5)
                     ->  Hash  (cost=262.04..262.04 rows=10204 width=27) (actual time=148.725..148.726 rows=10204 loops=5)
                           Buckets: 16384  Batches: 1  Memory Usage: 724kB
                           ->  Seq Scan on products  (cost=0.00..262.04 rows=10204 width=27) (actual time=145.291..146.463 rows=10204 loops=5)
 Planning Time: 0.601 ms
 JIT:
   Functions: 93
   Options: Inlining true, Optimization true, Expressions true, Deforming true
   Timing: Generation 3.685 ms (Deform 1.527 ms), Inlining 306.417 ms, Optimization 248.470 ms, Emission 171.977 ms, Total 730.549 ms
 Execution Time: 8354.037 ms
(29 rows)
~~~


## Lasttests

Lasttest bei 10 Usern, 30 Sekunden

| Type           | Name                 | Requests | Fails | Median (ms) | 95%ile (ms) | 99%ile (ms) | Average (ms) | Min (ms)  | Max (ms) | Avg. Size (bytes) | Current RPS | Failures/s |
| -------------- | -------------------- | -------- | ----- | ----------- | ----------- | ----------- | ------------ | --------- | -------- | ----------------- | ----------- | ---------- |
| transaction    | select_customer      | 697      | 0     | 2           | 3           | 3           | 1.63         | 0         | 9        | 0                 | 30.3        | 0          |
| transaction    | select_order         | 660      | 0     | 2           | 3           | 3           | 0.01         | -1309     | 9        | 0                 | 28.8        | 0          |
| transaction    | select_product_stats | 668      | 0     | 7           | 9           | 12          | 6.23         | 2         | 22       | 0                 | 27.2        | 0          |
| transaction    | update_customer      | 705      | 0     | 4           | 6           | 7           | 3.99         | 1         | 11       | 0                 | 27.1        | 0          |
| **Aggregated** | —                    | **2730** | **0** | **3**       | **8**       | **10**      | **2.97**     | **-1309** | **22**   | **0**             | **113.4**   | **0**      |

Lasttest bei 300 Usern, 60 Sekunden

| Type           | Name                 | Requests   | Fails | Median (ms) | 95%ile (ms) | 99%ile (ms) | Average (ms) | Min (ms)  | Max (ms) | Avg. Size (bytes) | Current RPS | Failures/s |
| -------------- | -------------------- | ---------- | ----- | ----------- | ----------- | ----------- | ------------ | --------- | -------- | ----------------- | ----------- | ---------- |
| transaction    | select_customer      | 8571       | 0     | 2           | 7           | 16          | 2.05         | -1330     | 41       | 0                 | 298.8       | 0          |
| transaction    | select_order         | 8308       | 0     | 2           | 7           | 17          | 2.53         | -498      | 42       | 0                 | 298.8       | 0          |
| transaction    | select_product_stats | 8329       | 0     | 6           | 14          | 22          | 5.93         | -1327     | 72       | 0                 | 280.1       | 0          |
| transaction    | update_customer      | 8347       | 0     | 4           | 9           | 19          | 3.87         | -1316     | 71       | 0                 | 290.8       | 0          |
| **Aggregated** | —                    | **33 555** | **0** | **3**       | **10**      | **19**      | **3.59**     | **-1330** | **72**   | **0**             | **1168.5**  | **0**      |

Lasttest mit analytischer Abfrage, 20 User, 120 Sekunden

| Type           | Name                            | Requests | Fails  | Median (ms) | 95%ile (ms) | 99%ile (ms) | Average (ms) | Min (ms) | Max (ms)  | Avg. Size (bytes) | Current RPS | Failures/s |
| -------------- | ------------------------------- | -------- | ------ | ----------- | ----------- | ----------- | ------------ | -------- | --------- | ----------------- | ----------- | ---------- |
| transaction    | select_category_stats           | 3        | 0      | 11000       | 13000       | 13000       | 11640.67     | 10681    | 13084     | 0                 | 0           | 0          |
| transaction    | select_category_stats (failure) | 13       | 13     | 410         | 520         | 520         | 385.23       | 212      | 524       | 0                 | 0.5         | 0.5        |
| transaction    | select_customer                 | 526      | 0      | 1           | 2           | 4           | 0.70         | 0        | 12        | 0                 | 17.3        | 0          |
| transaction    | select_order                    | 541      | 0      | 1           | 2           | 5           | 1.07         | 0        | 10        | 0                 | 18.2        | 0          |
| transaction    | select_product_stats            | 524      | 0      | 4           | 8           | 12          | 4.17         | 2        | 19        | 0                 | 19.5        | 0          |
| transaction    | update_customer                 | 560      | 0      | 2           | 6           | 11          | 2.31         | 1        | 17        | 0                 | 21.3        | 0          |
| **Aggregated** | —                               | **2167** | **13** | **1**       | **6**       | **14**      | **20.47**    | **0**    | **13084** | **0**             | **76.8**    | **0.5**    |

Ohne Analytische Abfrage 20 User, 120 Sekunden

| Type           | Name                 | Requests | Fails | Median (ms) | 95%ile (ms) | 99%ile (ms) | Average (ms) | Min (ms) | Max (ms) | Avg. Size (bytes) | Current RPS | Failures/s |
| -------------- | -------------------- | -------- | ----- | ----------- | ----------- | ----------- | ------------ | -------- | -------- | ----------------- | ----------- | ---------- |
| transaction    | select_customer      | 554      | 0     | 0           | 3           | 9           | -0.71        | -878     | 40       | 0                 | 3.5         | 0          |
| transaction    | select_order         | 534      | 0     | 720         | 1800        | 2100        | 815.09       | -971     | 2192     | 0                 | 4.1         | 0          |
| transaction    | select_product_stats | 546      | 0     | 2900        | 3600        | 3800        | 2765.35      | 214      | 4202     | 0                 | 4.6         | 0          |
| transaction    | update_customer      | 586      | 0     | 2           | 15          | 21          | 2.90         | -878     | 28       | 0                 | 5.3         | 0          |
| **Aggregated** | —                    | **2220** | **0** | **14**      | **3300**    | **3700**    | **876.78**   | **-971** | **4202** | **0**             | **17.5**    | **0**      |

- Ohne analytische Abfrage keine Fehler, mit analytischer Abfrage 13 Fehlversuche bei select_category_stats.

- Die analytische Abfrage ist sehr langsam (11–13 s), alle anderen Queries liegen im Millisekundenbereich.

- Mit analytischer Abfrage höherer Gesamtdurchsatz (~77 RPS vs. ~18 RPS), da einfache Abfragen überwiegen.

- Die analytische Abfrage verursacht Lastspitzen und vereinzelt Timeouts.

- select_category_stats sollte optimiert oder ausgelagert werden (z. B. Materialized View oder Preaggregation).

## Vergleich mit DuckDB

| Datenbank-System | Typ der Abfrage      | Ausführungszeit (s) |
| ---------------- | -------------------- | -------------------- |
| DuckDB           | Operationale Abfrage | 1.48                    |
| DuckDB           | Analytische Abfrage  | 1.5                    |
| PostgreSQL       | Operationale Abfrage | 0,000132                    |
| PostgreSQL       | Analytische Abfrage  | 8,354037                    |
