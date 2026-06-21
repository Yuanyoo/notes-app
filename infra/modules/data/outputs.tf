output "db_endpoint"      { value = aws_db_instance.main.endpoint }
output "db_secret_arn"    { value = aws_secretsmanager_secret.db.arn }
output "django_secret_arn" { value = aws_secretsmanager_secret.django.arn }
