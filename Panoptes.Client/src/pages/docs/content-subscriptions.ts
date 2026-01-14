export const subscriptionsContent = {
  'creating-subscriptions': {
    title: 'Creating Subscriptions',
    content: `
## Via Dashboard

1. Navigate to the Dashboard
2. Click **"New Subscription"**
3. Complete the two-step form:
   - Step 1: Name, URL, Event Type, Filters
   - Step 2: Custom Headers (optional)
4. Click **"Create Subscription"**

## Via API

\`\`\`bash
curl -X POST https://your-panoptes-instance/subscriptions \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Payment Monitor",
    "targetUrl": "https://your-app.com/webhook",
    "eventType": "Transaction",
    "walletAddresses": ["addr_test1qz..."],
    "maxWebhooksPerMinute": 60,
    "maxWebhooksPerHour": 1000
  }'
\`\`\`

## Subscription Properties

| Property | Type | Description |
|----------|------|-------------|
| name | string | Friendly identifier |
| targetUrl | string | Webhook endpoint URL |
| eventType | string | Transaction, Block, or Rollback |
| walletAddresses | string[] | Addresses to monitor |
| policyId | string | Native asset policy to track |
| minimumLovelace | number | Minimum ADA value filter |
| maxWebhooksPerMinute | number | Rate limit (default: 60) |
| maxWebhooksPerHour | number | Rate limit (default: 1000) |
| customHeaders | object | Additional HTTP headers |
    `
  },
  'event-types': {
    title: 'Event Types',
    content: `
## Transaction Events

Triggered when a transaction matches your filters. This is the most common event type.

**Use for:**
- Payment notifications
- Asset transfers
- Smart contract interactions

## Block Events

Triggered for every new block, regardless of content. Useful for:
- Block explorers
- Chain analytics
- Heartbeat monitoring

**Note:** Block events can generate high volume. Use rate limiting.

## Rollback Events

Triggered when the chain rolls back (reorg). Important for:
- Reversing confirmed transactions
- Maintaining data consistency
- Fraud detection

**Payload includes:**
- Rolled back block hash
- New chain tip
- Affected slot range
    `
  },
  'filters': {
    title: 'Filters & Targeting',
    content: `
## Address Filtering

Monitor specific wallet addresses:

\`\`\`json
{
  "walletAddresses": [
    "addr_test1qz...",
    "addr1qy...",
    "stake1u..."
  ]
}
\`\`\`

**Supported formats:**
- Bech32 payment addresses (addr1..., addr_test1...)
- Bech32 stake addresses (stake1..., stake_test1...)
- Hex-encoded addresses

## Policy ID Filtering

Track native assets by policy:

\`\`\`json
{
  "policyId": "a0028f350aaabe0545fdcb56b039bfb08e4bb4d8c4d7c3c7d481c235"
}
\`\`\`

Matches any transaction involving tokens from this policy.

## Minimum Value Filter

Ignore small transactions:

\`\`\`json
{
  "minimumLovelace": 5000000
}
\`\`\`

Only triggers for transactions with outputs >= 5 ADA.

## Firehose Mode

Leave all filters empty to receive ALL transactions:

\`\`\`json
{
  "walletAddresses": [],
  "policyId": null
}
\`\`\`

**Warning:** High volume. Ensure your endpoint can handle the load.
    `
  },
  'rate-limiting': {
    title: 'Rate Limiting',
    content: `
## How Rate Limiting Works

Each subscription has independent rate limits:

- **Per-minute limit**: Maximum webhooks in any 60-second window
- **Per-hour limit**: Maximum webhooks in any 3600-second window

When limits are exceeded:
1. New matches are queued (not lost)
2. Subscription shows "Rate Limited" status
3. Delivery resumes when window resets

## Default Limits

| Limit | Default | Maximum |
|-------|---------|---------|
| Per Minute | 60 | 300 |
| Per Hour | 1000 | 10000 |

## Configuring Limits

\`\`\`json
{
  "maxWebhooksPerMinute": 120,
  "maxWebhooksPerHour": 2000
}
\`\`\`

## Monitoring Usage

The subscription detail page shows:
- Current usage vs. limits
- Rate limit status
- Historical delivery patterns

## Best Practices

1. **Start conservative** - Begin with defaults, increase as needed
2. **Monitor patterns** - Check if you're hitting limits regularly
3. **Use filters** - Narrow your criteria to reduce volume
4. **Handle bursts** - Your endpoint should handle brief spikes
    `
  }
};

export const webhooksContent = {
  'payload-structure': {
    title: 'Payload Structure',
    content: `
## Transaction Webhook Payload

\`\`\`json
{
  "Event": "transaction",
  "TxHash": "3eb8f9a1b2c3d4e5f6...",
  
  "Metadata": {
    "MatchReason": "Address: addr_test1qz...",
    "InputCount": 2,
    "OutputCount": 3,
    "OutputsIncluded": 3,
    "InputAmountsHydrated": false,
    "TotalOutputAda": 150.5,
    "DataLossWarning": null
  },
  
  "TotalReceived": {
    "addr_test1qz...": "100.00 ADA",
    "addr_test1vy...": "50.50 ADA"
  },
  
  "Fees": {
    "Lovelace": 180000,
    "Ada": 0.18
  },
  
  "Inputs": [
    {
      "TxHash": "previous_tx_hash...",
      "OutputIndex": 0
    }
  ],
  
  "Outputs": [
    {
      "Address": "addr_test1qz...",
      "AddressHex": "01abc...",
      "Amount": {
        "Lovelace": 100000000,
        "Ada": 100.0
      },
      "Assets": [
        {
          "PolicyId": "abc123...",
          "NameHex": "546f6b656e",
          "NameUTF8": "Token",
          "Quantity": 1000
        }
      ]
    }
  ],
  
  "Block": {
    "Slot": 109341540,
    "Hash": "block_hash...",
    "Height": 2850123
  },
  
  "Timestamp": "2025-12-06T10:30:00.000Z"
}
\`\`\`

## Data Quality Flags

- **InputAmountsHydrated**: false means input amounts aren't included
- **DataLossWarning**: Non-null indicates parsing issues
- **OutputsIncluded**: Compare with OutputCount to detect filtering
    `
  },
  'signature-verification': {
    title: 'Signature Verification',
    content: `
## HMAC-SHA256 Signatures

Every webhook includes a signature header for verification:

\`\`\`
X-Panoptes-Signature: sha256=abc123def456...
\`\`\`

## Verification Process

### 1. Extract the Signature

\`\`\`javascript
const signature = request.headers['x-panoptes-signature'];
const hash = signature.replace('sha256=', '');
\`\`\`

### 2. Compute Expected Hash

\`\`\`javascript
const crypto = require('crypto');

const expectedHash = crypto
  .createHmac('sha256', YOUR_SECRET_KEY)
  .update(JSON.stringify(request.body))
  .digest('hex');
\`\`\`

### 3. Compare Securely

\`\`\`javascript
const crypto = require('crypto');

const isValid = crypto.timingSafeEqual(
  Buffer.from(hash),
  Buffer.from(expectedHash)
);
\`\`\`

## Example: Node.js Middleware

\`\`\`javascript
function verifyWebhook(req, res, next) {
  const signature = req.headers['x-panoptes-signature'];
  if (!signature) return res.status(401).send('Missing signature');
  
  const hash = signature.replace('sha256=', '');
  const expected = crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex');
  
  if (!crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expected))) {
    return res.status(401).send('Invalid signature');
  }
  
  next();
}
\`\`\`
    `
  },
  'retry-logic': {
    title: 'Retry Logic',
    content: `
## Automatic Retries

Failed webhooks are automatically retried with exponential backoff:

| Attempt | Delay | Total Time |
|---------|-------|------------|
| 1 | Immediate | 0 |
| 2 | 30 seconds | 30s |
| 3 | 1 minute | 1m 30s |
| 4 | 5 minutes | 6m 30s |
| 5 | 15 minutes | 21m 30s |
| 6 | 1 hour | 1h 21m 30s |

After 5 failed attempts, the delivery is marked as **Failed**.

## What Triggers a Retry?

- Network errors (connection refused, timeout)
- HTTP 5xx responses (server errors)
- HTTP 429 (rate limited by your server)

## What Does NOT Retry?

- HTTP 2xx (success)
- HTTP 4xx except 429 (client errors)

## Monitoring Retries

The delivery log shows:
- Current attempt number
- Next retry time
- Error messages from each attempt

## Idempotency

Your webhook handler should be idempotent. The same event may be delivered multiple times due to retries. Use the TxHash as a unique identifier to detect duplicates.
    `
  },
  'best-practices': {
    title: 'Best Practices',
    content: `
## Endpoint Design

### Respond Quickly
Return 200 OK immediately, then process asynchronously:

\`\`\`javascript
app.post('/webhook', (req, res) => {
  // Acknowledge receipt immediately
  res.status(200).send('OK');
  
  // Process in background
  processWebhook(req.body).catch(console.error);
});
\`\`\`

### Use a Queue
For high volume, queue webhooks for processing:

\`\`\`javascript
app.post('/webhook', async (req, res) => {
  await queue.add('process-webhook', req.body);
  res.status(200).send('Queued');
});
\`\`\`

## Security

1. **Always verify signatures** - Never trust unverified webhooks
2. **Use HTTPS** - Encrypt data in transit
3. **Rotate secrets** - Periodically update webhook secrets
4. **Validate payloads** - Check expected fields exist

## Reliability

1. **Handle duplicates** - Use TxHash for idempotency
2. **Log everything** - Keep records for debugging
3. **Monitor failures** - Alert on repeated failures
4. **Test regularly** - Use the Test button to verify connectivity

## Performance

1. **Keep handlers fast** - Defer heavy processing
2. **Set appropriate timeouts** - Panoptes waits 30 seconds
3. **Scale horizontally** - Multiple workers for high volume
4. **Use connection pooling** - Reuse database connections
    `
  }
};
