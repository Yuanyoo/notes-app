#!/usr/bin/env bash
# deploy.sh — Build, push, and deploy the Notes TurboAI stack to AWS ECS Fargate.
#
# Usage:
#   export AWS_PROFILE=notes-demo AWS_REGION=us-east-1 ENV=demo
#   bash scripts/deploy.sh
#
# AWS_PROFILE is optional — if unset, the default profile is used.
#
# Prerequisites:
#   - AWS CLI configured with permissions: ECR, ECS, Secrets Manager, SSM, IAM, VPC, RDS, Cognito, ALB
#   - Docker with buildx (multi-platform)
#   - Terraform >= 1.7 in PATH
#   - git in PATH

set -euo pipefail

: "${AWS_REGION:?Set AWS_REGION}"
: "${ENV:=dev}"

# Propagate AWS_PROFILE to Terraform and all AWS CLI calls
if [[ -n "${AWS_PROFILE:-}" ]]; then
  export AWS_PROFILE
  echo "==> Using AWS profile: ${AWS_PROFILE}"
fi

# Resolve account ID automatically if not set
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-$(aws sts get-caller-identity --query Account --output text)}"
export AWS_ACCOUNT_ID

ECR="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
TAG="$(git rev-parse --short HEAD)"
INFRA_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/infra"

echo "==> [1/6] Terraform init + first apply (provisions ECR repos, Cognito, VPC, RDS, ALB, ECS)"
(
  cd "$INFRA_DIR"
  terraform init \
    -backend-config="bucket=notes-tfstate-${AWS_ACCOUNT_ID}" \
    -backend-config="region=${AWS_REGION}"
  terraform apply -auto-approve \
    -var "image_tag=${TAG}" \
    -var "env=${ENV}" \
    -var "aws_region=${AWS_REGION}"
)

echo "==> [2/6] Login to ECR"
aws ecr get-login-password --region "${AWS_REGION}" \
  | docker login --username AWS --password-stdin "${ECR}"

echo "==> [3/6] Build + push backend and frontend images (linux/amd64)"
BACKEND_REPO="$(terraform -chdir="${INFRA_DIR}" output -raw backend_ecr_url)"
FRONTEND_REPO="$(terraform -chdir="${INFRA_DIR}" output -raw frontend_ecr_url)"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

for app in backend frontend; do
  repo_var="${app^^}_REPO"
  repo="${!repo_var}"
  echo "   Building ${app} → ${repo}:${TAG}"
  docker buildx build \
    --platform linux/amd64 \
    --provenance=false \
    -t "${repo}:${TAG}" \
    -t "${repo}:latest" \
    --push \
    "${ROOT}/${app}"
done

echo "==> [4/6] Terraform apply again (rolls task definitions to new image tag)"
(
  cd "$INFRA_DIR"
  terraform apply -auto-approve \
    -var "image_tag=${TAG}" \
    -var "env=${ENV}" \
    -var "aws_region=${AWS_REGION}"
)

echo "==> [5/6] Run database migrations as a one-off Fargate task"
CLUSTER="$(terraform -chdir="${INFRA_DIR}" output -raw ecs_cluster)"
TASK_DEF="$(terraform -chdir="${INFRA_DIR}" output -raw backend_task_def)"
NETWORK_CONFIG="$(terraform -chdir="${INFRA_DIR}" output -raw migrate_network_config)"

TASK_ARN="$(aws ecs run-task \
  --cluster "${CLUSTER}" \
  --task-definition "${TASK_DEF}" \
  --launch-type FARGATE \
  --network-configuration "${NETWORK_CONFIG}" \
  --overrides '{"containerOverrides":[{"name":"backend","command":["python","manage.py","migrate","--noinput"]}]}' \
  --query "tasks[0].taskArn" \
  --output text)"

echo "   Waiting for migrate task to complete: ${TASK_ARN}"
aws ecs wait tasks-stopped --cluster "${CLUSTER}" --tasks "${TASK_ARN}"

EXIT_CODE="$(aws ecs describe-tasks \
  --cluster "${CLUSTER}" \
  --tasks "${TASK_ARN}" \
  --query "tasks[0].containers[0].exitCode" \
  --output text)"

if [[ "${EXIT_CODE}" != "0" ]]; then
  echo "ERROR: Migration task exited with code ${EXIT_CODE}. Check CloudWatch logs." >&2
  exit 1
fi
echo "   Migrations completed successfully."

echo "==> [6/6] Force-deploy both ECS services"
for svc in backend frontend; do
  aws ecs update-service \
    --cluster "${CLUSTER}" \
    --service "notes-${ENV}-${svc}" \
    --force-new-deployment \
    --output text --query "service.serviceName" | xargs -I{} echo "   Redeploying: {}"
done

echo ""
echo "✓ Deploy complete!"
echo "  App URL: $(terraform -chdir="${INFRA_DIR}" output -raw alb_dns)"
