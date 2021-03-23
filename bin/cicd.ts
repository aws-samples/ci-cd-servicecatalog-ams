#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import {CICDPipeline} from '../lib/pipeline/s3SourceAction';
import  snowRole  from '../lib/iam/snowrole';

const app = new cdk.App();



new CICDPipeline(app, 'ams-pipeline', {});

new snowRole(app, 'SnowRoles', {});
app.synth();
