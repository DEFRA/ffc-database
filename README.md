# ffc-database

Database utility npm module for FFC services.

### Installation

```bash
npm install --save ffc-database
```

---

### API and configuration

- **Constructor argument**: a single **config** object with the following important properties:
  - **database** - Name of the database to connect to.
  - **username** - Database user name.
  - **password** - Database user password.
  - **modelPath** - Filesystem path to the directory containing your Sequelize model files.
  - **Other Sequelize options** - Any other Sequelize options may be included on the same config object and are passed to Sequelize, for example **dialect**, **host**, **port**, **logging**, **ssl**, etc.

Example config:

```js
const config = {
  dialect: 'postgres',
  host: 'localhost',
  port: 5432,
  database: 'ffc_pay',
  username: 'ffc_user',
  password: 'ffc_password',
  modelPath: './models',
  ssl: true,
  logging: false
}
```

---

### Usage

- Instantiate the exported class and call **connect**. The returned object contains each model keyed by model name, plus **sequelize** and **Sequelize**.

Example:

```js
const Base = require('ffc-database')

const dbBase = new Base(config)
const db = dbBase.connect()

// Access models
// e.g. db.Payment, db.User
// Access sequelize instance
// e.g. db.sequelize.authenticate(), db.sequelize.close()
```

- Model file shape example (models/payment.js):

```js
module.exports = (sequelize, DataTypes) => {
  const Payment = sequelize.define('Payment', {
    amount: { type: DataTypes.DECIMAL },
    status: { type: DataTypes.STRING }
  })

  Payment.associate = (models) => {
    // e.g. Payment.belongsTo(models.User)
  }

  return Payment
}
```

- The module reads all `.js` files in **modelPath**, ignores files starting with a dot and `index.js`, requires each file and invokes it with `(sequelize, DataTypes)`, and then runs `associate` on models that provide it.

---

### Querying and closing

- Run raw queries via the returned **sequelize** instance:

```js
const [results, metadata] = await db.sequelize.query(
  'SELECT * FROM payments WHERE status = $1',
  { bind: ['pending'] }
)
```

- Close the connection:

```js
await db.sequelize.close()
```

### Licence

THIS INFORMATION IS LICENSED UNDER THE CONDITIONS OF THE OPEN GOVERNMENT LICENCE

<http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3>

**Attribution statement**

> Contains public sector information licensed under the Open Government licence v3

---
