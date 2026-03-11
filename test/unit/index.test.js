const index = require('../../index')

describe('index', () => {
  test('should export Database', () => {
    expect(index.Database).toBeDefined()
  })
})
