import { DatabaseSync } from "node:sqlite";

type SqlValue = unknown;

type StatementResult = {
  changes: number | bigint;
  lastInsertRowid: number | bigint;
};

type PreparedStatement = {
  all: (...params: SqlValue[]) => unknown[];
  get: (...params: SqlValue[]) => unknown;
  run: (...params: SqlValue[]) => StatementResult;
};

type OpenOptions = {
  readOnly?: boolean;
};

class SqliteDatabase {
  private database: DatabaseSync;
  private transactionDepth = 0;
  private savepointId = 0;

  constructor(filename: string, options?: OpenOptions) {
    this.database = new DatabaseSync(filename, { readOnly: options?.readOnly ?? false });
  }

  exec(sql: string) {
    this.database.exec(sql);
    return this;
  }

  pragma(statement: string) {
    return this.database.prepare(`PRAGMA ${statement}`).all();
  }

  prepare(sql: string): PreparedStatement {
    return this.database.prepare(sql) as unknown as PreparedStatement;
  }

  transaction<TArgs extends unknown[], TResult>(fn: (...args: TArgs) => TResult) {
    return (...args: TArgs) => {
      const isOuterTransaction = this.transactionDepth === 0;
      const savepointName = `sp_${++this.savepointId}`;

      if (isOuterTransaction) {
        this.exec("BEGIN");
      } else {
        this.exec(`SAVEPOINT ${savepointName}`);
      }

      this.transactionDepth += 1;

      try {
        const result = fn(...args);
        this.transactionDepth -= 1;

        if (isOuterTransaction) {
          this.exec("COMMIT");
        } else {
          this.exec(`RELEASE SAVEPOINT ${savepointName}`);
        }

        return result;
      } catch (error) {
        this.transactionDepth -= 1;

        if (isOuterTransaction) {
          this.exec("ROLLBACK");
        } else {
          this.exec(`ROLLBACK TO SAVEPOINT ${savepointName}`);
          this.exec(`RELEASE SAVEPOINT ${savepointName}`);
        }

        throw error;
      }
    };
  }

  close() {
    this.database.close();
  }
}

export function openSqliteDatabase(filename: string, options?: OpenOptions) {
  return new SqliteDatabase(filename, options);
}
