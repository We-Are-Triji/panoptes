namespace Panoptes.Infrastructure.Configurations
{
    public class PanoptesConfig
    {
        public string GrpcEndpoint { get; set; } = string.Empty;
        public string ApiKey { get; set; } = string.Empty;
        public string Network { get; set; } = "Preprod";
        public long? StartSlot { get; set; }
    }
}
