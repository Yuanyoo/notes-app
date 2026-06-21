variable "env" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "image_tag" {
  description = "Docker image tag to deploy (usually git short SHA)"
  type        = string
  default     = "latest"
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t4g.micro"
}

variable "db_allocated_storage" {
  description = "RDS storage in GB"
  type        = number
  default     = 20
}

variable "backend_cpu" {
  description = "ECS task CPU units for backend"
  type        = number
  default     = 256
}

variable "backend_memory" {
  description = "ECS task memory in MB for backend"
  type        = number
  default     = 512
}

variable "frontend_cpu" {
  description = "ECS task CPU units for frontend"
  type        = number
  default     = 256
}

variable "frontend_memory" {
  description = "ECS task memory in MB for frontend"
  type        = number
  default     = 512
}

variable "cognito_domain_prefix" {
  description = "Prefix for the Cognito hosted UI domain"
  type        = string
  default     = "notes"
}
