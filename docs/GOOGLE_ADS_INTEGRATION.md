# Google Ads Integration Setup Guide

This guide will walk you through setting up Google Ads integration for the LightBox Labs platform.

## Overview

The Google Ads integration allows users to:
- Connect their Google Ads accounts via OAuth 2.0
- Import campaign data and performance metrics
- View real-time reporting and analytics
- Sync data automatically

## Prerequisites

1. **Google Cloud Console Account**
2. **Google Ads API Access** (requires approval from Google)
3. **Developer Token** from Google Ads
4. **Supabase Database** (already configured)

## Step 1: Google Cloud Console Setup

### 1.1 Create a New Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable billing for the project

### 1.2 Enable Required APIs
Enable these APIs in your Google Cloud project:
- Google Ads API
- Google OAuth2 API

### 1.3 Create OAuth 2.0 Credentials
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Choose "Web application"
4. Add authorized redirect URIs:
   - `http://localhost:5173/auth/google-ads/callback` (development)
   - `https://yourdomain.com/auth/google-ads/callback` (production)
5. Note down the Client ID and Client Secret

## Step 2: Google Ads API Setup

### 2.1 Request API Access
1. Go to [Google Ads API Center](https://developers.google.com/google-ads/api/docs/first-call/dev-token)
2. Request a developer token
3. Wait for approval (can take 1-2 weeks)

### 2.2 Get Customer ID
1. Log into your Google Ads account
2. Go to Tools & Settings > Setup > Account access
3. Note your Customer ID (10-digit number)

## Step 3: Database Setup

### 3.1 Run Database Migration
```bash
node scripts/setup_google_ads_tables.cjs
```

This will create the following tables:
- `google_ads_connections` - OAuth tokens and account info
- `google_ads_campaigns` - Campaign data
- `google_ads_ad_groups` - Ad group data
- `google_ads_keywords` - Keyword performance
- `google_ads_performance` - Daily performance metrics

### 3.2 Verify Tables
The script will verify that all tables were created successfully.

## Step 4: Environment Configuration

### 4.1 Add Environment Variables
Add these to your `.env` file:

```env
# Google Ads API Configuration
VITE_GOOGLE_ADS_CLIENT_ID=your_google_ads_client_id_here
VITE_GOOGLE_ADS_CLIENT_SECRET=your_google_ads_client_secret_here
```

### 4.2 Update OAuth Consent Screen
1. Go to Google Cloud Console > "APIs & Services" > "OAuth consent screen"
2. Add your domain to authorized domains
3. Add required scopes:
   - `https://www.googleapis.com/auth/adwords`
   - `https://www.googleapis.com/auth/userinfo.email`

## Step 5: Implementation Details

### 5.1 OAuth Flow
The integration uses the standard OAuth 2.0 authorization code flow:

1. User clicks "Connect" in the Integrations page
2. Redirected to Google OAuth consent screen
3. User authorizes the application
4. Google redirects back to `/auth/google-ads/callback`
5. Exchange authorization code for access/refresh tokens
6. Store tokens securely in database
7. Redirect user back to Integrations page

### 5.2 Data Synchronization
The system will:
- Fetch campaigns, ad groups, and keywords
- Store performance data with daily granularity
- Handle token refresh automatically
- Provide real-time status updates

### 5.3 Security Features
- Row Level Security (RLS) policies ensure users only see their organization's data
- OAuth tokens are encrypted and stored securely
- Automatic token refresh prevents expired access
- State parameter prevents CSRF attacks

## Step 6: Testing

### 6.1 Test OAuth Flow
1. Start your development server
2. Go to `/integrations`
3. Click "Connect" on Google Ads
4. Complete the OAuth flow
5. Verify connection status shows "Connected"

### 6.2 Test Data Import
1. With a connected account, test campaign data import
2. Verify data appears in the analytics dashboard
3. Check that performance metrics are accurate

## Step 7: Production Deployment

### 7.1 Update Redirect URIs
Add your production domain to authorized redirect URIs in Google Cloud Console.

### 7.2 Environment Variables
Ensure production environment variables are set correctly.

### 7.3 SSL Certificate
Ensure your production domain has a valid SSL certificate (required for OAuth).

## Troubleshooting

### Common Issues

1. **"Invalid redirect URI"**
   - Check that your domain is added to authorized redirect URIs
   - Ensure the callback URL matches exactly

2. **"Access denied"**
   - Verify OAuth consent screen is configured
   - Check that required scopes are added

3. **"Developer token not approved"**
   - Wait for Google's approval (1-2 weeks)
   - Ensure your application meets Google's requirements

4. **"Token expired"**
   - The system should handle token refresh automatically
   - Check that refresh tokens are being stored correctly

### Debug Mode
Enable debug logging by adding to your `.env`:
```env
VITE_DEBUG_GOOGLE_ADS=true
```

## API Rate Limits

Google Ads API has rate limits:
- 10,000 requests per day per developer token
- 5,000 requests per day per customer
- Implement exponential backoff for retries

## Data Retention

- OAuth tokens are stored until user disconnects
- Campaign data is retained for 2 years
- Performance data is retained for 1 year
- Users can export their data at any time

## Support

For issues with:
- **Google Ads API**: Contact Google Ads API support
- **OAuth setup**: Check Google Cloud Console documentation
- **Platform integration**: Check the codebase or contact development team

## Next Steps

Once basic integration is working:
1. Implement advanced reporting features
2. Add campaign optimization suggestions
3. Create automated alerts for performance issues
4. Build cross-platform attribution models 