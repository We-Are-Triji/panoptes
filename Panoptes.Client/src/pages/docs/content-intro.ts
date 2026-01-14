export const introductionContent = {
  'what-is-panoptes': {
    title: 'What is Panoptes?',
    content: `
Panoptes is a production-ready webhook notification system for the Cardano blockchain. Named after the all-seeing giant of Greek mythology, Panoptes monitors blockchain activity in real-time and delivers instant notifications to your applications.

## Core Purpose

Panoptes bridges the gap between on-chain events and off-chain applications. Instead of constantly polling the blockchain for changes, your application receives push notifications the moment relevant transactions occur.

## How It Works

1. **You define what to watch** - Create subscriptions targeting specific wallet addresses, policy IDs, or transaction patterns
2. **Panoptes monitors the chain** - Using Argus.Sync and UtxoRPC, Panoptes processes every block in real-time
3. **Matches trigger webhooks** - When a transaction matches your criteria, Panoptes sends an HTTP POST to your endpoint
4. **Your app reacts instantly** - Process payments, update balances, trigger workflows, or send notifications

## Built for Developers

Panoptes is designed with developer experience in mind:

- **Simple REST API** for programmatic subscription management
- **Rich webhook payloads** with all transaction details you need
- **HMAC signature verification** for secure webhook validation
- **Automatic retries** with exponential backoff for reliability
- **Real-time dashboard** for monitoring and debugging
    `
  },
  'key-features': {
    title: 'Key Features',
    content: `
## Real-Time Processing

- Sub-second latency from block confirmation to webhook delivery
- Powered by UtxoRPC (gRPC) for efficient blockchain data streaming
- No polling delays or missed transactions

## Flexible Filtering

- **Address Monitoring**: Track specific wallet addresses (payment or stake)
- **Policy ID Tracking**: Monitor native asset movements by policy
- **Firehose Mode**: Receive all transactions (use with caution)
- **Minimum Value Filter**: Ignore dust transactions below a threshold

## Reliable Delivery

- Automatic retry with exponential backoff (30s, 1m, 5m, 15m, 1h)
- Up to 5 retry attempts per webhook
- Delivery status tracking (Pending, Success, Failed, Retrying)
- Full audit trail of all delivery attempts

## Rate Limiting

- Configurable per-subscription limits
- Default: 60 webhooks/minute, 1000 webhooks/hour
- Prevents overwhelming your endpoints during high activity

## Security

- HMAC-SHA256 signature on every webhook
- Per-subscription secret keys
- AWS Cognito authentication for dashboard access
- Encrypted credential storage

## Multi-Network Support

- Mainnet for production
- Preprod for testing
- Preview for early features
- Easy network switching from dashboard
    `
  },
  'use-cases': {
    title: 'Use Cases',
    content: `
## Payment Processing

Receive instant notifications when payments arrive at your merchant wallet. Automatically confirm orders, update user balances, or trigger fulfillment workflows.

\`\`\`
Subscription: Watch merchant wallet address
Event: Transaction with ADA > 10
Action: Webhook triggers order confirmation
\`\`\`

## NFT Marketplace

Monitor NFT sales and transfers in real-time. Update ownership records, calculate royalties, or notify users when their bids are accepted.

\`\`\`
Subscription: Watch collection policy ID
Event: Any transaction involving the policy
Action: Update marketplace listings
\`\`\`

## DeFi Protocol Monitoring

Track liquidity pool interactions, swap events, or governance votes. React to protocol activity for analytics, alerts, or automated responses.

## Wallet Notifications

Build notification services that alert users when they receive funds, when staking rewards are distributed, or when their assets are moved.

## Compliance & Auditing

Maintain real-time records of all transactions involving specific addresses for regulatory compliance or internal auditing.

## Bot & Automation

Power trading bots, arbitrage systems, or automated treasury management with real-time transaction data.
    `
  }
};

export const architectureContent = {
  'system-overview': {
    title: 'System Overview',
    content: `
## High-Level Architecture

Panoptes follows a clean architecture pattern with clear separation of concerns:

\`\`\`
[Cardano Network]
       |
       v (UtxoRPC/gRPC)
[Demeter.run] -----> [ArgusWorker]
                           |
                           v
                    [PanoptesReducer]
                           |
              +------------+------------+
              |            |            |
              v            v            v
         [Matcher]   [Dispatcher]  [Database]
              |            |            |
              +-----+------+            |
                    |                   |
                    v                   v
             [Your Webhook]      [PostgreSQL]
\`\`\`

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Runtime | .NET 9.0 | Backend framework |
| Sync Engine | Argus.Sync 0.3.17 | Blockchain indexing |
| Data Provider | UtxoRPC (Demeter) | Real-time block data |
| Database | PostgreSQL 17 | Persistence |
| Frontend | React 18 + Vite | Dashboard UI |
| Auth | AWS Cognito | User authentication |
    `
  },
  'data-flow': {
    title: 'Data Flow',
    content: `
## Block Processing Pipeline

### 1. Block Ingestion
The ArgusWorker connects to Demeter's UtxoRPC endpoint via gRPC. When a new block is confirmed, it streams to Panoptes immediately.

### 2. Transaction Parsing
Each transaction in the block is parsed by the PanoptesReducer:
- Extract input/output addresses
- Identify native assets and policy IDs
- Calculate ADA amounts
- Decode metadata if present

### 3. Subscription Matching
For each transaction, Panoptes checks all active subscriptions:
- Does any output address match a watched address?
- Does any asset policy match a watched policy?
- Does the transaction value meet minimum thresholds?

### 4. Webhook Dispatch
When a match is found:
1. Build the webhook payload with transaction details
2. Sign the payload with the subscription's secret key
3. POST to the target URL with appropriate headers
4. Log the delivery attempt and response

### 5. Retry Handling
If delivery fails (network error, 5xx response):
1. Mark for retry with exponential backoff
2. WebhookRetryWorker picks up failed deliveries
3. Retry up to 5 times before marking as failed
    `
  },
  'components': {
    title: 'Components',
    content: `
## Backend Components

### ArgusWorker
Background service that maintains the blockchain sync. Connects to UtxoRPC, processes blocks, and invokes the reducer for each transaction.

### PanoptesReducer
Core business logic for transaction processing. Implements the Argus IReducer interface. Handles address matching, payload building, and webhook dispatch coordination.

### WebhookDispatcher
HTTP client wrapper for webhook delivery. Handles request signing, timeout management, and response logging.

### WebhookRetryWorker
Background service that processes failed webhook deliveries. Implements exponential backoff retry logic.

### AppDbContext
Entity Framework Core database context. Manages subscriptions, delivery logs, system state, and configuration.

## Frontend Components

### Dashboard
Main control panel showing subscription overview, live logs, and system stats.

### SubscriptionDetail
Detailed view of a single subscription with delivery history, metrics, and configuration.

### SetupWizard
Guided configuration flow for first-time setup and network configuration.

### Health Page
System diagnostics showing database status, UtxoRPC connectivity, and operational metrics.
    `
  }
};
