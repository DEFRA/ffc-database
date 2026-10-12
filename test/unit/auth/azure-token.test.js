const { DefaultAzureCredential } = require('@azure/identity')
const { createAzureTokenProvider } = require('../../../app/auth/azure-token')

jest.mock('@azure/identity')

describe('createAzureTokenProvider', () => {
  let getToken

  beforeEach(() => {
    jest.clearAllMocks()
    getToken = jest.fn().mockResolvedValue({ token: 'a-token', expiresOnTimestamp: 12345 })
    DefaultAzureCredential.mockImplementation(() => ({ getToken }))
  })

  test('creates the credential using the given client id', () => {
    createAzureTokenProvider('client-id')

    expect(DefaultAzureCredential).toHaveBeenCalledWith({ managedIdentityClientId: 'client-id' })
  })

  test('requests a token for the Azure Postgres scope', async () => {
    await createAzureTokenProvider('client-id')()

    expect(getToken).toHaveBeenCalledWith('https://ossrdbms-aad.database.windows.net/.default')
  })

  test('returns the token and its expiry', async () => {
    await expect(createAzureTokenProvider('client-id')()).resolves.toEqual({ token: 'a-token', expiresOnTimestamp: 12345 })
  })
})
