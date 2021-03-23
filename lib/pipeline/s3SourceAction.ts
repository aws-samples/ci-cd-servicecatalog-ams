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
import cdk = require('@aws-cdk/core');
import codebuild = require('@aws-cdk/aws-codebuild');
import { Artifact } from '@aws-cdk/aws-codepipeline';
import { CfnOutput } from '@aws-cdk/core';
import  pipelineRole  from '../iam/iam';
import * as lambda from '@aws-cdk/aws-lambda';
import scRoles from '../iam/snowrole';
import scLaunchRole from '../iam/sclaunch';
import * as s3 from '@aws-cdk/aws-s3';
import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as actions from '@aws-cdk/aws-codepipeline-actions';
import * as sns from '@aws-cdk/aws-sns';
import * as s3deploy from  "@aws-cdk/aws-s3-deployment";
import * as sc from "@aws-cdk/aws-servicecatalog";
import { CfnParameter } from '@aws-cdk/core';
import lambdaRole from '../iam/lambda_role'


export class CICDPipeline extends cdk.Stack{

    constructor(scope: cdk.Construct, id: string, {} ){
      
      super(scope, id, {});

      const crossaccount = new CfnParameter(this, 'crossAccountRole',{
        type: "String",
        description: "Cross Account Role"
    });
    
    const launchRole = new CfnParameter(this, 'LaunchRole',{
        type: "String",
        description: "Cross Account Role"
    });

    const bucketname = new CfnParameter(this, 'bucketname',{
      type: "String",
      description: "Cross Account Role"
  });

        const source_bucket = new s3.Bucket(this, 'MyFirstBucket',{
          bucketName: "sc-bucket-"+this.account,
          versioned: true,
          removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        const source_bucket1 = new s3.Bucket(this, 'MyFirstBucket1',{
          bucketName: "sc-service-catalog-bucket-"+this.account,
          versioned: true,
          removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

    
        new s3deploy.BucketDeployment(this, 'DeployWebsite', {
          sources: [s3deploy.Source.asset('./src/package.zip')],
          destinationBucket: source_bucket
        })

        const sourceOutputArtifact = new Artifact('SourceArtifact')


        const sourceAction = new actions.S3SourceAction({
          actionName: "Source",
          bucket: source_bucket,
          bucketKey: 'package.zip',
          trigger: actions.S3Trigger.EVENTS,
          output: sourceOutputArtifact
        
        });
      
        
        const scLaunch = new scLaunchRole(this, 'SCLaunch', {});

        new scRoles(this, 'SnowROles',{})

        const lambda_layer = new lambda.LayerVersion(this, 'lambdaLayer',{
          code: lambda.Code.fromAsset('lib/asset/python.zip'),
          compatibleRuntimes: [lambda.Runtime.PYTHON_3_8],
          layerVersionName: "LambdaLayer"
    
        });
      const lambda_role = new lambdaRole(this, "LambdaRole", {accountNumber: this.account})


      const lambda_function =new lambda.Function(this, 'LambdaFunction',{
          runtime: lambda.Runtime.PYTHON_3_8,
          code: lambda.Code.fromAsset('lib/asset'),
          handler: 'index.lambda_handler',
          role: lambda_role,
          timeout: cdk.Duration.seconds(600),
          environment: {
              "TargetBucketName": source_bucket.bucketName,
              "sourceBucket": source_bucket1.bucketName
              
            
          }, 
          layers:[lambda_layer]
        });

        new CfnOutput(this, 'EndUserAccessKey',{
          value: lambda_function.functionArn,
          description: "Lambda Role Arn",
          exportName: "ServiceCatalogLambdaRole"
      });

        
  
      
        const pipelineRoles = new pipelineRole(this, 'Stage', { accountNumber: this.account, roleName: "CI-CD-Pipeline" , crossAccountRoleArn: crossaccount.valueAsString, lambdaarn: lambda_function.functionArn})

        const ServiceCatalogPortolio = new sc.CfnPortfolio(this, 'CfnPortfolio', {
          displayName: "CI-CD-Portfolio",
          providerName: 'CCOE',
          acceptLanguage: 'en',
          description: 'CI-CD portfolio to be used for service now'
        });
        const buildProject = new  codebuild.PipelineProject(this, 'pipelineProject1',{
          projectName: 'BuildProject',
          role: pipelineRoles,
          buildSpec: codebuild.BuildSpec.fromSourceFilename('./buildspec.yml'),
          environment: {
           buildImage: codebuild.LinuxBuildImage.STANDARD_3_0,
            
          },
          environmentVariables: {
             "PortFolioid": {type: codebuild.BuildEnvironmentVariableType.PLAINTEXT, value: ServiceCatalogPortolio.ref},
             "BuildType": {type: codebuild.BuildEnvironmentVariableType.PLAINTEXT, value: "build"},
             "LambdaFunctionArn": {type: codebuild.BuildEnvironmentVariableType.PLAINTEXT, value: lambda_function.functionArn},
             "CrossAccountRoleArn": {type: codebuild.BuildEnvironmentVariableType.PLAINTEXT, value: crossaccount.valueAsString},
             "LaunchRoleArn": {type: codebuild.BuildEnvironmentVariableType.PLAINTEXT, value: launchRole.valueAsString},
             "SourceLaunchRoleArn": {type: codebuild.BuildEnvironmentVariableType.PLAINTEXT, value: scLaunch.roleArn},
             "Bucket": {type: codebuild.BuildEnvironmentVariableType.PLAINTEXT, value: bucketname.valueAsString},
             "PipelineRoleArn": {type: codebuild.BuildEnvironmentVariableType.PLAINTEXT, value: pipelineRoles.roleArn},
             "SourceBucket": {type: codebuild.BuildEnvironmentVariableType.PLAINTEXT, value: source_bucket1.bucketName}

          }
        })

        const deployProject = new  codebuild.PipelineProject(this, 'DeployProject',{
          projectName: 'DeployProject',
          role: pipelineRoles,
          buildSpec: codebuild.BuildSpec.fromSourceFilename('./buildspec.yml'),
          environment: {
           buildImage: codebuild.LinuxBuildImage.STANDARD_3_0
          },
          environmentVariables: {
            "CrossAccountRoleArn": {type: codebuild.BuildEnvironmentVariableType.PLAINTEXT, value: crossaccount.valueAsString},
            "LaunchRoleArn": {type: codebuild.BuildEnvironmentVariableType.PLAINTEXT, value: launchRole.valueAsString},
            "BuildType": {type: codebuild.BuildEnvironmentVariableType.PLAINTEXT, value: "deploy"},
            "Bucket": {type: codebuild.BuildEnvironmentVariableType.PLAINTEXT, value: bucketname.valueAsString},
            "SourceLaunchRoleArn": {type: codebuild.BuildEnvironmentVariableType.PLAINTEXT, value: scLaunch.roleArn},
            "PipelineRoleArn": {type: codebuild.BuildEnvironmentVariableType.PLAINTEXT, value: pipelineRoles.roleArn}
         }
        })

        const buildOutputArtifact = new Artifact('BuildArtifact')
        
        const buildAction = new actions.CodeBuildAction ({
          actionName: 'Build',
          outputs: [buildOutputArtifact],
          input: sourceOutputArtifact,
          project: buildProject,
          runOrder: 10
        })

                
        const DeployAction = new actions.CodeBuildAction ({
          actionName: 'Deploy',
          input: sourceOutputArtifact,
          project: deployProject,
          runOrder: 30
        })

      const topic = new sns.Topic(this, 'Topic', {
          displayName: 'Customer subscription topic'
      });

        const approvalAction = new actions.ManualApprovalAction({
          actionName: 'Approval',
          runOrder: 20,
          notificationTopic: topic
        })

        new sc.CfnPortfolioPrincipalAssociation(this, 'PA',{
         portfolioId: ServiceCatalogPortolio.ref,
         principalArn: pipelineRoles.roleArn,
         principalType: "IAM"
        });

        
        
        new codepipeline.Pipeline(this, 'AMS-ServiceCatalog-Pipeline',{
          pipelineName: 'AMS-ServiceCatalog-Pipeline',
          role: pipelineRoles,
          
          stages: [
            {
              stageName: 'Source',
              actions: [sourceAction]
            },
            {
              stageName: 'Source-ServiceCatalog-Registration',
              actions: [buildAction]
            },
            {
              stageName: 'Approval',
              actions: [approvalAction]
            },
            {
              stageName: 'AMS-ServiceCatalog-Registration-Deployment',
              actions: [DeployAction]
            }
          ]
        })
    }
  }


