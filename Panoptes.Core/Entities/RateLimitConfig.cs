namespace Panoptes.Core.Entities
{
    /// <summary>
    /// Rate limiting configuration for webhook subscriptions
    /// </summary>
    public class RateLimitConfig
    {
        /// <summary>
        /// Maximum webhooks per minute (0 = unlimited)
        /// </summary>
        public int MaxWebhooksPerMinute { get; set; } = 60;
        
        /// <summary>
        /// Maximum webhooks per hour (0 = unlimited)
        /// </summary>
        public int MaxWebhooksPerHour { get; set; } = 1000;
        
        /// <summary>
        /// Batch multiple events into single webhook (reduces spam)
        /// </summary>
        public bool EnableBatching { get; set; } = false;
        
        /// <summary>
        /// Batch window in seconds (collect events for X seconds before sending)
        /// </summary>
        public int BatchWindowSeconds { get; set; } = 10;
    }
}
