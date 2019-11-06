import codebuild = require('@aws-cdk/aws-codebuild');
import codecommit = require('@aws-cdk/aws-codecommit');
import codepipeline = require('@aws-cdk/aws-codepipeline');
import codepipeline_actions = require('@aws-cdk/aws-codepipeline-actions');
import lambda = require('@aws-cdk/aws-lambda');
import s3 = require('@aws-cdk/aws-s3');
import iam = require('@aws-cdk/aws-iam');
import secrets = require('@aws-cdk/aws-secretsmanager');
import ssm = require('@aws-cdk/aws-ssm');

import { App, Stack, StackProps } from '@aws-cdk/core';


    /** Get LambdaCode from Lambda Stack*/
export interface ServerlessPipelineStackProps extends StackProps {
  readonly lambdaCode: lambda.CfnParametersCode;
}

export class ServerlessPipelineStack extends Stack {
  constructor(scope: App, id: string, props: ServerlessPipelineStackProps) {
    super(scope, id, props);

    /** Codecommit Repository*/
    const codeCommitRepository = codecommit.Repository.fromRepositoryName(this, 'Imported-repo', 'YOUR-CODECOMMIT-REPO-NAME')


    /** Code Build Projects */
    const cdkBuild_project = new codebuild.PipelineProject(this, 'CdkBuild', {
      buildSpec: codebuild.BuildSpec.fromSourceFilename('lib/cdk_buildspec.yml'),
      environment: {
        buildImage: codebuild.LinuxBuildImage.UBUNTU_14_04_NODEJS_8_11_0,
      },
    });
    const lambdaBuild_project = new codebuild.PipelineProject(this, 'LambdaBuild', {
      buildSpec: codebuild.BuildSpec.fromSourceFilename('lib/lambda_buildspec.yml'),
      environment: {
        buildImage: codebuild.LinuxBuildImage.UBUNTU_14_04_NODEJS_8_11_0,
      },
    });

    /** Codepipeline Artifacts */
    const sourceOutputArtifact = new codepipeline.Artifact();
    const cdkBuildOutputArtifact = new codepipeline.Artifact('CdkBuildOutput');
    const lambdaBuildOutputArtifact = new codepipeline.Artifact('LambdaBuildOutput');

    /** Codepipeline Actions */
    const sourceStageAction = new codepipeline_actions.CodeCommitSourceAction({
      actionName: 'CodeCommit_Source',
      repository: codeCommitRepository,
      output: sourceOutputArtifact,
    });

    const lambdaBuildStageAction = new codepipeline_actions.CodeBuildAction({
      actionName: 'Lambda_Build',
      project: lambdaBuild_project,
      input: sourceOutputArtifact,
      outputs: [lambdaBuildOutputArtifact],
    });

    const cdkBuildStageAction = new codepipeline_actions.CodeBuildAction({
      actionName: 'CDK_Build',
      project: cdkBuild_project,
      input: sourceOutputArtifact,
      outputs: [cdkBuildOutputArtifact],
    });

    const lambdaDeployStageAction = new codepipeline_actions.CloudFormationCreateUpdateStackAction({
      actionName: 'Lambda_CFN_Deploy',
      templatePath: cdkBuildOutputArtifact.atPath('LambdaStack.template.json'),
      stackName: 'LambdaStack',
      adminPermissions: true,
      parameterOverrides: {
        ...props.lambdaCode.assign(lambdaBuildOutputArtifact.s3Location),
      },
      extraInputs: [lambdaBuildOutputArtifact],
    });

    /** Codepipeline stages */
    const dataResetCodePipeline = new codepipeline.Pipeline(this, 'Pipeline', {
      stages: [
        {
          stageName: 'Source',
          actions: [sourceStageAction],
        },
        {
          stageName: 'Build',
          actions: [lambdaBuildStageAction, cdkBuildStageAction],
        },
        {
          stageName: 'Deploy',
          actions: [lambdaDeployStageAction],
        },
      ],
    });

    /** Codepipeline stages permission to Artifact bucket */
    dataResetCodePipeline.artifactBucket.grantRead(lambdaDeployStageAction.deploymentRole);

  }
}
