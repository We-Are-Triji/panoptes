using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Panoptes.Core.Entities;
using Panoptes.Core.Interfaces;
using Argus.Sync.Reducers;
using Argus.Sync.Data.Models;
using Chrysalis.Cbor.Types.Cardano.Core;
using Chrysalis.Cbor.Types.Cardano.Core.Transaction;
using Chrysalis.Cbor.Types.Cardano.Core.Common;
using Chrysalis.Cbor.Extensions.Cardano.Core;
using Chrysalis.Cbor.Extensions.Cardano.Core.Header;
using Chrysalis.Cbor.Extensions.Cardano.Core.Transaction;
using Chrysalis.Cbor.Extensions.Cardano.Core.Common;
using System;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Text.Json;

namespace Panoptes.Infrastructure.Services
{
    public record PanoptesModel : IReducerModel;

    public class PanoptesReducer : IReducer<PanoptesModel>
    {
        private readonly IAppDbContext _dbContext;
        private readonly IWebhookDispatcher _dispatcher;
        private readonly ILogger<PanoptesReducer>? _logger;
        
        // Rate limit tracking: subscriptionId -> (webhooks in last minute, webhooks in last hour, timestamps)
        private readonly Dictionary<Guid, (Queue<DateTime> minuteWindow, Queue<DateTime> hourWindow)> _rateLimitTracking = new();

        public PanoptesReducer(IAppDbContext dbContext, IWebhookDispatcher dispatcher, ILogger<PanoptesReducer>? logger = null)
        {
            _dbContext = dbContext;
            _dispatcher = dispatcher;
            _logger = logger;
        }

        public async Task RollForwardAsync(Block block)
        {
            var slot = block.Header().HeaderBody().Slot();
            var blockHash = block.Header().Hash();
            var blockHeight = block.Header().HeaderBody().BlockNumber();

            // Only log every 100 blocks to reduce spam during sync
            if (blockHeight % 100 == 0)
            {
                _logger?.LogInformation("Processing block at slot {Slot}, height {Height}", slot, blockHeight);
            }

            // Fetch all active subscriptions
            var subscriptions = await _dbContext.WebhookSubscriptions
                .Where(s => s.IsActive)
                .AsNoTracking()
                .ToListAsync();

            // Log subscription count periodically
            if (blockHeight % 100 == 0 && subscriptions.Any())
            {
                _logger?.LogInformation("Found {Count} active subscriptions", subscriptions.Count);
            }

            if (subscriptions.Any())
            {
                var txs = block.TransactionBodies();
                if (txs != null && txs.Any())
                {
                    // Log when we find transactions with active subscriptions
                    if (blockHeight % 100 == 0)
                    {
                        _logger?.LogInformation("Block {Height} has {TxCount} transactions", blockHeight, txs.Count());
                    }
                    
                    var txIndex = 0;
                    foreach (var tx in txs)
                    {
                        await ProcessTransaction(tx, txIndex, slot, blockHash, blockHeight, subscriptions);
                        txIndex++;
                    }
                }
            }

            // Update Checkpoint (both slot AND hash for proper resume)
            await UpdateCheckpoint(slot, blockHash);
        }

        private async Task ProcessTransaction(
            TransactionBody tx, 
            int txIndex,
            ulong slot, 
            string blockHash, 
            ulong blockHeight,
            List<WebhookSubscription> subscriptions)
        {
            try
            {
                var txHash = tx.Hash();
                var outputs = tx.Outputs()?.ToList() ?? new List<TransactionOutput>();
                var inputs = tx.Inputs()?.ToList() ?? new List<TransactionInput>();

                // Extract addresses and assets from outputs
                var outputAddresses = new HashSet<string>();
                var policyIds = new HashSet<string>();

                foreach (var output in outputs)
                {
                    // Get output address (returns byte[], convert to hex)
                    var addressBytes = output.Address();
                    if (addressBytes != null && addressBytes.Length > 0)
                    {
                        var addressHex = Convert.ToHexString(addressBytes).ToLowerInvariant();
                        outputAddresses.Add(addressHex);
                    }

                    // Get multi-assets (NFTs/tokens) - use Value extension method
                    var amount = output.Amount();
                    if (amount is LovelaceWithMultiAsset lovelaceWithMultiAsset)
                    {
                        var multiAsset = lovelaceWithMultiAsset.MultiAsset;
                        if (multiAsset?.Value != null)
                        {
                            foreach (var policy in multiAsset.Value.Keys)
                            {
                                var policyHex = Convert.ToHexString(policy).ToLowerInvariant();
                                policyIds.Add(policyHex);
                            }
                        }
                    }
                }

                // Check each subscription for matches
                foreach (var sub in subscriptions)
                {
                    bool shouldDispatch = false;
                    string matchReason = "";
                    
                    // Debug: Log subscription details on first transaction of significant blocks
                    if (txIndex == 0 && blockHeight % 500 == 0)
                    {
                        _logger?.LogInformation("Checking subscription '{Name}' (EventType: '{EventType}', TargetAddress: '{Addr}', Active: {Active})", 
                            sub.Name, sub.EventType, sub.TargetAddress ?? "(none)", sub.IsActive);
                    }

                    switch (sub.EventType?.ToLowerInvariant())
                    {
                        case "transaction":
                            // Match by address if specified, otherwise match all transactions
                            if (string.IsNullOrEmpty(sub.TargetAddress))
                            {
                                shouldDispatch = true;
                                matchReason = "All transactions";
                            }
                            else
                            {
                                // Try matching both hex format and bech32 format
                                var targetAddressLower = sub.TargetAddress.ToLowerInvariant();
                                
                                // Check if any output address contains the target (for hex comparison)
                                // or if the target is a bech32 address, we match against hex
                                if (outputAddresses.Contains(targetAddressLower))
                                {
                                    shouldDispatch = true;
                                    matchReason = $"Address match (hex): {sub.TargetAddress}";
                                }
                                // Also check if the target address (possibly bech32) matches any output
                                // For now, if user enters partial hex, try to match
                                else if (outputAddresses.Any(addr => addr.Contains(targetAddressLower) || targetAddressLower.Contains(addr)))
                                {
                                    shouldDispatch = true;
                                    matchReason = $"Address partial match: {sub.TargetAddress}";
                                }
                            }
                            break;

                        case "nft mint":
                        case "nftmint":
                        case "mint":
                            // Check if this transaction mints assets (has mint field)
                            var mint = tx.Mint();
                            if (mint != null && mint.Any())
                            {
                                if (string.IsNullOrEmpty(sub.PolicyId))
                                {
                                    shouldDispatch = true;
                                    matchReason = "Any mint event";
                                }
                                else
                                {
                                    var mintPolicies = mint.Keys.Select(k => Convert.ToHexString(k).ToLowerInvariant());
                                    if (mintPolicies.Contains(sub.PolicyId.ToLowerInvariant()))
                                    {
                                        shouldDispatch = true;
                                        matchReason = $"Policy match: {sub.PolicyId}";
                                    }
                                }
                            }
                            break;

                        case "asset move":
                        case "assetmove":
                        case "transfer":
                            // Match asset transfers by policy ID
                            if (string.IsNullOrEmpty(sub.PolicyId))
                            {
                                if (policyIds.Any())
                                {
                                    shouldDispatch = true;
                                    matchReason = "Any asset transfer";
                                }
                            }
                            else if (policyIds.Contains(sub.PolicyId.ToLowerInvariant()))
                            {
                                shouldDispatch = true;
                                matchReason = $"Policy transfer: {sub.PolicyId}";
                            }
                            break;

                        default:
                            // Unknown event type - skip
                            break;
                    }

                    if (shouldDispatch)
                    {
                        // Check rate limits before dispatching
                        if (!await CheckRateLimitAsync(sub))
                        {
                            _logger?.LogWarning("⚠️ Rate limit exceeded for {Name}, skipping webhook", sub.Name);
                            continue;
                        }
                        
                        _logger?.LogInformation("🔔 Dispatching webhook to {Name} for {EventType}: {Reason}", 
                            sub.Name, sub.EventType, matchReason);
                            
                        // Build enhanced payload with more details
                        var payload = BuildEnhancedPayload(tx, txIndex, slot, blockHash, blockHeight, 
                            txHash, inputs, outputs, outputAddresses, policyIds, sub.EventType ?? "Unknown", matchReason);
                        
                        await DispatchWebhook(sub, payload);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error processing transaction at slot {Slot}", slot);
            }
        }

        private async Task DispatchWebhook(WebhookSubscription sub, object payload)
        {
            try
            {
                var log = await _dispatcher.DispatchAsync(sub, payload);
                
                // Set status based on response
                if (log.IsSuccess)
                {
                    log.Status = DeliveryStatus.Success;
                }
                else
                {
                    // Schedule for retry with exponential backoff
                    log.Status = DeliveryStatus.Retrying;
                    log.NextRetryAt = DateTime.UtcNow.AddSeconds(30); // First retry in 30 seconds
                }
                
                _dbContext.DeliveryLogs.Add(log);
                await _dbContext.SaveChangesAsync();

                _logger?.LogInformation(
                    "Dispatched webhook to {Name} ({Url}) - Status: {StatusCode}, DeliveryStatus: {Status}", 
                    sub.Name, sub.TargetUrl, log.ResponseStatusCode, log.Status);
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error dispatching webhook to {Name}", sub.Name);
            }
        }

        private async Task UpdateCheckpoint(ulong slot, string blockHash)
        {
            // Update slot
            var slotState = await _dbContext.SystemStates.FirstOrDefaultAsync(s => s.Key == "LastSyncedSlot");
            if (slotState == null)
            {
                slotState = new SystemState { Key = "LastSyncedSlot", Value = slot.ToString() };
                _dbContext.SystemStates.Add(slotState);
            }
            else
            {
                slotState.Value = slot.ToString();
            }

            // Update hash (required for proper resume)
            var hashState = await _dbContext.SystemStates.FirstOrDefaultAsync(s => s.Key == "LastSyncedHash");
            if (hashState == null)
            {
                hashState = new SystemState { Key = "LastSyncedHash", Value = blockHash };
                _dbContext.SystemStates.Add(hashState);
            }
            else
            {
                hashState.Value = blockHash;
            }

            await _dbContext.SaveChangesAsync();
        }

        public async Task RollBackwardAsync(ulong slot)
        {
            _logger?.LogWarning("Rolling back to slot {Slot}", slot);

            var slotState = await _dbContext.SystemStates.FirstOrDefaultAsync(s => s.Key == "LastSyncedSlot");
            if (slotState != null)
            {
                slotState.Value = slot.ToString();
            }

            // Clear the hash on rollback - will be set on next rollforward
            var hashState = await _dbContext.SystemStates.FirstOrDefaultAsync(s => s.Key == "LastSyncedHash");
            if (hashState != null)
            {
                hashState.Value = "";
            }

            await _dbContext.SaveChangesAsync();
        }

        /// <summary>
        /// Check if subscription has exceeded rate limits
        /// </summary>
        private async Task<bool> CheckRateLimitAsync(WebhookSubscription sub)
        {
            // If rate limits disabled (0), allow all
            if (sub.MaxWebhooksPerMinute == 0 && sub.MaxWebhooksPerHour == 0)
            {
                return true;
            }

            var now = DateTime.UtcNow;
            
            // Initialize tracking for this subscription if needed
            if (!_rateLimitTracking.ContainsKey(sub.Id))
            {
                _rateLimitTracking[sub.Id] = (new Queue<DateTime>(), new Queue<DateTime>());
            }

            var (minuteWindow, hourWindow) = _rateLimitTracking[sub.Id];

            // Clean up old timestamps (older than 1 minute)
            while (minuteWindow.Count > 0 && (now - minuteWindow.Peek()).TotalMinutes > 1)
            {
                minuteWindow.Dequeue();
            }

            // Clean up old timestamps (older than 1 hour)
            while (hourWindow.Count > 0 && (now - hourWindow.Peek()).TotalHours > 1)
            {
                hourWindow.Dequeue();
            }

            // Check limits
            if (sub.MaxWebhooksPerMinute > 0 && minuteWindow.Count >= sub.MaxWebhooksPerMinute)
            {
                return false;
            }

            if (sub.MaxWebhooksPerHour > 0 && hourWindow.Count >= sub.MaxWebhooksPerHour)
            {
                return false;
            }

            // Record this webhook
            minuteWindow.Enqueue(now);
            hourWindow.Enqueue(now);

            return await Task.FromResult(true);
        }

        /// <summary>
        /// Build enhanced webhook payload with comprehensive transaction details
        /// </summary>
        private object BuildEnhancedPayload(
            TransactionBody tx,
            int txIndex,
            ulong slot,
            string blockHash,
            ulong blockHeight,
            string txHash,
            List<TransactionInput> inputs,
            List<TransactionOutput> outputs,
            HashSet<string> outputAddresses,
            HashSet<string> policyIds,
            string eventType,
            string matchReason)
        {
            // Calculate total ADA from outputs
            ulong totalOutputLovelace = 0;
            var outputDetails = new List<object>();
            
            foreach (var output in outputs.Take(20)) // Increased limit
            {
                var addressBytes = output.Address();
                var addressHex = addressBytes != null && addressBytes.Length > 0 
                    ? Convert.ToHexString(addressBytes).ToLowerInvariant() 
                    : "";

                ulong lovelace = 0;
                var assets = new List<object>();

                var amount = output.Amount();
                
                // Try to get lovelace amount
                try
                {
                    if (amount is LovelaceWithMultiAsset lovelaceWithMultiAsset)
                    {
                        lovelace = lovelaceWithMultiAsset.Lovelace();
                        totalOutputLovelace += lovelace;

                        var multiAsset = lovelaceWithMultiAsset.MultiAsset;
                        if (multiAsset?.Value != null)
                        {
                            // Extract policy IDs (assets details are complex, keep it simple)
                            var policyCount = 0;
                            foreach (var policy in multiAsset.Value.Keys)
                            {
                                if (policyCount >= 5) break;
                                
                                var policyHex = Convert.ToHexString(policy).ToLowerInvariant();
                                
                                // Add a simple asset entry with just the policy ID
                                // Detailed asset enumeration is complex with TokenBundleOutput
                                assets.Add(new
                                {
                                    PolicyId = policyHex,
                                    AssetName = "multiple",
                                    Quantity = 0L // Not available without complex parsing
                                });
                                
                                policyCount++;
                            }
                        }
                    }
                }
                catch
                {
                    // If we can't parse the amount, just skip it
                }

                outputDetails.Add(new
                {
                    Address = addressHex,
                    Lovelace = lovelace,
                    Ada = lovelace / 1_000_000.0, // Convert to ADA
                    Assets = assets
                });
            }

            // Extract input details
            var inputDetails = inputs.Take(20).Select(input => new
            {
                TxHash = Convert.ToHexString(input.TransactionId()).ToLowerInvariant(),
                OutputIndex = input.Index()
            }).ToList();

            return new
            {
                Event = eventType,
                MatchReason = matchReason,
                
                // Block Info
                Slot = slot,
                BlockHash = blockHash,
                BlockHeight = blockHeight,
                Timestamp = DateTime.UtcNow,
                
                // Transaction Info
                TxHash = txHash,
                TxIndex = txIndex,
                Fee = tx.Fee(), // Transaction fee in lovelace
                
                // Inputs/Outputs Summary
                InputCount = inputs.Count,
                OutputCount = outputs.Count,
                TotalOutputAda = totalOutputLovelace / 1_000_000.0,
                TotalOutputLovelace = totalOutputLovelace,
                
                // Detailed Lists
                Inputs = inputDetails,
                Outputs = outputDetails,
                
                // Addresses & Assets (legacy fields for backward compatibility)
                OutputAddresses = outputAddresses.Take(10).ToList(),
                PolicyIds = policyIds.Take(10).ToList()
            };
        }
    }
}
