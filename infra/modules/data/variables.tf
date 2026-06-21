variable "name"               { type = string }
variable "env"                { type = string }
variable "vpc_id"             { type = string }
variable "private_subnet_ids" { type = list(string) }
variable "rds_sg_id"          { type = string }
variable "db_instance_class"  { type = string }
variable "allocated_storage"  { type = number }
