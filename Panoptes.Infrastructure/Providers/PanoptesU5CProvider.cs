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
/// The standard Argus.Sync U5CProvider expects N2C format (Tag 24 wrapped),
/// but UtxoRPC returns raw era-array format.
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
    /// Koios provides free REST API access to Cardano chain data.
    /// </summary>
    public async Task<Point> GetTipAsync(ulong networkMagic = 2, CancellationToken? stoppingToken = null)
    {
        try
        {
            // Use Koios API to get recent tip
            var koiosUrl = "https://preprod.koios.rest/api/v1/tip";
            
            using var httpClient = new HttpClient();
            httpClient.Timeout = TimeSpan.FromSeconds(10);
            
            var response = await httpClient.GetAsync(koiosUrl, stoppingToken ?? CancellationToken.None);
            response.EnsureSuccessStatusCode();
            
            var json = await response.Content.ReadAsStringAsync();
            
            // Parse JSON response - Koios returns: [{"hash":"...", "epoch_no":123, "abs_slot":12345678, "epoch_slot":123456, "block_no":9876543, "block_time":1234567890}]
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
                    // Create a minimal block for reset (rollback to specific point)
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

    /// <summary>
    /// Deserialize block from UtxoRPC format.
    /// UtxoRPC can return blocks in different formats:
    /// 1. Raw era-array: [era_id, block_cbor]
    /// 2. N2C format: Tag(24, ByteString([era_id, block_cbor]))
    /// </summary>
    private Block? DeserializeBlock(ReadOnlyMemory<byte> blockCbor)
    {
        try
        {
            var reader = new CborReader(blockCbor, CborConformanceMode.Lax);
            var initialState = reader.PeekState();

            // Check if it starts with a tag (N2C format) or array (raw format)
            if (initialState == CborReaderState.Tag)
            {
                // N2C format: Tag(24, ByteString([era, block]))
                return DeserializeN2CFormat(blockCbor);
            }
            else if (initialState == CborReaderState.StartArray)
            {
                // Raw era-array format: [era, block]
                return DeserializeRawFormat(blockCbor);
            }
            else
            {
                // Try to deserialize as raw Conway block
                return ConwayBlock.Read(blockCbor);
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[PanoptesU5CProvider] Error deserializing block: {ex.Message}");
            Console.WriteLine($"[PanoptesU5CProvider] First 20 bytes: {Convert.ToHexString(blockCbor.Span[..Math.Min(20, blockCbor.Length)])}");
            return null;
        }
    }

    private Block? DeserializeN2CFormat(ReadOnlyMemory<byte> blockCbor)
    {
        var reader = new CborReader(blockCbor, CborConformanceMode.Lax);
        
        // Read tag 24
        var tag = reader.ReadTag();
        if (tag != CborTag.EncodedCborDataItem)
        {
            throw new InvalidOperationException($"Expected CBOR tag 24, got {tag}");
        }

        // Read the byte string containing [era, block]
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
            // Shelley, Allegra, Mary, Alonzo
            2 or 3 or 4 or 5 => AlonzoCompatibleBlock.Read(blockBytes),
            // Babbage
            6 => BabbageBlock.Read(blockBytes),
            // Conway
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
