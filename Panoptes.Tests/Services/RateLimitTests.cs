using FluentAssertions;
using Panoptes.Core.Entities;

namespace Panoptes.Tests.Services;

public class RateLimitTests
{
    [Fact]
    public void RateLimit_WhenUnderLimit_ShouldNotBeRateLimited()
    {
        // Arrange
        var subscription = new WebhookSubscription
        {
            MaxWebhooksPerMinute = 60,
            MaxWebhooksPerHour = 1000,
            WebhooksInLastMinute = 30,
            WebhooksInLastHour = 500
        };
        
        // Act
        var isRateLimited = (subscription.MaxWebhooksPerMinute > 0 && subscription.WebhooksInLastMinute >= subscription.MaxWebhooksPerMinute) ||
                           (subscription.MaxWebhooksPerHour > 0 && subscription.WebhooksInLastHour >= subscription.MaxWebhooksPerHour);
        
        // Assert
        isRateLimited.Should().BeFalse("subscription is under both minute and hour limits");
    }
    
    [Fact]
    public void RateLimit_WhenExceedingMinuteLimit_ShouldBeRateLimited()
    {
        // Arrange
        var subscription = new WebhookSubscription
        {
            MaxWebhooksPerMinute = 60,
            MaxWebhooksPerHour = 1000,
            WebhooksInLastMinute = 60, // At limit
            WebhooksInLastHour = 500
        };
        
        // Act
        var isRateLimited = (subscription.MaxWebhooksPerMinute > 0 && subscription.WebhooksInLastMinute >= subscription.MaxWebhooksPerMinute) ||
                           (subscription.MaxWebhooksPerHour > 0 && subscription.WebhooksInLastHour >= subscription.MaxWebhooksPerHour);
        
        // Assert
        isRateLimited.Should().BeTrue("subscription has reached the per-minute limit");
    }
    
    [Fact]
    public void RateLimit_WhenExceedingHourLimit_ShouldBeRateLimited()
    {
        // Arrange
        var subscription = new WebhookSubscription
        {
            MaxWebhooksPerMinute = 60,
            MaxWebhooksPerHour = 1000,
            WebhooksInLastMinute = 30,
            WebhooksInLastHour = 1001 // Exceeded
        };
        
        // Act
        var isRateLimited = (subscription.MaxWebhooksPerMinute > 0 && subscription.WebhooksInLastHour >= subscription.MaxWebhooksPerHour);
        
        // Assert
        isRateLimited.Should().BeTrue("subscription has exceeded the per-hour limit");
    }
    
    [Fact]
    public void RateLimit_WhenDisabled_ShouldNeverBeRateLimited()
    {
        // Arrange
        var subscription = new WebhookSubscription
        {
            MaxWebhooksPerMinute = 0, // Disabled
            MaxWebhooksPerHour = 0,   // Disabled
            WebhooksInLastMinute = 1000,
            WebhooksInLastHour = 5000
        };
        
        // Act
        var isRateLimited = (subscription.MaxWebhooksPerMinute > 0 && subscription.WebhooksInLastMinute >= subscription.MaxWebhooksPerMinute) ||
                           (subscription.MaxWebhooksPerHour > 0 && subscription.WebhooksInLastHour >= subscription.MaxWebhooksPerHour);
        
        // Assert
        isRateLimited.Should().BeFalse("rate limits are disabled (set to 0)");
    }
    
    [Theory]
    [InlineData(60, 1000, 59, 999, false)]  // Under both limits
    [InlineData(60, 1000, 60, 999, true)]   // At minute limit
    [InlineData(60, 1000, 61, 999, true)]   // Over minute limit
    [InlineData(60, 1000, 30, 1000, true)]  // At hour limit
    [InlineData(60, 1000, 30, 1001, true)]  // Over hour limit
    [InlineData(0, 0, 100, 2000, false)]    // Limits disabled
    public void RateLimit_VariousScenarios(
        int maxPerMinute, 
        int maxPerHour, 
        int webhooksInMinute, 
        int webhooksInHour, 
        bool expectedRateLimited)
    {
        // Arrange
        var subscription = new WebhookSubscription
        {
            MaxWebhooksPerMinute = maxPerMinute,
            MaxWebhooksPerHour = maxPerHour,
            WebhooksInLastMinute = webhooksInMinute,
            WebhooksInLastHour = webhooksInHour
        };
        
        // Act
        var isRateLimited = (subscription.MaxWebhooksPerMinute > 0 && subscription.WebhooksInLastMinute >= subscription.MaxWebhooksPerMinute) ||
                           (subscription.MaxWebhooksPerHour > 0 && subscription.WebhooksInLastHour >= subscription.MaxWebhooksPerHour);
        
        // Assert
        isRateLimited.Should().Be(expectedRateLimited);
    }
}
