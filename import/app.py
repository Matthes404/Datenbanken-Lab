import os
import logging
import asyncio
import asyncpg

db_config = {
    "user": os.getenv("POSTGRES_USER"),
    "password": os.getenv("POSTGRES_PASSWORD"),
    "database": os.getenv("POSTGRES_DB"),
    "host": os.getenv("POSTGRES_HOST"),
}

logging.basicConfig(
    handlers=[logging.FileHandler("import.log"), logging.StreamHandler()],
    level=logging.INFO,
    format="%(asctime)s %(message)s",
)
log = logging.getLogger()


async def main():
    try:
        scenario = os.getenv("SCENARIO")
        log.info("Selected scenario is: {0}".format(scenario))

        conn = await asyncpg.connect(**db_config)
        log.info("Connected to database.")

        if enabled("CREATE_TABLES", True):
            with open("data/{0}/1_create_tables.sql".format(scenario), "r") as file:
                await conn.execute(file.read())
            log.info("Created tables.")

        if enabled("COPY_DATA", True):
            with open("data/{0}/2_copy_data.sql".format(scenario), "r") as file:
                for line in file:
                    stmt = line.strip()
                    if stmt and not stmt.startswith("--"):
                        log.info("Run: {0}".format(stmt))
                        await conn.execute(stmt)
            log.info("Import completed.")
    finally:
        await conn.close()


def enabled(var_name, default):
    return str(os.getenv(var_name, default)).lower() in ("1", "true", "yes")


asyncio.run(main())
