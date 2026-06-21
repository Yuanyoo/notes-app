output "alb_dns" {
  description = "Public ALB DNS name — the app URL"
  value       = "http://${module.alb.dns_name}/"
}

output "ecs_cluster" {
  description = "ECS cluster name (used by deploy.sh)"
  value       = module.ecs.cluster_name
}

output "backend_task_def" {
  description = "Backend task definition ARN (used for migrate task)"
  value       = module.ecs.backend_task_def_arn
}

output "migrate_network_config" {
  description = "Network config JSON for one-off migrate task"
  value = jsonencode({
    awsvpcConfiguration = {
      subnets        = module.network.private_subnet_ids
      securityGroups = [module.network.backend_sg_id]
      assignPublicIp = "DISABLED"
    }
  })
}

output "backend_ecr_url" {
  value = module.ecr.backend_repo_url
}

output "frontend_ecr_url" {
  value = module.ecr.frontend_repo_url
}

output "cognito_user_pool_id" {
  value = module.auth.user_pool_id
}

output "cognito_client_id" {
  value = module.auth.client_id
}

output "cognito_domain" {
  value = module.auth.domain
}

output "cognito_issuer" {
  value = module.auth.issuer
}

output "cognito_jwks_uri" {
  value = module.auth.jwks_uri
}
