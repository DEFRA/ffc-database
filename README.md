# ffc-database

Database utility npm module for FFC services.

`2.x` uses [Knex](https://knexjs.org) as the database client. `1.x` uses Sequelize and remains
available for services that have not yet migrated — see [Migrating from 1.x](#migrating-from-1x).

### Installation

```bash
npm install --save ffc-database
```

---

### API and configuration

- **Constructor argument**: a single **config** object:
  - **database** - Name of the database to connect to.
  - **username** - Database user name.
  - **password** - Database user password. Ignored when managed identity is in use.
  - **host** - Database host. Defaults to `localhost`.
  - **port** - Database port. Defaults to `5432`.
  - **schema** - Optional. Mapped to Knex's `searchPath`.
  - **ssl** - Whether to connect over SSL. Defaults to `false`. `dialectOptions.ssl` is also
    accepted so that existing service config can be carried over unchanged.
  - **pool** - `{ min, max, acquire, idle }`, using the same key names as Sequelize. Mapped onto
    Knex's `{ min, max, acquireTimeoutMillis, idleTimeoutMillis }`.
  - **logging** - Mapped onto Knex's `debug`.
  - **useAzureManagedIdentity** - Resolve the password from Azure AD rather than `password`.
    Defaults to `true` when `NODE_ENV` is `production`.
  - **azureClientId** - Managed identity client id. Defaults to `process.env.AZURE_CLIENT_ID`.
  - **tables** - Map of accessor name to table name. Each becomes a table accessor on the object
    `connect()` returns. A table may not be named `client`, `transaction` or `close`.
  - **dialectOptions** - Any other [pg client options](https://node-postgres.com/apis/client)
    (`statement_timeout`, for one) are passed straight through, so a service migrating from `1.x`
    can leave this block as it is.

Example config:

```js
const config = {
  database: 'ffc_pay',
  username: 'ffc_user',
  password: 'ffc_password',
  host: 'localhost',
  port: 5432,
  schema: 'public',
  ssl: false,
  pool: { min: 2, max: 10, acquire: 60000, idle: 10000 },
  logging: false
}
```

Set `pool.max` explicitly per service. A lightweight service does not need the same pool as an ETL
service, and the aggregate connection count across all pods must stay within the PostgreSQL limit.

---

### Usage

Instantiate the exported class and call **connect**, which returns:

- **client** - the Knex instance. Callable (`client('payments')`) and carries `client.raw()`.
- **transaction** - `client.transaction`, bound.
- **close** - `client.destroy`, bound.
- **one accessor per configured table**.

```js
// app/data/index.js
const { Database } = require('ffc-database')
const config = require('../config')

// Table names come from the Liquibase changelog and are the single declaration
// of the service's schema surface.
const tables = {
  payments: 'payments',
  outbox: 'outbox'
}

const database = new Database({ ...config.dbConfig[config.env], tables })

module.exports = database.connect()
```

Services should expose this from a single module (conventionally `app/data/index.js`) and have
every query file import from there rather than requiring `ffc-database` or `knex` directly. That
keeps the client dependency to one file per service.

### Table accessors and the queryable argument

An accessor takes the **queryable** to run against, defaulting to the client:

```js
const { payments } = require('../data')

const getPendingPayments = async (limit) => {
  return payments()
    .whereNull('published')
    .limit(limit)
}
```

A Knex transaction is itself a Knex instance, so passing one to the accessor is all it takes to
enrol a query in that transaction:

```js
const { payments } = require('../data')

const settlePayment = async (queryable, paymentId) => {
  return payments(queryable).where({ paymentId }).update({ settled: true })
}
```

Take the queryable as the first argument of any query helper that can run inside a transaction.
The same helper then works in both contexts, and there is no `.transacting()` call to forget —
which matters because forgetting it is silent: the query succeeds outside the transaction and is
never rolled back.

### Transactions

Use the callback form. It commits when the callback resolves and rolls back when it throws, so
there are no `commit()` or `rollback()` calls to get wrong:

```js
const db = require('../data')

await db.transaction(async (trx) => {
  await removeOutbox(trx, paymentIds)
  await removePayments(trx, paymentIds)
})
```

Pass an isolation level as the second argument where one is needed:

```js
await db.transaction(async (trx) => {
  // ...
}, { isolationLevel: 'serializable' })
```

### Raw queries and closing

```js
const results = await client.raw('SELECT * FROM payments WHERE status = ?', ['pending'])

await db.close()
```

---

### Azure AD managed identity

Azure AD access tokens are short lived, so the password must be resolved per physical connection
rather than once at startup. Knex accepts a function for `connection` and calls it each time the
pool creates a connection, which is the direct equivalent of Sequelize's `beforeConnect` hook.
This module handles that internally — services no longer need their own hook.

---

### Migrating from 1.x

- **Model files are gone.** `modelPath`, model auto-discovery and `associate` no longer exist. Knex
  is a query builder, not an ORM: query against table names directly. Note that Sequelize model
  names are frequently not the table names (`freezeTableName` and `tableName` are widely used in
  the fleet), so check the Liquibase changelog for the real table name.
- **`connect()` returns a different shape.** `{ client, transaction, close }` rather than a map of
  models plus `sequelize`, `Sequelize` and `Op`.
- **Operators become methods.** `Op.in` → `.whereIn()`, `Op.between` → `.whereBetween()`,
  `Op.gt` → `.where('col', '>', value)`, `Op.or` → a grouped `.where(function () { ... })`.
- **`raw: true` is no longer needed.** Knex always returns plain objects.
- **`findOne` → `.first()`**, which resolves to `undefined` rather than `null` when there is no
  match. Normalise with `?? null` if a caller depends on `null`.
- **`beforeConnect` hooks should be removed** from service config; managed identity is handled here.
- **`retry` should be removed** from service config; see the note below.
- **`dialectOptions` can stay as it is.** `ssl` is read from it, and everything else is passed
  through to the pg client.

#### Known difference: connection retry

Sequelize's `retry` option (exponential backoff against `SequelizeConnectionError`) has no direct
Knex equivalent and is not reproduced. The closest behaviour is the pool's
`propagateCreateError: false`, which this module sets: a failed connection attempt is retried
rather than failing the acquire immediately, up to `pool.acquire` milliseconds. Services that
relied on long connection-retry windows should set `pool.acquire` accordingly.

### Licence

THIS INFORMATION IS LICENSED UNDER THE CONDITIONS OF THE OPEN GOVERNMENT LICENCE

<http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3>

**Attribution statement**

> Contains public sector information licensed under the Open Government licence v3

---
