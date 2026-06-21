locals {
  region = data.aws_region.current.name
}

data "aws_region" "current" {}

output "user_pool_id" { value = aws_cognito_user_pool.main.id }
output "client_id"    { value = aws_cognito_user_pool_client.main.id }
output "domain"       { value = "${aws_cognito_user_pool_domain.main.domain}.auth.${local.region}.amazoncognito.com" }
output "issuer"       { value = "https://cognito-idp.${local.region}.amazonaws.com/${aws_cognito_user_pool.main.id}" }
output "jwks_uri"     { value = "https://cognito-idp.${local.region}.amazonaws.com/${aws_cognito_user_pool.main.id}/.well-known/jwks.json" }
