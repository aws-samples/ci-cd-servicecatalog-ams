/**
 * Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this
 * software and associated documentation files (the "Software"), to deal in the Software
 * without restriction, including without limitation the rights to use, copy, modify,
 * merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */


import iam = require('@aws-cdk/aws-iam')
import { Construct } from '@aws-cdk/core';
export default class CodeBuildRole extends iam.Role {
  constructor(scope: Construct, name: string, {}) {
    
    super(scope, name, {
      roleName: "Service-Catalog-Launch-Role",
      assumedBy: new iam.ServicePrincipal('servicecatalog.amazonaws.com'),
    
    })
   
    this.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions:[
          "cloudformation:DescribeStackResource",
          "cloudformation:DescribeStackResources",
          "cloudformation:GetTemplate",
          "cloudformation:List*",
          "cloudformation:DescribeStackEvents",
          "cloudformation:DescribeStacks",
          "cloudformation:CreateStack",
          "cloudformation:DeleteStack",
          "cloudformation:DescribeStackEvents",
          "cloudformation:DescribeStacks",
          "cloudformation:GetTemplateSummary",
          "cloudformation:SetStackPolicy",
          "cloudformation:ValidateTemplate",
          "cloudformation:UpdateStack",
          "cloudformation:CreateChangeSet",
          "cloudformation:DescribeChangeSet",
          "cloudformation:ExecuteChangeSet",
          "cloudformation:DeleteChangeSet",
          "lambda:ListVersionsByFunction",
          "lambda:GetLayerVersion",
          "lambda:GetAccountSettings",
          "lambda:GetFunctionConfiguration",
          "lambda:GetLayerVersionPolicy",
          "lambda:ListProvisionedConcurrencyConfigs",
          "lambda:GetProvisionedConcurrencyConfig",
          "lambda:ListTags",
          "lambda:ListLayerVersions",
          "lambda:ListLayers",
          "lambda:ListCodeSigningConfigs",
          "lambda:GetAlias",
          "lambda:ListFunctions",
          "lambda:GetEventSourceMapping",
          "lambda:InvokeFunction",
          "lambda:GetFunction",
          "lambda:ListAliases",
          "lambda:GetFunctionCodeSigningConfig",
          "lambda:ListFunctionEventInvokeConfigs",
          "lambda:ListFunctionsByCodeSigningConfig",
          "lambda:GetFunctionConcurrency",
          "lambda:GetFunctionEventInvokeConfig",
          "lambda:ListEventSourceMappings",
          "lambda:GetCodeSigningConfig",
          "lambda:GetPolicy",
          "s3:GetObjectVersionTagging",
          "s3:GetStorageLensConfigurationTagging",
          "s3:GetObjectAcl",
          "s3:GetBucketObjectLockConfiguration",
          "s3:GetIntelligentTieringConfiguration",
          "s3:GetObjectVersionAcl",
          "s3:GetBucketPolicyStatus",
          "s3:GetObjectRetention",
          "s3:GetBucketWebsite",
          "s3:GetJobTagging",
          "s3:ListJobs",
          "s3:GetObjectLegalHold",
          "s3:GetBucketNotification",
          "s3:GetReplicationConfiguration",
          "s3:ListMultipartUploadParts",
          "s3:GetObject",
          "s3:DescribeJob",
          "s3:GetAnalyticsConfiguration",
          "s3:GetObjectVersionForReplication",
          "s3:GetStorageLensDashboard",
          "s3:GetLifecycleConfiguration",
          "s3:GetAccessPoint",
          "s3:GetInventoryConfiguration",
          "s3:GetBucketTagging",
          "s3:GetBucketLogging",
          "s3:ListBucketVersions",
          "s3:ListBucket",
          "s3:GetAccelerateConfiguration",
          "s3:GetBucketPolicy",
          "s3:GetEncryptionConfiguration",
          "s3:GetObjectVersionTorrent",
          "s3:GetBucketRequestPayment",
          "s3:GetAccessPointPolicyStatus",
          "s3:GetObjectTagging",
          "s3:GetMetricsConfiguration",
          "s3:GetBucketOwnershipControls",
          "s3:GetBucketPublicAccessBlock",
          "s3:ListBucketMultipartUploads",
          "s3:ListAccessPoints",
          "s3:GetBucketVersioning",
          "s3:GetBucketAcl",
          "s3:ListStorageLensConfigurations",
          "s3:GetObjectTorrent",
          "s3:GetStorageLensConfiguration",
          "s3:GetAccountPublicAccessBlock",
          "s3:ListAllMyBuckets",
          "s3:GetBucketCORS",
          "s3:GetBucketLocation",
          "s3:GetAccessPointPolicy",
          "s3:GetObjectVersion",
          "servicecatalog:ListServiceActionsForProvisioningArtifact",
          "servicecatalog:ExecuteprovisionedProductServiceAction",
          "ssm:DescribeDocument",
          "ssm:GetAutomationExecution",
          "ssm:StartAutomationExecution",
          "ssm:StopAutomationExecution",
          "cloudformation:ListStackResources",
          "ec2:DescribeInstanceStatus",
          "ec2:StartInstances",
          "ec2:StopInstances"
        ],
        resources: ["*"]
      })
    ) 

  }
}