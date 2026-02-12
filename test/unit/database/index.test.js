const index = require('../../../app/database/index')
const Database = require('../../../app/database/database')

describe('app/database/index', () => {
  it('should export Database', () => {
    expect(index.Database).toBe(Database)
  })
})