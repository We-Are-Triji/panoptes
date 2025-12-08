-- Migration: Add Circuit Breaker fields to WebhookSubscriptions
-- Date: 2025-12-08

-- Add circuit breaker tracking columns
ALTER TABLE WebhookSubscriptions ADD COLUMN ConsecutiveFailures INTEGER NOT NULL DEFAULT 0;
ALTER TABLE WebhookSubscriptions ADD COLUMN LastFailureAt TEXT NULL;
ALTER TABLE WebhookSubscriptions ADD COLUMN FirstFailureInWindowAt TEXT NULL;
ALTER TABLE WebhookSubscriptions ADD COLUMN IsCircuitBroken INTEGER NOT NULL DEFAULT 0; -- SQLite uses 0/1 for boolean
ALTER TABLE WebhookSubscriptions ADD COLUMN CircuitBrokenReason TEXT NULL;

-- Add retry metadata columns to DeliveryLogs
ALTER TABLE DeliveryLogs ADD COLUMN RetryAfterSeconds INTEGER NULL;
ALTER TABLE DeliveryLogs ADD COLUMN IsRateLimitRetry INTEGER NOT NULL DEFAULT 0; -- SQLite uses 0/1 for boolean

-- Create index for circuit breaker queries
CREATE INDEX IF NOT EXISTS IX_WebhookSubscriptions_CircuitBreaker 
ON WebhookSubscriptions(IsCircuitBroken, ConsecutiveFailures, LastFailureAt);

-- Create index for retry queries
CREATE INDEX IF NOT EXISTS IX_DeliveryLogs_RetryStatus 
ON DeliveryLogs(Status, NextRetryAt, RetryCount);
