# Metadata Discovery

Thunder implements an "SST-style" discovery mechanism to enable the Thunder CLI and potential future Thunder Console to automatically identify and interact with deployed resources without relying on manual tagging or complex CloudFormation stack queries.

## How Thunder Tags Deployments

Thunder uses a state-based approach rather than traditional AWS resource tags for discovery.

### State Storage
When you deploy a Thunder service, it automatically stores its deployment state in a centralized S3 bucket named `thunder-metadata-<account>-<region>`.

### Key Structure
Metadata files are stored with the following hierarchy:
```
apps/<application>/<environment>/<service>/metadata.json
```

### Metadata Content
The `metadata.json` file contains a standardized set of properties that align with the service's `CfnOutput` names:
```json
{
  "id": "myapp-prod-web",
  "application": "myapp",
  "service": "web",
  "environment": "prod",
  "region": "us-east-1",
  "created_at": "2026-03-27T12:00:00.000Z",
  "type": "Nuxt",
  "DistributionId": "E1234567890",
  "DistributionUrl": "https://d123.cloudfront.net",
  "Route53Domain": "https://myapp.com",
  "CodePipelineName": "myapp-prod-web-pipeline"
}
```

### Audit Trail
Thunder tracks deployment lifecycle with timestamps:
- **`created_at`**: Set when the stack is first deployed
- **`updated_at`**: Added when the stack is updated (only present after updates)
- **`deleted_at`**: Added when the stack is deleted (file remains in S3 for history)

**Note**: Due to CloudFormation limitations, `created_at` is not preserved during updates/deletes. Each timestamp represents the time of that specific action.

## How the CLI/Console Discovers Apps

1. **Bucket Resolution**: The tool determines the discovery bucket name based on the current AWS account and region.
2. **S3 Scanning**: It lists the objects in the bucket under the `apps/` prefix.
3. **Metadata Parsing**: It reads the `metadata.json` files to discover:
   - All deployed Thunder apps
   - Their environments/stages
   - Their individual services and associated resource IDs/URLs
4. **Automatic Discovery**: Because the `MetadataConstruct` is embedded in every Thunder stack, new services and updates are automatically reflected in S3 upon successful deployment.

## Implementation Details

### MetadataConstruct
- **Location**: `lib/constructs/metadata.ts`
- **Used by**: All Thunder stacks (Static, Lambda, Fargate, EC2, Nuxt, Astro, VPC, Template)

### Bucket Creation
- Uses `AwsCustomResource` to create the metadata bucket if it doesn't exist
- Idempotent: Ignores `BucketAlreadyOwnedByYou` and `BucketAlreadyExists` errors
- Shared across all Thunder stacks in the same account/region
- Never deleted by Thunder (RETAIN policy)

### Initial Deployment
- Uses `BucketDeployment` to upload `Source.jsonData` during CDK deployment
- Sets `created_at` timestamp
- `retainOnDelete: true` to preserve metadata history

### Update/Delete Tracking
- Uses `AwsCustomResource` with `onUpdate` and `onDelete` hooks
- `onUpdate`: Overwrites metadata.json with `updated_at` timestamp
- `onDelete`: Overwrites metadata.json with `deleted_at` timestamp
- File remains in S3 after stack deletion

### Metadata Fields
Standardized field names aligned with `CfnOutput` logical IDs:
- App identity: `application`, `service`, `environment`, `region`
- Timestamps: `created_at`, `updated_at`, `deleted_at`
- Resource IDs/URLs: `DistributionId`, `ServiceUrl`, `LoadBalancerDNS`, etc.
- Framework-specific: `type`, `TemplateSlug`, etc.
- Integration: `Route53Domain`, `CodePipelineName`

## Bucket Lifecycle

- **Creation**: Automatic on first deployment to an account/region
- **Sharing**: Multiple Thunder stacks share the same metadata bucket
- **Retention**: Bucket is never deleted by Thunder
- **Permissions**: Minimal IAM (S3 create/read/write only)

## Technical Architecture

### Bucket Creation
```typescript
AwsCustomResource with onCreate: S3.createBucket
- Ignores BucketAlreadyOwnedByYou/BucketAlreadyExists errors
- Idempotent across multiple stacks
- installLatestAwsSdk: false (uses Lambda built-in SDK)
```

### Metadata Writing
```typescript
1. BucketDeployment (onCreate)
   - Writes initial metadata.json with created_at

2. AwsCustomResource (onUpdate)
   - Overwrites metadata.json with updated_at

3. AwsCustomResource (onDelete)
   - Overwrites metadata.json with deleted_at
   - File retained in S3 (retainOnDelete: true)
```

## Known Limitations

1. **Timestamp Preservation**: `created_at` is not preserved during stack updates or deletes due to CloudFormation's stateless nature. To preserve it would require a Lambda function with read-merge-write logic.

2. **Concurrent Updates**: If multiple stacks update simultaneously, the last write wins (S3 eventual consistency).

3. **Manual Cleanup**: Deleted stack metadata remains in S3 indefinitely (marked with `deleted_at`). Manual cleanup may be needed for long-term maintenance.

## Future Enhancements

- [ ] Lambda-based metadata writer to preserve `created_at` across updates
- [ ] Metadata versioning (keep history of all updates)
- [ ] CLI commands to query and manage metadata
- [ ] Thunder Console integration for visual discovery
- [ ] Automatic cleanup of old deleted stack metadata

## SST Comparison

Thunder's metadata system is inspired by SST's discovery mechanism:

### SST Approach
- Management stack in us-east-1 scans all regions
- Finds CloudFormation stacks by naming convention
- Reads metadata from S3 state buckets
- Console subscribes to stack events for real-time updates
- Stores additional metadata on sst.dev (hosted)

### Thunder Approach
- Simpler: No management stack required
- Direct S3 metadata storage per stack
- CLI/Console reads directly from S3
- Self-contained: All metadata in your AWS account
- No external dependencies

Both approaches enable automatic discovery without manual tagging or complex CloudFormation queries.
