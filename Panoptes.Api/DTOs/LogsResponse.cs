using Panoptes.Core.Entities;

namespace Panoptes.Api.DTOs
{
    public class LogsResponse
    {
        public List<DeliveryLog> Logs { get; set; } = new();
        public int TotalCount { get; set; }
    }
}
