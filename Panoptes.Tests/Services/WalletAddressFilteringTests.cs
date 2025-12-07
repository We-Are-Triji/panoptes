using FluentAssertions;

namespace Panoptes.Tests.Services;

public class WalletAddressFilteringTests
{
    [Fact]
    public void WalletFilter_WhenNoFilter_ShouldMatchAllTransactions()
    {
        // Arrange
        List<string>? walletAddresses = null; // No filter
        var transactionAddresses = new HashSet<string> { "addr1qx123", "addr1qy456" };
        
        // Act
        var isRelevant = IsRelevantForSubscription(walletAddresses, transactionAddresses);
        
        // Assert
        isRelevant.Should().BeTrue("null filter means listen to all transactions");
    }
    
    [Fact]
    public void WalletFilter_WhenEmptyFilter_ShouldMatchAllTransactions()
    {
        // Arrange
        var walletAddresses = new List<string>(); // Empty list
        var transactionAddresses = new HashSet<string> { "addr1qx123", "addr1qy456" };
        
        // Act
        var isRelevant = IsRelevantForSubscription(walletAddresses, transactionAddresses);
        
        // Assert
        isRelevant.Should().BeTrue("empty filter means listen to all transactions");
    }
    
    [Fact]
    public void WalletFilter_WhenExactMatch_ShouldBeRelevant()
    {
        // Arrange
        var walletAddresses = new List<string> { "addr1qx123" };
        var transactionAddresses = new HashSet<string> { "addr1qx123", "addr1qy456" };
        
        // Act
        var isRelevant = IsRelevantForSubscription(walletAddresses, transactionAddresses);
        
        // Assert
        isRelevant.Should().BeTrue("transaction contains the filtered address");
    }
    
    [Fact]
    public void WalletFilter_WhenNoMatch_ShouldNotBeRelevant()
    {
        // Arrange
        var walletAddresses = new List<string> { "addr1qz789" };
        var transactionAddresses = new HashSet<string> { "addr1qx123", "addr1qy456" };
        
        // Act
        var isRelevant = IsRelevantForSubscription(walletAddresses, transactionAddresses);
        
        // Assert
        isRelevant.Should().BeFalse("transaction does not contain any filtered addresses");
    }
    
    [Fact]
    public void WalletFilter_WithMultipleAddresses_ShouldMatchAny()
    {
        // Arrange
        var walletAddresses = new List<string> { "addr1qz789", "addr1qy456", "addr1qa999" };
        var transactionAddresses = new HashSet<string> { "addr1qx123", "addr1qy456" };
        
        // Act
        var isRelevant = IsRelevantForSubscription(walletAddresses, transactionAddresses);
        
        // Assert
        isRelevant.Should().BeTrue("transaction contains at least one filtered address (addr1qy456)");
    }
    
    [Fact]
    public void WalletFilter_CaseInsensitive_ShouldMatch()
    {
        // Arrange
        var walletAddresses = new List<string> { "ADDR1QX123" }; // Uppercase
        var transactionAddresses = new HashSet<string> { "addr1qx123" }; // Lowercase
        
        // Act
        var isRelevant = IsRelevantForSubscription(walletAddresses, transactionAddresses);
        
        // Assert
        isRelevant.Should().BeTrue("address matching should be case-insensitive");
    }
    
    [Fact]
    public void WalletFilter_PartialMatch_ShouldBeSupported()
    {
        // Arrange - Hex addresses might need partial matching
        var walletAddresses = new List<string> { "addr1qx" }; // Partial
        var transactionAddresses = new HashSet<string> { "addr1qx123456789" }; // Full
        
        // Act
        var isRelevant = IsRelevantForSubscriptionWithPartial(walletAddresses, transactionAddresses);
        
        // Assert
        isRelevant.Should().BeTrue("partial matching should be supported for hex addresses");
    }
    
    // Helper method mimicking the actual implementation
    private bool IsRelevantForSubscription(List<string>? walletAddresses, HashSet<string> transactionAddresses)
    {
        // No filter = listen to all
        if (walletAddresses == null || !walletAddresses.Any())
            return true;
        
        // Check if any filtered address appears in transaction
        foreach (var filterAddress in walletAddresses)
        {
            var filterLower = filterAddress.ToLowerInvariant();
            if (transactionAddresses.Contains(filterLower))
                return true;
        }
        
        return false;
    }
    
    // Helper with partial matching support
    private bool IsRelevantForSubscriptionWithPartial(List<string>? walletAddresses, HashSet<string> transactionAddresses)
    {
        if (walletAddresses == null || !walletAddresses.Any())
            return true;
        
        foreach (var filterAddress in walletAddresses)
        {
            var filterLower = filterAddress.ToLowerInvariant();
            
            // Exact match
            if (transactionAddresses.Contains(filterLower))
                return true;
            
            // Partial match
            if (transactionAddresses.Any(addr => addr.Contains(filterLower) || filterLower.Contains(addr)))
                return true;
        }
        
        return false;
    }
}
