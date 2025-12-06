using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.DependencyInjection;
using Panoptes.Core.Interfaces;
using Panoptes.Infrastructure.Configurations;
using Panoptes.Infrastructure.Services;
using Panoptes.Infrastructure.Providers;
using Argus.Sync.Data.Models;
using Chrysalis.Cbor.Extensions.Cardano.Core;
using Chrysalis.Cbor.Extensions.Cardano.Core.Header;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;

namespace Panoptes.Api.Workers
{
    public class ArgusWorker : BackgroundService
    {
        private readonly ILogger<ArgusWorker> _logger;
        private readonly PanoptesConfig _config;
        private readonly IServiceProvider _serviceProvider;

        public ArgusWorker(
            ILogger<ArgusWorker> logger,
            IOptions<PanoptesConfig> config,
            IServiceProvider serviceProvider)
        {
            _logger = logger;
            _config = config.Value;
            _serviceProvider = serviceProvider;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    _logger.LogInformation("Connecting to Demeter Argus via UtxoRPC at {Url}", _config.GrpcEndpoint);

                    var headers = new Dictionary<string, string>
                    {
                        { "dmtr-api-key", _config.ApiKey }
                    };
                    
                    // Use our custom provider that handles UtxoRPC format correctly
                    var provider = new PanoptesU5CProvider(_config.GrpcEndpoint, headers);

                    using (var scope = _serviceProvider.CreateScope())
                    {
                        var reducer = scope.ServiceProvider.GetRequiredService<PanoptesReducer>();
                        var dbContext = scope.ServiceProvider.GetRequiredService<IAppDbContext>();
                        
                        // Determine start point
                        var intersections = new List<Point>();
                        
                        // Check DB for checkpoint
                        var lastSyncedState = await dbContext.SystemStates
                            .AsNoTracking()
                            .FirstOrDefaultAsync(s => s.Key == "LastSyncedSlot", stoppingToken);

                        string? startHash = _config.StartHash;
                        ulong? startSlot = null;

                        if (lastSyncedState != null && ulong.TryParse(lastSyncedState.Value, out var savedSlot))
                        {
                            // Check if we have a saved hash as well
                            var lastSyncedHash = await dbContext.SystemStates
                                .AsNoTracking()
                                .FirstOrDefaultAsync(s => s.Key == "LastSyncedHash", stoppingToken);
                            
                            if (lastSyncedHash != null && !string.IsNullOrEmpty(lastSyncedHash.Value))
                            {
                                startSlot = savedSlot;
                                startHash = lastSyncedHash.Value;
                                _logger.LogInformation("Resuming from checkpoint: Slot {Slot}, Hash {Hash}", startSlot, startHash);
                            }
                            else
                            {
                                _logger.LogWarning("Found checkpoint slot {Slot} but missing hash. Using configured start point.", savedSlot);
                            }
                        }
                        
                        // Fall back to config if no valid checkpoint
                        if (startSlot == null && _config.StartSlot.HasValue && !string.IsNullOrEmpty(_config.StartHash))
                        {
                            startSlot = (ulong)_config.StartSlot.Value;
                            startHash = _config.StartHash;
                            _logger.LogInformation("Using configured start point: Slot {Slot}, Hash {Hash}", startSlot, startHash);
                        }

                        // If still no valid start point, fetch the current chain tip dynamically
                        if (startSlot == null || string.IsNullOrEmpty(startHash))
                        {
                            _logger.LogInformation("No valid start point found. Fetching current chain tip...");
                            try
                            {
                                var tip = await provider.GetTipAsync(0, stoppingToken);
                                startSlot = tip.Slot;
                                startHash = tip.Hash;
                                _logger.LogInformation("Fetched chain tip: Slot {Slot}, Hash {Hash}", startSlot, startHash);
                            }
                            catch (Exception ex)
                            {
                                _logger.LogError(ex, "Failed to fetch chain tip. Retrying in 5 seconds...");
                                await Task.Delay(5000, stoppingToken);
                                continue;
                            }
                        }

                        intersections.Add(new Point(startHash, startSlot.Value));

                        // Network Magic: Mainnet = 764824073, Preprod = 1, Preview = 2
                        ulong networkMagic = _config.Network switch
                        {
                            "Mainnet" => 764824073,
                            "Preprod" => 1,
                            "Preview" => 2,
                            _ => 764824073
                        };

                        _logger.LogInformation("Starting chain sync from Slot {Slot}, Hash {Hash} with Network Magic {NetworkMagic}", 
                            startSlot, startHash, networkMagic);

                        var blockCount = 0;
                        var responseCount = 0;
                        await foreach (var response in provider.StartChainSyncAsync(intersections, networkMagic, stoppingToken))
                        {
                            responseCount++;
                            _logger.LogDebug("Received response #{Count}: {Action}", responseCount, response.Action);
                            
                            if (response.Action == NextResponseAction.RollForward && response.Block != null)
                            {
                                await reducer.RollForwardAsync(response.Block);
                                blockCount++;
                            }
                            else if (response.Action == NextResponseAction.RollBack)
                            {
                                if (response.Block != null)
                                {
                                    await reducer.RollBackwardAsync(response.Block.Header().HeaderBody().Slot());
                                }
                            }
                        }
                        
                        // If we exit the loop without processing any blocks, something is wrong
                        if (blockCount == 0)
                        {
                            _logger.LogWarning("Chain sync ended after {ResponseCount} responses without processing any blocks. Intersection may be invalid. Reconnecting in 5 seconds...", responseCount);
                            await Task.Delay(5000, stoppingToken);
                        }
                    }
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    _logger.LogInformation("Argus Worker stopping due to cancellation request");
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Argus Worker encountered an error. Retrying in 5 seconds...");
                    await Task.Delay(5000, stoppingToken);
                }
            }
        }
    }
}
