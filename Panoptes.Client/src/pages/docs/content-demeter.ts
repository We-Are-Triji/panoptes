export const demeterContent = {
  'utxorpc-explained': {
    title: 'UtxoRPC Explained',
    content: `
## What is UtxoRPC?

UtxoRPC is a standardized gRPC interface for accessing Cardano blockchain data. It provides a consistent, efficient way to:

- Stream new blocks in real-time
- Query UTxO sets
- Submit transactions
- Access chain state

## Why gRPC?

Traditional REST APIs require polling - repeatedly asking "any new blocks?" This is inefficient and introduces latency. gRPC enables:

- **Streaming**: Server pushes new blocks as they arrive
- **Binary Protocol**: Smaller payloads, faster parsing
- **Strong Typing**: Protocol buffers ensure data consistency
- **Bidirectional**: Efficient two-way communication

## The UTxO Model

Cardano uses the UTxO (Unspent Transaction Output) model. Each transaction consumes existing UTxOs and creates new ones. UtxoRPC is optimized for this model, providing efficient access to:

- Transaction inputs (consumed UTxOs)
- Transaction outputs (new UTxOs)
- Native assets attached to outputs
- Datum and script references
    `
  },
  'demeter-benefits': {
    title: 'Benefits of Demeter',
    content: `
## Why Panoptes Uses Demeter

### 1. No Infrastructure Management

Running a Cardano node requires:
- 16GB+ RAM
- 200GB+ SSD storage
- Constant maintenance and updates
- Hours of initial sync time

With Demeter, you get instant access to fully synced nodes without any infrastructure overhead.

### 2. Multi-Network Access

Single API key provides access to:
- Mainnet (production)
- Preprod (testing)
- Preview (bleeding edge)

Switch networks by changing a URL - no separate node deployments.

### 3. High Availability

Demeter operates redundant infrastructure across multiple regions. Your application benefits from:
- 99.9%+ uptime SLA
- Automatic failover
- Geographic distribution

### 4. Cost Efficiency

Pay only for what you use. No need to provision servers for peak capacity or pay for idle resources during low activity.

### 5. Developer Experience

- Instant setup (minutes, not hours)
- Consistent API across networks
- Comprehensive documentation
- Active community support

## Getting a Demeter API Key

1. Visit [demeter.run](https://demeter.run)
2. Create an account and project
3. Add the "UtxoRPC" product to your project
4. Copy your API key (starts with \`dmtr_\`)
5. Paste into Panoptes Settings
    `
  },
  'alternatives': {
    title: 'Alternatives',
    content: `
## Self-Hosted Options

### Running Your Own Node

You can run Panoptes against your own Cardano node with UtxoRPC support:

**Pros:**
- Full control over infrastructure
- No external dependencies
- No usage limits

**Cons:**
- Significant hardware requirements
- Maintenance overhead
- Initial sync takes hours/days

### Dolos

[Dolos](https://github.com/txpipe/dolos) is a lightweight Cardano data node that supports UtxoRPC:

\`\`\`bash
# Example Dolos configuration
dolos daemon --network preprod --grpc-listen 0.0.0.0:50051
\`\`\`

### Scrolls

For specific use cases, [Scrolls](https://github.com/txpipe/scrolls) provides a reducer-based indexing approach compatible with UtxoRPC.

## Other Providers

While Panoptes is optimized for Demeter, any UtxoRPC-compatible endpoint should work. Check the provider's documentation for connection details.

## Comparison

| Factor | Demeter | Self-Hosted |
|--------|---------|-------------|
| Setup Time | Minutes | Hours/Days |
| Maintenance | None | Ongoing |
| Cost | Usage-based | Infrastructure |
| Reliability | Managed SLA | Self-managed |
| Scalability | Automatic | Manual |
    `
  }
};

export const gettingStartedContent = {
  'prerequisites': {
    title: 'Prerequisites',
    content: `
## System Requirements

### For Development

| Component | Requirement |
|-----------|-------------|
| .NET SDK | 9.0.308 or higher |
| Node.js | 18+ (24.x recommended) |
| npm | 8+ (11.x recommended) |
| Docker | 20+ with Compose |
| PostgreSQL | 17 (via Docker) |

### Verify Installation

\`\`\`bash
# Check .NET
dotnet --version
# Expected: 9.0.308+

# Check Node.js
node --version && npm --version
# Expected: v18+ and npm 8+

# Check Docker
docker --version
docker compose version
\`\`\`

## External Services

### Required: Demeter Account

You need a Demeter.run account with UtxoRPC access:
1. Sign up at [demeter.run](https://demeter.run)
2. Create a project
3. Add UtxoRPC product
4. Note your API key

### Optional: AWS Cognito

For production authentication, configure AWS Cognito:
- User Pool for authentication
- App Client for the frontend
- Identity Pool for AWS service access

For local development, you can use the built-in mock auth.
    `
  },
  'installation': {
    title: 'Installation',
    content: `
## Clone the Repository

\`\`\`bash
git clone https://github.com/We-Are-Triji/panoptes.git
cd panoptes
\`\`\`

## Start the Database

\`\`\`bash
# Start PostgreSQL container
docker compose up -d

# Verify it's running
docker ps
# Should show panoptes_db on port 5432
\`\`\`

## Build the Backend

\`\`\`bash
# Restore dependencies and build
dotnet build

# Run tests to verify
dotnet test
\`\`\`

## Install Frontend Dependencies

\`\`\`bash
cd Panoptes.Client
npm install
\`\`\`

## Start the Application

**Terminal 1 - Backend:**
\`\`\`bash
dotnet run --project Panoptes.Api
# API runs on http://localhost:5033
\`\`\`

**Terminal 2 - Frontend:**
\`\`\`bash
cd Panoptes.Client
npm run dev
# Dashboard runs on http://localhost:5173
\`\`\`

## Initial Configuration

1. Open http://localhost:5173
2. Complete the Setup Wizard
3. Enter your Demeter API key
4. Select your target network
5. The sync worker starts automatically
    `
  },
  'first-subscription': {
    title: 'Creating Your First Subscription',
    content: `
## Step 1: Prepare a Webhook Endpoint

You need a URL that can receive POST requests. For testing, use:
- [webhook.site](https://webhook.site) - Free temporary endpoints
- [RequestBin](https://requestbin.com) - Similar service
- Your own server endpoint

## Step 2: Create the Subscription

1. Click **"New Subscription"** in the dashboard
2. Fill in the details:
   - **Name**: "My First Hook"
   - **Webhook URL**: Your endpoint URL
   - **Event Type**: Transaction
3. Add a filter (optional):
   - Paste a wallet address to monitor
   - Or leave empty for all transactions (Firehose)
4. Click **"Create Subscription"**

## Step 3: Test the Webhook

1. Open the subscription detail view
2. Click the **"Test"** button
3. Check your webhook endpoint for the test payload

## Step 4: Trigger a Real Event

Send a small amount of ADA to the address you're monitoring. Within seconds, you should receive a webhook with the transaction details.

## Understanding the Payload

\`\`\`json
{
  "Event": "transaction",
  "TxHash": "abc123...",
  "Metadata": {
    "MatchReason": "Address: addr_test1...",
    "InputCount": 1,
    "OutputCount": 2
  },
  "Outputs": [...],
  "Block": {
    "Slot": 12345678,
    "Height": 1234567
  }
}
\`\`\`
    `
  }
};
