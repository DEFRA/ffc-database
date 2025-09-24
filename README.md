# ffc-database

Database utility npm module for FFC services

## Usage

### Installation

```
npm install --save ffc-database
```

### Configuration

`dialect` - Database dialect, e.g. `postgres`, `mssql`, `sqlite`, etc.

`host` - Database server hostname, e.g. `localhost` or `mydb.postgres.database.azure.com`

`port` - Database server port, e.g. `5432` for PostgreSQL

`database` - Name of the database to connect to

`username` - Database user name

`password` - Database user password

`ssl` - Boolean or object for SSL configuration (optional, recommended for production)

`logging` - Enable or disable SQL query logging (default: `false`)

#### Example
```
const config = { dialect: 'postgres', host: 'localhost', port: 5432, database: 'ffc_pay', username: 'ffc_user', password: 'ffc_password', ssl: true, logging: false }
```

### Connecting to the database

```
const { createDatabaseConnection } = require('ffc-database') const db = createDatabaseConnection(config)
```

### Running migrations

```
const { runMigrations } = require('ffc-database') await runMigrations(db)

```

### Executing queries

```
const [results, metadata] = await db.query('SELECT * FROM payments WHERE status = $1', { replacements: ['pending'] })
```

### Closing the connection

```
await db.close()
```

## Licence

THIS INFORMATION IS LICENSED UNDER THE CONDITIONS OF THE OPEN GOVERNMENT
LICENCE found at:

<http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3>

The following attribution statement MUST be cited in your products and
applications when using this information.

> Contains public sector information licensed under the Open Government license
> v3

### About the licence

The Open Government Licence (OGL) was developed by the Controller of Her
Majesty's Stationery Office (HMSO) to enable information providers in the
public sector to license the use and re-use of their information under a common
open licence.

It is designed to encourage use and re-use of information freely and flexibly,
with only a few conditions.