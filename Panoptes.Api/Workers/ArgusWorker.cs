using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.DependencyInjection;
using Panoptes.Core.Interfaces;
using Panoptes.Infrastructure.Configurations;
using Panoptes.Infrastructure.Services;
using Saib.Argus;
using Grpc.Net.Client;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;

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

                    // Initialize U5CProvider
                    var settings = new U5CProviderSettings
                    {
                        Endpoint = _config.GrpcEndpoint,
                        Headers = { { "dmtr-api-key", _config.ApiKey } }
                    };
                    using var provider = new U5CProvider(settings);

                    using (var scope = _serviceProvider.CreateScope())
                    {
                        var reducer = scope.ServiceProvider.GetRequiredService<PanoptesReducer>();
                        var dbContext = scope.ServiceProvider.GetRequiredService<IAppDbContext>();
                        
                        // Determine start slot
                        long? startSlot = _config.StartSlot;

                        // Check DB for checkpoint
                        var lastSyncedState = await dbContext.SystemStates
                            .AsNoTracking()
                            .FirstOrDefaultAsync(s => s.Key == "LastSyncedSlot", stoppingToken);

                        if (lastSyncedState != null && long.TryParse(lastSyncedState.Value, out var savedSlot))
                        {
                            startSlot = savedSlot;
                            _logger.LogInformation("Resuming from checkpoint slot {Slot}", startSlot);
                        }
                        
                        if (startSlot == null)
                        {
                            var tip = await provider.GetTipAsync(stoppingToken);
                            startSlot = tip.Slot;
                            _logger.LogInformation("No checkpoint or config found. Starting from Tip: {Slot}", startSlot);
                        }
                        else
                        {
                            _logger.LogInformation("Starting sync from slot {Slot}", startSlot);
                        }

                        await provider.StartAsync(reducer, startSlot.Value, stoppingToken);
                    }
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
