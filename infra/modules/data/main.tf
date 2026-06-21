resource "random_password" "db" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "random_password" "django_secret" {
  length  = 50
  special = true
}

resource "aws_db_subnet_group" "main" {
  name       = var.name
  subnet_ids = var.private_subnet_ids
  tags       = { Name = var.name }
}

resource "aws_db_instance" "main" {
  identifier             = var.name
  engine                 = "postgres"
  engine_version         = "16"
  instance_class         = var.db_instance_class
  allocated_storage      = var.allocated_storage
  storage_type           = "gp3"
  db_name                = "notes"
  username               = "notes"
  password               = random_password.db.result
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [var.rds_sg_id]
  publicly_accessible    = false
  skip_final_snapshot    = true
  deletion_protection    = false
  backup_retention_period = 7
  storage_encrypted      = true
  tags                   = { Name = var.name }
}

resource "aws_secretsmanager_secret" "db" {
  name                    = "${var.name}/db"
  recovery_window_in_days = 0
  tags                    = { Name = "${var.name}/db" }
}

resource "aws_secretsmanager_secret_version" "db" {
  secret_id = aws_secretsmanager_secret.db.id
  secret_string = jsonencode({
    DATABASE_URL = "postgres://${aws_db_instance.main.username}:${random_password.db.result}@${aws_db_instance.main.endpoint}/notes"
  })
}

resource "aws_secretsmanager_secret" "django" {
  name                    = "${var.name}/django"
  recovery_window_in_days = 0
  tags                    = { Name = "${var.name}/django" }
}

resource "aws_secretsmanager_secret_version" "django" {
  secret_id = aws_secretsmanager_secret.django.id
  secret_string = jsonencode({
    SECRET_KEY = random_password.django_secret.result
  })
}
