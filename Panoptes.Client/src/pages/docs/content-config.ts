export const configurationContent = {
  'network-setup': {
    title: 'Network Setup',
    content: `
## Available Networks

| Network | Purpose | Endpoint |
|---------|---------|----------|
| Mainnet | Production | cardano-mainnet.utxorpc-m1.demeter.run |
| Preprod | Testing | cardano-preprod.utxorpc-m1.demeter.run |
| Preview | Early features | cardano-preview.utxorpc-m1.demeter.run |

## Switching Networks

### Via Dashboard

1. Navigate to **Settings**
2. Click **Configure** on the target network
3. Enter your Demeter API key
4. Click **Save**
5. Click **Activate** to switch

### Via Environment Variables

\`\`\`bash
PANOPTES_NETWORK=Preprod
PANOPTES_GRPC_ENDPOINT=https://cardano-preprod.utxorpc-m1.demeter.run
PANOPTES_API_KEY=dmtr_your_api_key
\`\`\`

## Network Considerations

### Mainnet
- Real value transactions
- Higher security requirements
- Production-ready subscriptions only

### Preprod
- Test ADA (no real value)
- Mirrors mainnet functionality
- Ideal for integration testing

### Preview
- Bleeding edge features
- May have breaking changes
- For early adopters only
    `
  },
  'demeter-api-key': {
    title: 'Demeter API Key',
    content: `
## Obtaining Your API Key

1. Go to [demeter.run](https://demeter.run)
2. Sign in or create an account
3. Create a new project (or use existing)
4. Click **"Add Product"**
5. Select **"UtxoRPC"**
6. Click into the product to reveal your key

Your key looks like: \`dmtr_abc123xyz789...\`

## Configuring in Panoptes

### First-Time Setup

The Setup Wizard guides you through:
1. Enter your API key
2. Select network (Preprod recommended for testing)
3. Panoptes validates the connection
4. Configuration is encrypted and stored

### Updating Your Key

1. Go to **Settings**
2. Click **Configure** on the network
3. Enter the new API key
4. Save and restart the worker

## Security Notes

- API keys are encrypted at rest using ASP.NET Data Protection
- Keys are never exposed in the UI after saving
- Each network can have a different API key
- Rotate keys periodically for security
    `
  },
  'environment-variables': {
    title: 'Environment Variables',
    content: `
## Backend Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| ASPNETCORE_ENVIRONMENT | Runtime environment | Development |
| ConnectionStrings__DefaultConnection | PostgreSQL connection | (required) |
| Panoptes__Network | Target network | Preprod |
| Panoptes__GrpcEndpoint | UtxoRPC endpoint | (from DB) |
| Panoptes__ApiKey | Demeter API key | (from DB) |

## Database Connection

\`\`\`bash
ConnectionStrings__DefaultConnection="Host=localhost;Database=panoptes;Username=postgres;Password=yourpassword"
\`\`\`

## AWS Cognito (Production)

\`\`\`bash
AWS_REGION=ap-southeast-1
COGNITO_USER_POOL_ID=ap-southeast-1_xxxxx
COGNITO_CLIENT_ID=your_client_id
\`\`\`

## Frontend Configuration

Create \`.env.local\` in Panoptes.Client:

\`\`\`bash
VITE_API_URL=http://localhost:5033
VITE_COGNITO_USER_POOL_ID=your_pool_id
VITE_COGNITO_CLIENT_ID=your_client_id
VITE_COGNITO_REGION=ap-southeast-1
\`\`\`

## Docker Deployment

\`\`\`yaml
# docker-compose.prod.yml
services:
  backend:
    environment:
      - ASPNETCORE_ENVIRONMENT=Production
      - ConnectionStrings__DefaultConnection=Host=db;...
\`\`\`
    `
  }
};

export const apiReferenceContent = {
  'authentication': {
    title: 'Authentication',
    content: `
## AWS Cognito JWT

All API endpoints (except health checks) require a valid JWT token from AWS Cognito.

### Request Header

\`\`\`
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
\`\`\`

### Token Claims

The token must include:
- \`sub\`: User ID (used for subscription ownership)
- \`exp\`: Expiration timestamp
- \`iss\`: Cognito User Pool issuer

### Obtaining a Token

Use AWS Amplify or Cognito SDK:

\`\`\`javascript
import { fetchAuthSession } from 'aws-amplify/auth';

const session = await fetchAuthSession();
const token = session.tokens?.idToken?.toString();
\`\`\`
    `
  },
  'endpoints': {
    title: 'Endpoints',
    content: `
## Subscriptions

### List Subscriptions
\`\`\`
GET /subscriptions
\`\`\`

### Get Subscription
\`\`\`
GET /subscriptions/{id}
\`\`\`

### Create Subscription
\`\`\`
POST /subscriptions
Content-Type: application/json

{
  "name": "string",
  "targetUrl": "string",
  "eventType": "string",
  "walletAddresses": ["string"],
  "maxWebhooksPerMinute": 60,
  "maxWebhooksPerHour": 1000
}
\`\`\`

### Update Subscription
\`\`\`
PUT /subscriptions/{id}
\`\`\`

### Delete Subscription
\`\`\`
DELETE /subscriptions/{id}
\`\`\`

### Toggle Active Status
\`\`\`
POST /subscriptions/{id}/toggle
\`\`\`

## Delivery Logs

### Get Logs for Subscription
\`\`\`
GET /subscriptions/{id}/logs?skip=0&take=50
\`\`\`

### Get All Logs
\`\`\`
GET /logs?skip=0&take=50
\`\`\`

## Health

### System Health (Public)
\`\`\`
GET /health
\`\`\`

### System Info (Public)
\`\`\`
GET /health/system-info
\`\`\`
    `
  },
  'error-codes': {
    title: 'Error Codes',
    content: `
## HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Request completed |
| 201 | Created | Resource created |
| 400 | Bad Request | Check request body |
| 401 | Unauthorized | Check/refresh token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 429 | Rate Limited | Slow down requests |
| 500 | Server Error | Contact support |

## Error Response Format

\`\`\`json
{
  "error": "ValidationError",
  "message": "Target URL must be a valid HTTPS URL",
  "details": {
    "field": "targetUrl",
    "value": "http://insecure.com"
  }
}
\`\`\`

## Common Errors

### Invalid Subscription
\`\`\`json
{
  "error": "ValidationError",
  "message": "Name is required"
}
\`\`\`

### Subscription Not Found
\`\`\`json
{
  "error": "NotFound",
  "message": "Subscription with ID xxx not found"
}
\`\`\`

### Rate Limited
\`\`\`json
{
  "error": "RateLimited",
  "message": "Too many requests",
  "retryAfter": 60
}
\`\`\`
    `
  }
};

export const troubleshootingContent = {
  'common-issues': {
    title: 'Common Issues',
    content: `
## Webhooks Not Firing

### Check Subscription Status
- Is the subscription **Active**? (not paused)
- Is it **Rate Limited**?
- Is the sync worker running?

### Verify Filters
- Are your address filters correct?
- Is the address format valid (Bech32)?
- For policy filters, is the hex correct?

### Check Sync Status
- Go to Health page
- Verify "Last Block Synced" is updating
- Check UtxoRPC connection status

## 401 Unauthorized Errors

### Token Issues
- Token may be expired - refresh and retry
- Check Cognito configuration matches
- Verify user is authenticated

### CORS Issues
- Check browser console for CORS errors
- Verify API URL in frontend config

## Webhook Delivery Failures

### Connection Refused
- Is your endpoint accessible from the internet?
- Check firewall rules
- Verify URL is correct

### Timeout
- Endpoint taking too long to respond
- Return 200 immediately, process async

### SSL Certificate Errors
- Ensure valid SSL certificate
- Check certificate chain is complete
    `
  },
  'debugging': {
    title: 'Debugging',
    content: `
## Enable Detailed Logging

### Backend Logs

\`\`\`bash
# Set log level in appsettings.json
{
  "Logging": {
    "LogLevel": {
      "Default": "Debug",
      "Panoptes": "Trace"
    }
  }
}
\`\`\`

### View Live Logs

\`\`\`bash
# Docker
docker logs -f panoptes_backend

# Direct
dotnet run --project Panoptes.Api
\`\`\`

## Test Webhook Endpoint

Use the built-in Test button:
1. Open subscription detail
2. Click **Test**
3. Check delivery log for response

## Verify Database State

\`\`\`sql
-- Check subscriptions
SELECT id, name, is_active, is_deleted 
FROM webhook_subscriptions;

-- Check recent logs
SELECT * FROM delivery_logs 
ORDER BY attempted_at DESC 
LIMIT 10;

-- Check sync state
SELECT * FROM system_states 
WHERE key = 'LastSyncedSlot';
\`\`\`

## Network Debugging

\`\`\`bash
# Test UtxoRPC connectivity
grpcurl -H "dmtr-api-key: YOUR_KEY" \\
  cardano-preprod.utxorpc-m1.demeter.run:443 \\
  list
\`\`\`
    `
  },
  'faq': {
    title: 'FAQ',
    content: `
## General

**Q: How fast are webhooks delivered?**
A: Typically within 1-2 seconds of block confirmation.

**Q: Can I monitor multiple addresses with one subscription?**
A: Yes, add multiple addresses to the walletAddresses array.

**Q: What happens if my endpoint is down?**
A: Webhooks are retried with exponential backoff up to 5 times.

## Billing & Limits

**Q: Is there a free tier?**
A: Panoptes itself is open source. You pay only for Demeter usage.

**Q: What are the rate limits?**
A: Default is 60/minute, 1000/hour per subscription. Configurable.

## Technical

**Q: Can I use my own Cardano node?**
A: Yes, any UtxoRPC-compatible endpoint works.

**Q: Is the webhook payload customizable?**
A: Custom payload templates are on the roadmap.

**Q: How do I handle chain rollbacks?**
A: Subscribe to Rollback events and reverse affected transactions.

## Security

**Q: Are my API keys secure?**
A: Yes, encrypted at rest using ASP.NET Data Protection.

**Q: How do I verify webhook authenticity?**
A: Check the X-Panoptes-Signature header using HMAC-SHA256.

**Q: Can others see my subscriptions?**
A: No, subscriptions are scoped to your user account.
    `
  }
};
