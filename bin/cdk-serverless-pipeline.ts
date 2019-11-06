#!/usr/bin/env node
import 'source-map-support/register';
import cdk = require('@aws-cdk/core');
import { ServerlessPipelineStack } from '../lib/cdk-serverless-pipeline-stack';
import { LambdaStack } from '../lib/lambda-stack';

const app = new cdk.App();
const lambdaFunction = new LambdaStack(app, 'LambdaStack');

new ServerlessPipelineStack(app, 'ServerlessPipelineStack', {
    lambdaCode: lambdaFunction.lambdaCode,
});

app.synth();