import { App, Stack, StackProps } from '@aws-cdk/core';
import codedeploy = require('@aws-cdk/aws-codedeploy');
import lambda = require('@aws-cdk/aws-lambda');



export class LambdaStack extends Stack {

  public readonly lambdaCode: lambda.CfnParametersCode;

  constructor(scope: App, id: string, props?: StackProps) {
    super(scope, id, props);

    this.lambdaCode = lambda.Code.cfnParameters();

    new lambda.Function(this, 'lambdaFunction', {
      code: this.lambdaCode,
      handler: 'index.handler',
      runtime: lambda.Runtime.NODEJS_8_10,
    });

    
  }
}
