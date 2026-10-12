const { DefaultAzureCredential } = require('@azure/identity')

const AZURE_POSTGRES_SCOPE = 'https://ossrdbms-aad.database.windows.net/.default'

const createAzureTokenProvider = (clientId) => {
  const credential = new DefaultAzureCredential({ managedIdentityClientId: clientId })
  return async () => {
    const { token, expiresOnTimestamp } = await credential.getToken(AZURE_POSTGRES_SCOPE)
    return { token, expiresOnTimestamp }
  }
}

module.exports = {
  createAzureTokenProvider
}
