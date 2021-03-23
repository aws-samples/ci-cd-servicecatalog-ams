import cdk = require('@aws-cdk/core');
import { CfnOutput } from '@aws-cdk/core';
import iam = require('@aws-cdk/aws-iam')

export default class snowRoles extends cdk.Stack{

    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps ){
      
      super(scope, id, props);

    const snowRole = new iam.Role(this, "SnowRole",{
          assumedBy: new iam.AccountPrincipal(this.account),
          roleName: "SnowEndUser"
        
      })
      snowRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AWSServiceCatalogEndUserFullAccess'));
      snowRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ReadOnlyAccess'));
      snowRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3ReadOnlyAccess'));
      snowRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AWSLambdaFullAccess'));

      snowRole.addToPolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions:[
            "iam:GetRole",
            "iam:PassRole"
          ],
          resources: ["arn:aws:iam::"+this.account+":role/AWSCloudFormationStackSetAdministrationRole"]
        },
        )
      );
      snowRole.addToPolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions:["sts:AssumeRole"],
          resources: ["arn:aws:iam::"+this.account+":role/AWSCloudFormationStackSetExecutionRole"]
        })
      )

      const snowUser = new iam.User(this, "SNOWUSER", {
          userName: "SnowEndUser"
      }) 
      snowUser.addToPolicy(
        new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions:[
                "sts:AssumeRole",
            ],
            resources: [snowRole.roleArn]
          })

      );
      const syncUser = new iam.User(this, "SCSyncUser", {
          userName: "SCSyncUser",
          managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('AWSServiceCatalogAdminReadOnlyAccess'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMReadOnlyAccess'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AWSConfigUserAccess')
        ],
          
      });
      syncUser.addToPolicy(
        new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions:[
                "servicecatalog:DeleteProduct",
                "servicecatalog:DeleteConstraint",
                "servicecatalog:DeleteProvisionedProductPlan",
                "servicecatalog:DeleteProvisioningArtifact",
                "servicecatalog:DisassociateProductFromPortfolio",
                "servicecatalog:ListBudgetsForResource",
                "budgets:ViewBudget"
            ],
            resources: ["*"]
          })
      );

   

    }
}