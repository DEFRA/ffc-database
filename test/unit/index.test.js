const index = require('../../index')

describe('index', () => {
  it('should export Database', () => {
    expect(index.Database).toBeDefined()
  })
})