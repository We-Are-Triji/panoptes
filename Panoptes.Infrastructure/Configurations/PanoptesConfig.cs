namespace Panoptes.Infrastructure.Configurations
{
    public class PanoptesConfig
    {
        public string DemeterUrl { get; set; } = string.Empty;
        public string DemeterApiKey { get; set; } = string.Empty;
        public string Network { get; set; } = "Preprod";
        public long? StartSlot { get; set; }
    }
}
