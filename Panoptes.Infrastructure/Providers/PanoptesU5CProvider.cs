using Argus.Sync.Data.Models;
using Argus.Sync.Providers;
using Chrysalis.Cbor.Serialization;
using Chrysalis.Cbor.Types.Cardano.Core;
using Chrysalis.Cbor.Types.Cardano.Core.Header;
using Chrysalis.Cbor.Types.Cardano.Core.Transaction;
using Chrysalis.Cbor.Types.Cardano.Core.TransactionWitness;
using Chrysalis.Cbor.Types;
using System.Formats.Cbor;
using Utxorpc.Sdk;
using U5CNextResponse = Utxorpc.Sdk.Models.NextResponse;
using Chrysalis.Cbor.Extensions.Cardano.Core;
using Chrysalis.Cbor.Extensions.Cardano.Core.Header;

namespace Panoptes.Infrastructure.Providers;

/// <summary>
/// Custom U5C Provider that handles UtxoRPC block format correctly.
/// </summary>
public class PanoptesU5CProvider : ICardanoChainProvider
{
    private readonly string _url;
    private readonly Dictionary<string, string> _headers;

    public PanoptesU5CProvider(string url, Dictionary<string, string> headers)
    {
        _url = url;
        _headers = headers;
    }

    /// <summary>
    /// Fetches a recent valid block from Koios API to use as intersection point.
    /// DYNAMICALLY selects the correct Koios network based on the gRPC URL.
    /// </summary>
    public async Task<Point> GetTipAsync(ulong networkMagic = 2, CancellationToken? stoppingToken = null)
    {
        try
        {
            // ---------------------------------------------------------
            // 1. DYNAMIC NETWORK DETECTION
            // ---------------------------------------------------------
            // We infer the target network from the Demeter URL string.
            // Demeter URLs format: "cardano-mainnet.utxorpc..." or "cardano-preprod.utxorpc..."
            
            string koiosUrl;

            if (_url.Contains("mainnet", StringComparison.OrdinalIgnoreCase))
            {
                koiosUrl = "https://api.koios.rest/api/v1/tip";
            }
            else if (_url.Contains("preview", StringComparison.OrdinalIgnoreCase))
            {
                koiosUrl = "https://preview.koios.rest/api/v1/tip";
            }
            else
            {
                // Default to Preprod for safety (or if explicit 'preprod' is found)
                koiosUrl = "https://preprod.koios.rest/api/v1/tip";
            }
            
            using var httpClient = new HttpClient();
            httpClient.Timeout = TimeSpan.FromSeconds(10);
            
            var response = await httpClient.GetAsync(koiosUrl, stoppingToken ?? CancellationToken.None);
            response.EnsureSuccessStatusCode();
            
            var json = await response.Content.ReadAsStringAsync();
            
            using var doc = System.Text.Json.JsonDocument.Parse(json);
            var tipArray = doc.RootElement;
            
            if (tipArray.GetArrayLength() > 0)
            {
                var tip = tipArray[0];
                var hash = tip.GetProperty("hash").GetString();
                var slot = tip.GetProperty("abs_slot").GetUInt64();
                
                if (!string.IsNullOrEmpty(hash))
                {
                    return new Point(hash, slot);
                }
            }
            
            throw new InvalidOperationException("Failed to parse Koios API response");
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Failed to fetch chain tip from Koios API: {ex.Message}", ex);
        }
    }

    public async IAsyncEnumerable<NextResponse> StartChainSyncAsync(
        IEnumerable<Point> intersections, 
        ulong networkMagic = 2, 
        CancellationToken? stoppingToken = null)
    {
        var client = new SyncServiceClient(_url, _headers);
        var latestIntersection = intersections.MaxBy(e => e.Slot);

        if (latestIntersection == null)
        {
            yield break;
        }

        await foreach (var response in client.FollowTipAsync(
            new Utxorpc.Sdk.Models.BlockRef(latestIntersection.Hash, latestIntersection.Slot)))
        {
            if (stoppingToken?.IsCancellationRequested == true)
            {
                yield break;
            }

            switch (response.Action)
            {
                case Utxorpc.Sdk.Models.Enums.NextResponseAction.Apply:
                    var applyBlock = DeserializeBlock(response.AppliedBlock!.NativeBytes);
                    if (applyBlock != null)
                    {
                        yield return new NextResponse(
                            NextResponseAction.RollForward,
                            null,
                            applyBlock
                        );
                    }
                    break;

                case Utxorpc.Sdk.Models.Enums.NextResponseAction.Undo:
                    var undoBlock = DeserializeBlock(response.UndoneBlock!.NativeBytes);
                    if (undoBlock != null)
                    {
                        yield return new NextResponse(
                            NextResponseAction.RollBack,
                            RollBackType.Inclusive,
                            undoBlock
                        );
                    }
                    break;

                case Utxorpc.Sdk.Models.Enums.NextResponseAction.Reset:
                    var resetBlock = CreateResetBlock(response.ResetRef!.Index);
                    yield return new NextResponse(
                        NextResponseAction.RollBack,
                        RollBackType.Exclusive,
                        resetBlock
                    );
                    break;
            }
        }
    }

    private Block? DeserializeBlock(ReadOnlyMemory<byte> blockCbor)
    {
        try
        {
            var reader = new CborReader(blockCbor, CborConformanceMode.Lax);
            var initialState = reader.PeekState();

            if (initialState == CborReaderState.Tag)
            {
                return DeserializeN2CFormat(blockCbor);
            }
            else if (initialState == CborReaderState.StartArray)
            {
                return DeserializeRawFormat(blockCbor);
            }
            else
            {
                return ConwayBlock.Read(blockCbor);
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[PanoptesU5CProvider] Error deserializing block: {ex.Message}");
            return null;
        }
    }

    private Block? DeserializeN2CFormat(ReadOnlyMemory<byte> blockCbor)
    {
        var reader = new CborReader(blockCbor, CborConformanceMode.Lax);
        var tag = reader.ReadTag();
        var innerBytes = reader.ReadByteString();
        return DeserializeRawFormat(innerBytes);
    }

    private Block? DeserializeRawFormat(ReadOnlyMemory<byte> blockCbor)
    {
        var reader = new CborReader(blockCbor, CborConformanceMode.Lax);
        reader.ReadStartArray();
        var era = reader.ReadInt32();
        var blockBytes = reader.ReadEncodedValue(true);

        return era switch
        {
            2 or 3 or 4 or 5 => AlonzoCompatibleBlock.Read(blockBytes),
            6 => BabbageBlock.Read(blockBytes),
            7 => ConwayBlock.Read(blockBytes),
            _ => throw new NotSupportedException($"Unsupported era: {era}")
        };
    }

    private Block CreateResetBlock(ulong slot)
    {
        return new ConwayBlock(
            new BlockHeader(
                new BabbageHeaderBody(0, slot, [], [], [], new VrfCert([], []), 0, [], new OperationalCert([], 0, 0, []), new ProtocolVersion(0, 0)),
                []
            ),
            new CborDefList<ConwayTransactionBody>([]),
            new CborDefList<PostAlonzoTransactionWitnessSet>([]),
            new AuxiliaryDataSet([]),
            new CborDefList<int>([])
        );
    }
}