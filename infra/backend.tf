# Remote state in S3 with native S3 locking (no DynamoDB table required).
# Create the S3 bucket before running terraform init:
#   aws s3api create-bucket --bucket notes-tfstate-<account_id> --region us-east-1
#   aws s3api put-bucket-versioning --bucket notes-tfstate-<account_id> \
#     --versioning-configuration Status=Enabled

terraform {
  backend "s3" {
    # Override with -backend-config when running:
    #   terraform init -backend-config="bucket=notes-tfstate-<account_id>"
    bucket       = "notes-tfstate-REPLACE_WITH_YOUR_ACCOUNT_ID"
    key          = "notes/terraform.tfstate"
    region       = "us-east-1"
    use_lockfile = true
    encrypt      = true
  }
}
