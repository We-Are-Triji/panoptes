using Panoptes.Core.Entities;
using System.Threading.Tasks;

namespace Panoptes.Core.Interfaces
{
    public interface IWebhookDispatcher
    {
        Task<DeliveryLog> DispatchAsync(WebhookSubscription sub, object payload);
    }
}
