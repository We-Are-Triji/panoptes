terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "ap-southeast-1"
}

# Add this variable block to main.tf
variable "aws_region" {
  type    = string
  default = "ap-southeast-1"
}

# --- VARIABLES (Pass these via CLI or .tfvars) ---
variable "google_client_id" {
  type      = string
  sensitive = true
}

variable "google_client_secret" {
  type      = string
  sensitive = true
}

# 1. The User Pool
resource "aws_cognito_user_pool" "panoptes_pool" {
  name = "panoptes-users"

  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = false
    require_uppercase = true
  }

  admin_create_user_config {
    allow_admin_create_user_only = false
  }
}

# 2. Google Identity Provider Configuration
resource "aws_cognito_identity_provider" "google_provider" {
  user_pool_id  = aws_cognito_user_pool.panoptes_pool.id
  provider_name = "Google"
  provider_type = "Google"

  provider_details = {
    authorize_scopes = "email profile openid"
    client_id        = var.google_client_id
    client_secret    = var.google_client_secret
  }

  attribute_mapping = {
    email    = "email"
    username = "sub" # Map Google ID to Cognito Username
  }
}

# 3. Cognito Domain (Required for Social Login to work)
# This creates https://panoptes-dev-{random}.auth.ap-southeast-1.amazoncognito.com
resource "aws_cognito_user_pool_domain" "panoptes_domain" {
  domain       = "panoptes-dev-${random_string.suffix.result}"
  user_pool_id = aws_cognito_user_pool.panoptes_pool.id
}

resource "random_string" "suffix" {
  length  = 6
  special = false
  upper   = false
}

# 4. The App Client (Updated for OAuth)
resource "aws_cognito_user_pool_client" "panoptes_client" {
  name = "panoptes-frontend"

  user_pool_id = aws_cognito_user_pool.panoptes_pool.id
  
  # OAuth Configuration
  generate_secret = false
  
  # IMPORTANT: These must match your Frontend URL exactly
  callback_urls = ["http://localhost:5173/"]
  logout_urls   = ["http://localhost:5173/"]

  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code"] # 'code' is best practice for security
  allowed_oauth_scopes                 = ["email", "openid", "profile"]
  
  # Link Google to this client
  supported_identity_providers = ["COGNITO", "Google"]
  
  # Explicit dependency to ensure Google is ready before Client links it
  depends_on = [aws_cognito_identity_provider.google_provider]
}

# 5. Outputs
output "cognito_user_pool_id" {
  value = aws_cognito_user_pool.panoptes_pool.id
}

output "cognito_client_id" {
  value = aws_cognito_user_pool_client.panoptes_client.id
}

output "cognito_domain" {
  value = "https://${aws_cognito_user_pool_domain.panoptes_domain.domain}.auth.${var.aws_region}.amazoncognito.com"
}