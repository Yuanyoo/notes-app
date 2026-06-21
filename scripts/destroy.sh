#!/usr/bin/env bash
# destroy.sh — Tear down all AWS resources for the Notes TurboAI stack.
#
# WARNING: This deletes the RDS database and all data. There is no undo.
#
# Usage:
#   export AWS_PROFILE=notes-demo AWS_REGION=us-east-1 ENV=demo
#   bash scripts/destroy.sh

set -euo pipefail

: "${AWS_REGION:?Set AWS_REGION}"
: "${ENV:=dev}"

# ---------------------------------------------------------------------------
# aws() wrapper — every AWS CLI call uses the explicit --profile flag.
# ---------------------------------------------------------------------------
aws() {
  if [[ -n "${AWS_PROFILE:-}" ]]; then
    command aws --profile "${AWS_PROFILE}" "$@"
  else
    command aws "$@"
  fi
}
export -f aws

if [[ -n "${AWS_PROFILE:-}" ]]; then
  export AWS_PROFILE
  echo "==> Using AWS profile: ${AWS_PROFILE}"
else
  echo "==> Using default AWS profile"
fi

CALLER_IDENTITY="$(aws sts get-caller-identity --output json)"
AWS_ACCOUNT_ID="$(echo "${CALLER_IDENTITY}" | python3 -c 'import sys,json; print(json.load(sys.stdin)["Account"])')"
CALLER_ARN="$(echo "${CALLER_IDENTITY}"     | python3 -c 'import sys,json; print(json.load(sys.stdin)["Arn"])')"
export AWS_ACCOUNT_ID

echo "==> Targeting account: ${AWS_ACCOUNT_ID}  (${CALLER_ARN})"
echo "==> Region: ${AWS_REGION}  |  Env: ${ENV}"

INFRA_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/infra"

echo "WARNING: This will destroy ALL AWS resources for env=${ENV}."
echo "Including the RDS database and all stored notes."
read -r -p "Type 'yes' to confirm: " confirm
[[ "${confirm}" == "yes" ]] || { echo "Aborted."; exit 1; }

# ECR repos must be emptied before terraform destroy
echo "==> Emptying ECR repositories…"
BACKEND_REPO="$(terraform -chdir="${INFRA_DIR}" output -raw backend_ecr_url 2>/dev/null || true)"
FRONTEND_REPO="$(terraform -chdir="${INFRA_DIR}" output -raw frontend_ecr_url 2>/dev/null || true)"

for repo_url in "$BACKEND_REPO" "$FRONTEND_REPO"; do
  [[ -z "$repo_url" ]] && continue
  repo_name="${repo_url##*/}"
  image_ids="$(aws ecr list-images --repository-name "${repo_name}" --region "${AWS_REGION}" \
    --query 'imageIds[*]' --output json 2>/dev/null || echo "[]")"
  if [[ "$image_ids" != "[]" ]]; then
    aws ecr batch-delete-image \
      --repository-name "${repo_name}" \
      --region "${AWS_REGION}" \
      --image-ids "${image_ids}" \
      --output text --query 'failures' > /dev/null
    echo "   Cleared: ${repo_name}"
  fi
done

echo "==> Running terraform destroy…"
(
  cd "$INFRA_DIR"
  terraform init \
    -backend-config="bucket=notes-tfstate-${AWS_ACCOUNT_ID}" \
    -backend-config="region=${AWS_REGION}"
  terraform destroy -auto-approve \
    -var "env=${ENV}" \
    -var "aws_region=${AWS_REGION}"
)

echo ""
echo "✓ All resources destroyed."
