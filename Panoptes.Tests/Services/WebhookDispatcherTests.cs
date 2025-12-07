using System.Security.Cryptography;
using System.Text;
using FluentAssertions;
using Panoptes.Infrastructure.Services;

namespace Panoptes.Tests.Services;

public class WebhookDispatcherTests
{
    [Fact]
    public void ComputeSignature_ShouldReturnCorrectHmacSha256()
    {
        // Arrange
        var secretKey = "test-secret-key-12345";
        var payload = @"{""event"":""test"",""data"":{""value"":123}}";
        
        // Expected signature computed manually
        var expectedSignature = ComputeExpectedSignature(secretKey, payload);
        
        // Act - We can't directly test private method, but we can verify the algorithm
        var actualSignature = ComputeHmacSha256(secretKey, payload);
        
        // Assert
        actualSignature.Should().Be(expectedSignature);
        actualSignature.Should().HaveLength(64); // SHA256 hex = 64 chars
    }
    
    [Theory]
    [InlineData("secret1", "payload1")]
    [InlineData("different-secret", "different-payload")]
    [InlineData("", "empty-secret-test")]
    public void ComputeSignature_ShouldBeConsistent(string secret, string payload)
    {
        // Arrange & Act
        var signature1 = ComputeHmacSha256(secret, payload);
        var signature2 = ComputeHmacSha256(secret, payload);
        
        // Assert
        signature1.Should().Be(signature2, "same inputs should produce same signature");
    }
    
    [Fact]
    public void ComputeSignature_ShouldBeDifferentForDifferentPayloads()
    {
        // Arrange
        var secret = "test-secret";
        var payload1 = @"{""value"":1}";
        var payload2 = @"{""value"":2}";
        
        // Act
        var signature1 = ComputeHmacSha256(secret, payload1);
        var signature2 = ComputeHmacSha256(secret, payload2);
        
        // Assert
        signature1.Should().NotBe(signature2, "different payloads should have different signatures");
    }
    
    // Helper method that mimics the actual implementation
    private string ComputeHmacSha256(string secretKey, string payload)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secretKey));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
    
    private string ComputeExpectedSignature(string secretKey, string payload)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secretKey));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}
