using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;

namespace Panoptes.Core.Entities
{
    public class WebhookSubscription
    {
        [Key]
        public Guid Id { get; set; }

        public string UserId { get; set; } = string.Empty;

        public string Name { get; set; } = string.Empty;
        public string TargetUrl { get; set; } = string.Empty;
        public string EventType { get; set; } = string.Empty;

        public string? TargetAddress { get; set; }
        public string? PolicyId { get; set; }

        public string SecretKey { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public bool IsPaused { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? PausedAt { get; set; }
        public ulong? MinimumLovelace { get; set; }

        public bool IsDeleted { get; set; } = false;

        public string? CustomHeaders { get; set; }
        public string? CustomPayloadTemplate { get; set; }

        public List<string>? WalletAddresses { get; set; }

        public int MaxWebhooksPerMinute { get; set; } = 60;
        public int MaxWebhooksPerHour { get; set; } = 1000;
        public bool EnableBatching { get; set; } = false;
        public int BatchWindowSeconds { get; set; } = 10;

        [NotMapped]
        public int WebhooksInLastMinute { get; set; } = 0;
        [NotMapped]
        public int WebhooksInLastHour { get; set; } = 0;
        [NotMapped]
        public DateTime? LastWebhookAt { get; set; }
        [NotMapped]
        public bool IsRateLimited { get; set; } = false;
        [NotMapped]
        public bool IsSyncing { get; set; } = false;

        public bool Matches(HashSet<string> addresses, HashSet<string> policies)
        {
            bool hasWalletFilters = WalletAddresses != null && WalletAddresses.Count > 0;
            bool hasTargetAddress = !string.IsNullOrEmpty(TargetAddress);
            bool hasPolicyFilter = !string.IsNullOrEmpty(PolicyId);

            if (!hasWalletFilters && !hasTargetAddress && !hasPolicyFilter)
            {
                return true;
            }

            if (hasWalletFilters)
            {
                foreach (var filter in WalletAddresses!)
                {
                    var f = filter.ToLowerInvariant();
                    if (addresses != null && (addresses.Contains(f) || addresses.Any(a => a.Contains(f)))) 
                        return true;
                    if (policies != null && policies.Contains(f)) 
                        return true;
                }
            }

            if (hasTargetAddress && addresses != null)
            {
                if (addresses.Contains(TargetAddress!.ToLowerInvariant())) return true;
            }

            if (hasPolicyFilter && policies != null)
            {
                if (policies.Contains(PolicyId!.ToLowerInvariant())) return true;
            }

            return false;
        }
    }
}