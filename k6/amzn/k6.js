import { conn, executeRandomTransaction, setMetrics } from '../k6_common.js';
import { sleep } from 'k6';

function select_customer() {
    const customer_id = Math.ceil(Math.random() * 10_000);
    return [`SELECT * FROM customers WHERE id = ${customer_id}`];
}

function select_order() {
    const order_id = Math.ceil(Math.random() * 1_000_000);
    return [`SELECT o.id, COUNT(*), SUM(op.buying_price) FROM orders o JOIN order_positions op ON o.id = op.order_id WHERE o.id = ${order_id} GROUP BY o.id`];
}

function select_product_stats() {
    return [`WITH p AS (SELECT id FROM products ORDER BY random() LIMIT 1) SELECT p.id, COUNT(*), SUM(op.buying_price) FROM p JOIN order_positions op ON p.id = op.product_id GROUP BY p.id`];
}

function update_customer() {
    const customer_id = Math.ceil(Math.random() * 10_000);
    const name = (Math.random()).toString(36).substring(2);
    return [`UPDATE customers SET name = '${name}' WHERE id = ${customer_id}`];
}

const transactions = [
    { statements: select_customer, weight: 0.25 },
    { statements: select_order, weight: 0.25 },
    { statements: select_product_stats, weight: 0.25 },
    { statements: update_customer, weight: 0.25 }
];
setMetrics(transactions);

export const options = { vus: 10, duration: '30s', gracefulStop: '5s' };

export default function () {
    executeRandomTransaction(transactions);
    sleep(Math.random() * 0.2); // 100 ms in avg
}

export function teardown() {
  conn.close();
}
