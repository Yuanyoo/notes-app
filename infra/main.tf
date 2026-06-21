terraform {
  required_version = ">= 1.7"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project = "notes"
      Env     = var.env
      ManagedBy = "terraform"
    }
  }
}

locals {
  name = "notes-${var.env}"
}

# ── Modules ──────────────────────────────────────────────────────────────────

module "network" {
  source = "./modules/network"
  name   = local.name
  env    = var.env
}

module "ecr" {
  source = "./modules/ecr"
  name   = local.name
}

module "auth" {
  source              = "./modules/auth"
  name                = local.name
  env                 = var.env
  app_url             = "http://${module.alb.dns_name}"
  domain_prefix       = "${var.cognito_domain_prefix}-${var.env}"
}

module "data" {
  source             = "./modules/data"
  name               = local.name
  env                = var.env
  vpc_id             = module.network.vpc_id
  private_subnet_ids = module.network.private_subnet_ids
  rds_sg_id          = module.network.rds_sg_id
  db_instance_class  = var.db_instance_class
  allocated_storage  = var.db_allocated_storage
}

module "alb" {
  source            = "./modules/alb"
  name              = local.name
  vpc_id            = module.network.vpc_id
  public_subnet_ids = module.network.public_subnet_ids
  alb_sg_id         = module.network.alb_sg_id
}

module "ecs" {
  source              = "./modules/ecs"
  name                = local.name
  env                 = var.env
  aws_region          = var.aws_region
  vpc_id              = module.network.vpc_id
  private_subnet_ids  = module.network.private_subnet_ids
  backend_sg_id       = module.network.backend_sg_id
  frontend_sg_id      = module.network.frontend_sg_id

  backend_image       = "${module.ecr.backend_repo_url}:${var.image_tag}"
  frontend_image      = "${module.ecr.frontend_repo_url}:${var.image_tag}"

  backend_tg_arn      = module.alb.backend_tg_arn
  frontend_tg_arn     = module.alb.frontend_tg_arn

  db_secret_arn       = module.data.db_secret_arn
  django_secret_arn   = module.data.django_secret_arn

  cognito_region      = var.aws_region
  cognito_user_pool_id = module.auth.user_pool_id
  cognito_client_id   = module.auth.client_id
  cognito_domain      = module.auth.domain
  cognito_issuer      = module.auth.issuer
  cognito_jwks_uri    = module.auth.jwks_uri

  alb_dns_name        = module.alb.dns_name

  backend_cpu         = var.backend_cpu
  backend_memory      = var.backend_memory
  frontend_cpu        = var.frontend_cpu
  frontend_memory     = var.frontend_memory
}
