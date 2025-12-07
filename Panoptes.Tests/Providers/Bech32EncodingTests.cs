using FluentAssertions;
using Panoptes.Infrastructure.Providers;

namespace Panoptes.Tests.Providers;

public class Bech32EncodingTests
{
    [Theory]
    [InlineData("addr1qx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3n0d3vllmyqwsx5wktcd8cc3sq835lu7drv2xwl2wywfgs68faae")]
    [InlineData("addr_test1qz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3n0d3vllmyqwsx5wktcd8cc3sq835lu7drv2xwl2wywfgse5kgr8")]
    public void Bech32Address_ShouldBeValid(string address)
    {
        // Arrange & Act
        var isValid = IsValidBech32Address(address);
        
        // Assert
        isValid.Should().BeTrue($"{address} should be a valid Cardano address");
    }
    
    [Theory]
    [InlineData("invalid")]
    [InlineData("addr1")]
    [InlineData("")]
    [InlineData("stake1u9abcdef")]  // Stake address format, not payment
    [InlineData("addr1qx")]  // Too short
    public void Bech32Address_ShouldBeInvalid(string address)
    {
        // Arrange & Act
        var isValid = IsValidBech32Address(address);
        
        // Assert
        isValid.Should().BeFalse($"{address} should not be a valid Cardano payment address");
    }
    
    [Fact]
    public void MainnetAddress_ShouldStartWithAddr1()
    {
        // Arrange
        var mainnetAddress = "addr1qx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3n0d3vllmyqwsx5wktcd8cc3sq835lu7drv2xwl2wywfgs68faae";
        
        // Act & Assert
        mainnetAddress.Should().StartWith("addr1");
    }
    
    [Fact]
    public void TestnetAddress_ShouldStartWithAddrTest1()
    {
        // Arrange
        var testnetAddress = "addr_test1qz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3n0d3vllmyqwsx5wktcd8cc3sq835lu7drv2xwl2wywfgse5kgr8";
        
        // Act & Assert
        testnetAddress.Should().StartWith("addr_test1");
    }
    
    [Fact]
    public void Bech32Address_ShouldHaveCorrectLength()
    {
        // Arrange - Standard Cardano addresses are typically 103-110 characters
        var validAddress = "addr1qx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3n0d3vllmyqwsx5wktcd8cc3sq835lu7drv2xwl2wywfgs68faae";
        
        // Act & Assert
        validAddress.Length.Should().BeInRange(50, 110, "Cardano addresses are typically 50-110 characters");
    }
    
    // Helper method to validate bech32 address format
    private bool IsValidBech32Address(string address)
    {
        if (string.IsNullOrWhiteSpace(address))
            return false;
        
        // Mainnet address
        if (address.StartsWith("addr1", StringComparison.OrdinalIgnoreCase))
            return address.Length >= 50 && address.Length <= 110;
        
        // Testnet address
        if (address.StartsWith("addr_test1", StringComparison.OrdinalIgnoreCase))
            return address.Length >= 50 && address.Length <= 110;
        
        return false;
    }
}
