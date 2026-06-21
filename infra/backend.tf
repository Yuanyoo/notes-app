# Remote state in S3 + DynamoDB lock.
# Create the bucket and table manually (or with a bootstrap script) before running terraform init.
#
# Example bootstrap:
#   aws s3api create-bucket --bucket notes-tfstate-<account_id> --region us-east-1
#   aws dynamodb create-table --table-name notes-tfstate-lock \
#     --attribute-definitions AttributeName=LockID,AttributeType=S \
#     --key-schema AttributeName=LockID,KeyType=HASH \
#     --billing-mode PAY_PER_REQUEST --region us-east-1

terraform {
  backend "s3" {
    # Override with -backend-config or environment variables when running:
    #   terraform init -backend-config="bucket=notes-tfstate-<account_id>"
    bucket         = "notes-tfstate-REPLACE_WITH_YOUR_ACCOUNT_ID"
    key            = "notes/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "notes-tfstate-lock"
    encrypt        = true
  }
}
