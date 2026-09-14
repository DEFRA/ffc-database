const { DefaultAzureCredential, getBearerTokenProvider } = require('@azure/identity')

const AZURE_POSTGRES_SCOPE = 'https://ossrdbms-aad.database.windows.net/.default'

const createAzureTokenProvider = (clientId) => {
  const credential = new DefaultAzureCredential({ managedIdentityClientId: clientId })
  return getBearerTokenProvider(credential, AZURE_POSTGRES_SCOPE)
}

module.exports = {
  createAzureTokenProvider
}
