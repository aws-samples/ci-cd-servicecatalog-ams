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
import cdk = require('@aws-cdk/core');
import { Construct } from '@aws-cdk/core'
export interface role_details extends cdk.StackProps {
  accountNumber: String;
}
export default class LambdaRole extends iam.Role {
  constructor(scope: Construct, name: string, props:role_details) {
    const { accountNumber, ...rest } = props
    super(scope, name, {
      ...rest,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    })
    this.addManagedPolicy(iam.ManagedPolicy.fromManagedPolicyArn(this, 'id',"arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"))
    this.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          's3:PutObject',
          's3:ListBucket',
          's3:GetObject',
          's3:GetObjectVersion',
          's3:GetBucketVersioning'
        ],
        resources: ["arn:aws:s3:::sc-bucket-"+props.accountNumber,
                   "arn:aws:s3:::sc-bucket-"+props.accountNumber+"/*",
                  "arn:aws:s3:::sc-service-catalog-bucket-"+props.accountNumber,
                  "arn:aws:s3:::sc-service-catalog-bucket-"+props.accountNumber+"/*"
                ]
      })
    )

    


    
  }
}