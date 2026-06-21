output "dns_name"       { value = aws_lb.main.dns_name }
output "backend_tg_arn"  { value = aws_lb_target_group.backend.arn }
output "frontend_tg_arn" { value = aws_lb_target_group.frontend.arn }
