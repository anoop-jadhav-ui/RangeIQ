# Nexon EV Range Assistant - Azure Deployment Script
# Usage: .\deploy.ps1 -ResourceGroup "rg-nexonev-dev" -Environment "dev"

param(
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroup,
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("dev", "staging", "prod")]
    [string]$Environment = "dev",
    
    [Parameter(Mandatory=$false)]
    [string]$Location = "centralindia",
    
    [Parameter(Mandatory=$false)]
    [string]$NamePrefix = "nexonev",
    
    [Parameter(Mandatory=$false)]
    [switch]$DeployInfraOnly,
    
    [Parameter(Mandatory=$false)]
    [switch]$DeployAppOnly
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Nexon EV Range Assistant Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check Azure CLI
Write-Host "Checking prerequisites..." -ForegroundColor Yellow
try {
    $azVersion = az version --output json | ConvertFrom-Json
    Write-Host "  Azure CLI: $($azVersion.'azure-cli')" -ForegroundColor Green
} catch {
    Write-Error "Azure CLI is not installed. Please install it first."
    exit 1
}

# Check if logged in
$account = az account show --output json 2>$null | ConvertFrom-Json
if (-not $account) {
    Write-Host "  Not logged in to Azure. Running 'az login'..." -ForegroundColor Yellow
    az login
    $account = az account show --output json | ConvertFrom-Json
}
Write-Host "  Logged in as: $($account.user.name)" -ForegroundColor Green
Write-Host "  Subscription: $($account.name)" -ForegroundColor Green
Write-Host ""

# Create resource group if not exists
Write-Host "Step 1: Ensuring resource group exists..." -ForegroundColor Yellow
$rgExists = az group exists --name $ResourceGroup
if ($rgExists -eq "false") {
    Write-Host "  Creating resource group: $ResourceGroup in $Location" -ForegroundColor Cyan
    az group create --name $ResourceGroup --location $Location --output none
} else {
    Write-Host "  Resource group already exists: $ResourceGroup" -ForegroundColor Green
}
Write-Host ""

# Deploy infrastructure
if (-not $DeployAppOnly) {
    Write-Host "Step 2: Deploying Azure infrastructure..." -ForegroundColor Yellow
    Write-Host "  This may take 5-10 minutes..." -ForegroundColor Cyan
    
    $deploymentResult = az deployment group create `
        --resource-group $ResourceGroup `
        --template-file "infra/main.bicep" `
        --parameters environmentName=$Environment `
        --parameters location=$Location `
        --parameters namePrefix=$NamePrefix `
        --output json | ConvertFrom-Json
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Infrastructure deployment failed!"
        exit 1
    }
    
    $outputs = $deploymentResult.properties.outputs
    $functionAppName = $outputs.functionAppName.value
    $functionAppUrl = $outputs.functionAppUrl.value
    $staticWebAppName = $outputs.staticWebAppName.value
    $staticWebAppUrl = $outputs.staticWebAppUrl.value
    $cosmosDbName = $outputs.cosmosDbName.value
    
    Write-Host "  Infrastructure deployed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Resources created:" -ForegroundColor Cyan
    Write-Host "    - Cosmos DB: $cosmosDbName" -ForegroundColor White
    Write-Host "    - Function App: $functionAppName" -ForegroundColor White
    Write-Host "    - Static Web App: $staticWebAppName" -ForegroundColor White
    Write-Host ""
    
    # Save outputs to file for later use
    $outputs | ConvertTo-Json | Out-File "infra/.deployment-outputs.json"
}

if ($DeployInfraOnly) {
    Write-Host "Infrastructure deployment complete. Skipping app deployment." -ForegroundColor Yellow
    exit 0
}

# Load outputs if deploying app only
if ($DeployAppOnly) {
    if (-not (Test-Path "infra/.deployment-outputs.json")) {
        Write-Error "No deployment outputs found. Run deployment with infrastructure first."
        exit 1
    }
    $outputs = Get-Content "infra/.deployment-outputs.json" | ConvertFrom-Json
    $functionAppName = $outputs.functionAppName.value
    $functionAppUrl = $outputs.functionAppUrl.value
    $staticWebAppName = $outputs.staticWebAppName.value
}

# Deploy Azure Functions
Write-Host "Step 3: Deploying Azure Functions API..." -ForegroundColor Yellow

Push-Location api
try {
    Write-Host "  Installing dependencies..." -ForegroundColor Cyan
    npm ci --silent
    
    Write-Host "  Building TypeScript..." -ForegroundColor Cyan
    npm run build
    
    Write-Host "  Deploying to Azure..." -ForegroundColor Cyan
    func azure functionapp publish $functionAppName --typescript
    
    Write-Host "  Azure Functions deployed successfully!" -ForegroundColor Green
} catch {
    Write-Error "Azure Functions deployment failed: $_"
    exit 1
} finally {
    Pop-Location
}
Write-Host ""

# Deploy Static Web App
Write-Host "Step 4: Deploying Static Web App (Next.js)..." -ForegroundColor Yellow

try {
    Write-Host "  Installing dependencies..." -ForegroundColor Cyan
    npm ci --silent
    
    # Update environment variable
    $envContent = "NEXT_PUBLIC_API_URL=$functionAppUrl"
    $envContent | Out-File ".env.production" -Encoding UTF8
    
    Write-Host "  Building Next.js..." -ForegroundColor Cyan
    npm run build
    
    # Get SWA deployment token
    Write-Host "  Getting deployment token..." -ForegroundColor Cyan
    $swaToken = az staticwebapp secrets list --name $staticWebAppName --resource-group $ResourceGroup --query "properties.apiKey" -o tsv
    
    if (-not $swaToken) {
        Write-Error "Could not retrieve Static Web App deployment token"
        exit 1
    }
    
    # Check if SWA CLI is installed
    $swaCli = npm list -g @azure/static-web-apps-cli 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  Installing SWA CLI..." -ForegroundColor Cyan
        npm install -g @azure/static-web-apps-cli
    }
    
    Write-Host "  Deploying to Azure..." -ForegroundColor Cyan
    swa deploy ./out --deployment-token $swaToken --env production
    
    Write-Host "  Static Web App deployed successfully!" -ForegroundColor Green
} catch {
    Write-Error "Static Web App deployment failed: $_"
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Frontend URL: $staticWebAppUrl" -ForegroundColor Cyan
Write-Host "  API URL: $functionAppUrl" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Next steps:" -ForegroundColor Yellow
Write-Host "    1. Open the frontend URL in your browser" -ForegroundColor White
Write-Host "    2. Test the API health: $functionAppUrl/api/health" -ForegroundColor White
Write-Host "    3. Monitor logs: az functionapp log tail --name $functionAppName --resource-group $ResourceGroup" -ForegroundColor White
Write-Host ""
