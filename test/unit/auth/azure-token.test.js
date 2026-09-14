const { DefaultAzureCredential, getBearerTokenProvider } = require('@azure/identity')
const { createAzureTokenProvider } = require('../../../app/auth/azure-token')

jest.mock('@azure/identity')

describe('createAzureTokenProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('requests a token for the Azure Postgres scope using the given client id', () => {
    const tokenProvider = jest.fn()
    getBearerTokenProvider.mockReturnValue(tokenProvider)

    const result = createAzureTokenProvider('client-id')

    expect(DefaultAzureCredential).toHaveBeenCalledWith({ managedIdentityClientId: 'client-id' })
    expect(getBearerTokenProvider).toHaveBeenCalledWith(
      expect.any(DefaultAzureCredential),
      'https://ossrdbms-aad.database.windows.net/.default'
    )
    expect(result).toBe(tokenProvider)
  })
})
