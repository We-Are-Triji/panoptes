using Microsoft.EntityFrameworkCore;
using Panoptes.Core.Entities;
using Panoptes.Core.Interfaces;
using Argus.Sync.Reducers;
using Argus.Sync.Data.Models;
using Chrysalis.Cbor.Types.Cardano.Core;
using Chrysalis.Cbor.Extensions.Cardano.Core;
using Chrysalis.Cbor.Extensions.Cardano.Core.Header;
using Chrysalis.Cbor.Extensions.Cardano.Core.Transaction;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace Panoptes.Infrastructure.Services
{
    public record PanoptesModel : IReducerModel;

    public class PanoptesReducer : IReducer<PanoptesModel>
    {
        private readonly IAppDbContext _dbContext;
        private readonly IWebhookDispatcher _dispatcher;

        public PanoptesReducer(IAppDbContext dbContext, IWebhookDispatcher dispatcher)
        {
            _dbContext = dbContext;
            _dispatcher = dispatcher;
        }

        public async Task RollForwardAsync(Block block)
        {
            // Fetch all active subscriptions
            var subscriptions = await _dbContext.WebhookSubscriptions
                .Where(s => s.IsActive)
                .AsNoTracking()
                .ToListAsync();

            if (!subscriptions.Any())
            {
                return;
            }

            var txs = block.TransactionBodies();
            if (txs == null)
            {
                return;
            }

            foreach (var tx in txs)
            {
                // TODO: Implement proper matching logic using Chrysalis types
                // For now, we just iterate to show structure
                /*
                foreach (var sub in subscriptions)
                {
                    // Logic to extract address and policyId from tx
                    // if (sub.Matches(address, policyId)) ...
                }
                */
            }

            // Update Checkpoint
            var slot = block.Header().HeaderBody().Slot();
            var state = await _dbContext.SystemStates.FirstOrDefaultAsync(s => s.Key == "LastSyncedSlot");
            if (state == null)
            {
                state = new SystemState { Key = "LastSyncedSlot", Value = slot.ToString() };
                _dbContext.SystemStates.Add(state);
            }
            else
            {
                state.Value = slot.ToString();
            }

            await _dbContext.SaveChangesAsync();
        }

        public async Task RollBackwardAsync(ulong slot)
        {
             var state = await _dbContext.SystemStates.FirstOrDefaultAsync(s => s.Key == "LastSyncedSlot");
             if (state != null)
             {
                 state.Value = slot.ToString();
                 await _dbContext.SaveChangesAsync();
             }
        }
    }
}
