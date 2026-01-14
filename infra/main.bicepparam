using './main.bicep'

// ==========================================
// AI Assist - Azure Infrastructure Parameters
// Central India Deployment
// ==========================================

// Environment configuration
param environmentName = 'dev'
param location = 'centralindia'
param namePrefix = 'nexonev'

// GitHub repository (update these before deployment)
param repositoryUrl = 'https://github.com/YOUR_USERNAME/aiAssist'
param repositoryBranch = 'main'
param repositoryToken = ''  // Set via deployment command: -p repositoryToken=YOUR_TOKEN
