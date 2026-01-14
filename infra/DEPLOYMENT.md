# Azure Deployment Guide - Nexon EV Range Assistant

This guide walks you through deploying the Nexon EV Range Assistant app to Azure.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Azure Central India                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐     ┌──────────────────┐                  │
│  │  Static Web App  │────▶│  Azure Functions │                  │
│  │   (Next.js PWA)  │     │    (Node.js 20)  │                  │
│  └──────────────────┘     └────────┬─────────┘                  │
│           │                        │                             │
│           │                        ▼                             │
│           │               ┌──────────────────┐                  │
│           │               │    Cosmos DB     │                  │
│           │               │   (Serverless)   │                  │
│           │               └──────────────────┘                  │
│           │                        │                             │
│           ▼                        ▼                             │
│  ┌──────────────────┐     ┌──────────────────┐                  │
│  │ Application      │     │  Storage Account │                  │
│  │ Insights         │     │  (Functions)     │                  │
│  └──────────────────┘     └──────────────────┘                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

1. **Azure CLI** (2.50+)

   ```powershell
   winget install -e --id Microsoft.AzureCLI
   ```

2. **Azure Bicep** (included with Azure CLI)

   ```powershell
   az bicep upgrade
   ```

3. **Azure Subscription** with contributor access

## Step 1: Login to Azure

```powershell
az login
az account set --subscription "Your Subscription Name"
```

## Step 2: Create Resource Group

```powershell
# Create resource group in Central India
az group create --name rg-nexonev-dev --location centralindia
```

## Step 3: Deploy Infrastructure

### Option A: Deploy with GitHub integration

```powershell
# Generate a GitHub Personal Access Token with 'repo' scope
# https://github.com/settings/tokens/new

az deployment group create \
  --resource-group rg-nexonev-dev \
  --template-file infra/main.bicep \
  --parameters infra/main.bicepparam \
  --parameters repositoryUrl="https://github.com/YOUR_USERNAME/aiAssist" \
  --parameters repositoryToken="YOUR_GITHUB_PAT"
```

### Option B: Deploy without GitHub (manual deployment later)

```powershell
az deployment group create `
  --resource-group rg-nexonev-dev `
  --template-file infra/main.bicep `
  --parameters environmentName=dev `
  --parameters location=centralindia `
  --parameters namePrefix=nexonev
```

## Step 4: Configure Next.js for Static Export

Add this to `next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
```

## Step 5: Build and Deploy Frontend

### Using Azure CLI (SWA CLI)

```powershell
# Install SWA CLI
npm install -g @azure/static-web-apps-cli

# Build Next.js
npm run build

# Deploy to Static Web App
swa deploy ./out --deployment-token <YOUR_SWA_DEPLOYMENT_TOKEN>
```

Get the deployment token:

```powershell
az staticwebapp secrets list --name nexonev-swa-xxxx --resource-group rg-nexonev-dev
```

### Using GitHub Actions (Automated)

The Static Web App automatically creates a GitHub Actions workflow when linked to a repository.

## Step 6: Deploy Azure Functions

```powershell
cd api

# Install dependencies
npm install

# Build TypeScript
npm run build

# Deploy to Azure Functions
func azure functionapp publish nexonev-func-xxxx
```

Get the function app name:

```powershell
az functionapp list --resource-group rg-nexonev-dev --query "[].name" -o tsv
```

## Step 7: Update Environment Variables

### Frontend (.env.production)

Create `src/.env.production`:

```env
NEXT_PUBLIC_API_URL=https://nexonev-func-xxxx.azurewebsites.net
```

### Backend (Azure Functions App Settings)

Already configured via Bicep deployment. Verify:

```powershell
az functionapp config appsettings list --name nexonev-func-xxxx --resource-group rg-nexonev-dev
```

## Step 8: Verify Deployment

1. **Static Web App**: Visit `https://nexonev-swa-xxxx.azurestaticapps.net`
2. **Function App**: Test API at `https://nexonev-func-xxxx.azurewebsites.net/api/health`
3. **Cosmos DB**: Check data in Azure Portal

## Cost Estimation (Central India)

| Resource             | Dev (Serverless)  | Prod (Provisioned) |
| -------------------- | ----------------- | ------------------ |
| Static Web App       | Free              | ~$9/month          |
| Azure Functions      | Pay-per-execution | ~$30/month         |
| Cosmos DB            | ~$0.25/100K RUs   | ~$25/month         |
| Application Insights | Free (5GB)        | Pay-per-GB         |
| Storage              | ~$0.02/GB         | ~$0.02/GB          |

**Estimated Dev Cost**: < $5/month
**Estimated Prod Cost**: ~$65/month

## Cleanup

To delete all resources:

```powershell
az group delete --name rg-nexonev-dev --yes --no-wait
```

## Troubleshooting

### CORS Issues

```powershell
az functionapp cors add \
  --name nexonev-func-xxxx \
  --resource-group rg-nexonev-dev \
  --allowed-origins "https://nexonev-swa-xxxx.azurestaticapps.net"
```

### Check Function Logs

```powershell
az functionapp log tail --name nexonev-func-xxxx --resource-group rg-nexonev-dev
```

### Check Cosmos DB Connection

```powershell
az cosmosdb show --name nexonev-cosmos-xxxx --resource-group rg-nexonev-dev --query "documentEndpoint"
```
