import sql from "k6/x/sql";
import driver from "k6/x/sql/driver/postgres";
import { Trend, Rate } from 'k6/metrics';

const host = __ENV.POSTGRES_HOST;
const user = __ENV.POSTGRES_USER;
const password = __ENV.POSTGRES_PASSWORD;
const db = __ENV.POSTGRES_DB;

const conn = sql.open(driver, `postgresql://${user}:${password}@${host}/${db}?sslmode=disable`);

const metrics = [];

function setMetrics(transactions) {
    for (const t of transactions) {
        const name = t.statements.name;
        metrics[name] = { response_time: new Trend(`response_time_${name}`), success: new Rate(`success_${name}`) };
    }
}

function executeRandomTransaction(transactions) {
    const transaction = chooseTransaction(transactions);
    const stmts = transaction.statements();
    const name = transaction.statements.name;

    const start = Date.now();
    try {
        conn.exec("BEGIN");
        for (const stmt of stmts) conn.exec(stmt);
        conn.exec("COMMIT");
        metrics[name].response_time.add(Date.now() - start);
        metrics[name].success.add(true);
    } catch (e) {
        conn.exec("ROLLBACK");
        metrics[name].success.add(false);
        console.error(`Error in transaction ${name}: ${e}`);
    }
}

function chooseTransaction(transactions) {
    const r = Math.random();
    let acc = 0;
    for (const t of transactions) {
        acc += t.weight;
        if (r < acc) return t;
    }
    return transactions[transactions.length - 1];
}

export { conn, setMetrics, executeRandomTransaction };