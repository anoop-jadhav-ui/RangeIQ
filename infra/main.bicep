// ==========================================
// AI Assist - Azure Infrastructure
// Nexon EV Range Assistant PWA + API Backend
// ==========================================

targetScope = 'resourceGroup'

@description('The environment name (dev, staging, prod)')
@allowed(['dev', 'staging', 'prod'])
param environmentName string = 'dev'

@description('The Azure region for resources')
param location string = resourceGroup().location

@description('The name prefix for all resources')
param namePrefix string = 'aiassist'

@description('The GitHub repository URL')
param repositoryUrl string = ''

@description('The GitHub repository branch')
param repositoryBranch string = 'main'

@description('GitHub repository token')
@secure()
param repositoryToken string = ''

// ====================
// Variables
// ====================
var resourceToken = toLower(uniqueString(resourceGroup().id, environmentName))
var tags = {
  environment: environmentName
  application: 'aiassist'
  'cost-center': 'ev-range'
}

// ====================
// Azure Cosmos DB Account (Native resource for simpler key access)
// ====================
resource cosmosDbAccount 'Microsoft.DocumentDB/databaseAccounts@2024-05-15' = {
  name: '${namePrefix}-cosmos-${resourceToken}'
  location: location
  tags: tags
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    
    // Use serverless for cost efficiency in dev
    capabilities: environmentName == 'prod' ? [] : [
      { name: 'EnableServerless' }
    ]
    
    // Consistency
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
    
    // Locations
    locations: [
      {
        locationName: location
        failoverPriority: 0
        isZoneRedundant: false
      }
    ]
    
    // Backup
    backupPolicy: {
      type: 'Continuous'
      continuousModeProperties: {
        tier: 'Continuous7Days'
      }
    }
    
    // Security
    disableLocalAuth: false
    publicNetworkAccess: 'Enabled'
  }
}

// Cosmos DB SQL Database
resource cosmosDatabase 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2024-05-15' = {
  parent: cosmosDbAccount
  name: 'aiassist'
  properties: {
    resource: {
      id: 'aiassist'
    }
  }
}

// Container: users
resource usersContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: cosmosDatabase
  name: 'users'
  properties: {
    resource: {
      id: 'users'
      partitionKey: {
        paths: ['/userId']
        kind: 'Hash'
      }
      indexingPolicy: {
        automatic: true
        indexingMode: 'consistent'
      }
    }
  }
}

// Container: trips
resource tripsContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: cosmosDatabase
  name: 'trips'
  properties: {
    resource: {
      id: 'trips'
      partitionKey: {
        paths: ['/userId']
        kind: 'Hash'
      }
      indexingPolicy: {
        automatic: true
        indexingMode: 'consistent'
      }
    }
  }
}

// Container: predictions
resource predictionsContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: cosmosDatabase
  name: 'predictions'
  properties: {
    resource: {
      id: 'predictions'
      partitionKey: {
        paths: ['/userId']
        kind: 'Hash'
      }
      indexingPolicy: {
        automatic: true
        indexingMode: 'consistent'
      }
    }
  }
}

// Container: crowd-data
resource crowdDataContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: cosmosDatabase
  name: 'crowd-data'
  properties: {
    resource: {
      id: 'crowd-data'
      partitionKey: {
        paths: ['/routeHash']
        kind: 'Hash'
      }
      indexingPolicy: {
        automatic: true
        indexingMode: 'consistent'
      }
    }
  }
}

// ====================
// Storage Account (for Functions)
// ====================
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: '${namePrefix}stor${resourceToken}'
  location: location
  tags: tags
  kind: 'StorageV2'
  sku: {
    name: 'Standard_LRS'
  }
  properties: {
    supportsHttpsTrafficOnly: true
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
  }
}

// ====================
// App Service Plan (for Azure Functions)
// ====================
resource appServicePlan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: '${namePrefix}-plan-${resourceToken}'
  location: location
  tags: tags
  sku: {
    name: environmentName == 'prod' ? 'P1v3' : 'Y1'  // Premium for prod, Consumption for dev
    tier: environmentName == 'prod' ? 'PremiumV3' : 'Dynamic'
  }
  kind: 'functionapp'
  properties: {
    reserved: false // Windows
  }
}

// ====================
// Application Insights
// ====================
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: '${namePrefix}-insights-${resourceToken}'
  location: location
  tags: tags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    Request_Source: 'rest'
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

// ====================
// Azure Functions App
// ====================
module functionApp 'br/public:avm/res/web/site:0.17.0' = {
  name: 'func-${resourceToken}'
  params: {
    name: '${namePrefix}-func-${resourceToken}'
    location: location
    tags: tags
    kind: 'functionapp'
    serverFarmResourceId: appServicePlan.id
    
    // Managed identity for accessing Cosmos DB
    managedIdentities: {
      systemAssigned: true
    }
    
    // Site config
    siteConfig: {
      ftpsState: 'FtpsOnly'
      minTlsVersion: '1.2'
      cors: {
        allowedOrigins: [
          'https://${namePrefix}-swa-${resourceToken}.azurestaticapps.net'
          'http://localhost:3000'
        ]
        supportCredentials: true
      }
      appSettings: [
        {
          name: 'AzureWebJobsStorage'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};EndpointSuffix=${environment().suffixes.storage};AccountKey=${storageAccount.listKeys().keys[0].value}'
        }
        {
          name: 'WEBSITE_CONTENTAZUREFILECONNECTIONSTRING'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};EndpointSuffix=${environment().suffixes.storage};AccountKey=${storageAccount.listKeys().keys[0].value}'
        }
        {
          name: 'FUNCTIONS_EXTENSION_VERSION'
          value: '~4'
        }
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'node'
        }
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~20'
        }
        {
          name: 'APPINSIGHTS_INSTRUMENTATIONKEY'
          value: appInsights.properties.InstrumentationKey
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsights.properties.ConnectionString
        }
        {
          name: 'COSMOS_DB_ENDPOINT'
          value: cosmosDbAccount.properties.documentEndpoint
        }
        {
          name: 'COSMOS_DB_KEY'
          value: cosmosDbAccount.listKeys().primaryMasterKey
        }
        {
          name: 'COSMOS_DB_DATABASE'
          value: 'aiassist'
        }
      ]
    }
    
    httpsOnly: true
    publicNetworkAccess: 'Enabled'
  }
}

// ====================
// Azure Static Web App (for Next.js frontend)
// ====================
module staticWebApp 'br/public:avm/res/web/static-site:0.7.0' = {
  name: 'swa-${resourceToken}'
  params: {
    name: '${namePrefix}-swa-${resourceToken}'
    location: 'centralindia' // Static Web Apps have limited regions
    tags: tags
    
    sku: environmentName == 'prod' ? 'Standard' : 'Free'
    
    // Link to GitHub repository
    repositoryUrl: repositoryUrl
    branch: repositoryBranch
    repositoryToken: repositoryToken
    
    // Build configuration
    buildProperties: {
      appLocation: '/'
      apiLocation: ''  // We use separate Azure Functions
      outputLocation: 'out'  // Next.js static export
      appBuildCommand: 'npm run build'
    }
    
    // App settings
    appSettings: {
      NEXT_PUBLIC_API_URL: functionApp.outputs.defaultHostname
    }
    
    // Link to backend Azure Function
    linkedBackend: {
      resourceId: functionApp.outputs.resourceId
    }
    
    // Staging environments
    stagingEnvironmentPolicy: 'Enabled'
    allowConfigFileUpdates: true
  }
}

// ====================
// Outputs
// ====================
output cosmosDbEndpoint string = cosmosDbAccount.properties.documentEndpoint
output cosmosDbName string = cosmosDbAccount.name
output functionAppName string = functionApp.outputs.name
output functionAppUrl string = 'https://${functionApp.outputs.defaultHostname}'
output staticWebAppName string = staticWebApp.outputs.name
output staticWebAppUrl string = 'https://${staticWebApp.outputs.defaultHostname}'
output appInsightsName string = appInsights.name
output resourceGroupName string = resourceGroup().name
