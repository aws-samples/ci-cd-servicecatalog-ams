import boto3, sys, json, time, os
import logging

logger = logging.getLogger()
logging.basicConfig()
from zipfile import ZipFile

logger.setLevel("INFO")
from botocore.exceptions import ClientError


class serviceCatalog:

    def __init__(self):

        file = open('version.json', "r")
        f = json.load(file)
        self.applicationName = f['AppName']
        self.version = f['Version']
        sts_client = boto3.client('sts')
        self.data = {
            "AWSTemplateFormatVersion": "2010-09-09",
            "Description": "Anchor stack for AWS Lambda",
            "Parameters": {
                "appName": {
                    "Description": "Application name",
                    "Type": "String",
                    "Default": "userdata"
                },
                "Version": {
                    "Description": "Instance type for C9",
                    "Type": "String",
                    "Default": "1.0.0"
                }
            },
            "Resources": {
                "triggerLambda": {
                    "Type": "Custom::LambdaCallout",
                    "Properties": {
                        "ServiceToken": {"Fn::ImportValue": "ServiceCatalogLambdaRole"},
                        "appName": {"Ref": "appName"},
                        "Version": {"Ref": "Version"}
                    }
                }
            }
        }

        if (os.environ['BuildType'] == 'build'):
            self.bucketName = os.environ['SourceBucket']
            self.launchArn = os.environ['SourceLaunchRoleArn']

            self.role = "arn:aws:iam::%s:user/SnowEndUser" % (boto3.client('sts').get_caller_identity()['Account'])
            self.sc_client = boto3.client('servicecatalog')
            self.s3_client = boto3.client('s3')
            self.s3_resource = boto3.resource('s3')

        elif (os.environ['BuildType'] == 'deploy'):
            self.bucketName = os.environ['Bucket']
            self.role = os.environ['CrossAccountRoleArn']
            self.produtId = ""
            response = sts_client.assume_role(
                RoleArn=os.environ['CrossAccountRoleArn'],
                RoleSessionName='assumeRole'
            )
            ACCESS_KEY = response['Credentials']['AccessKeyId']
            SECRET_KEY = response['Credentials']['SecretAccessKey']
            SESSION_TOKEN = response['Credentials']['SessionToken']
            boto3_client = boto3.Session(
                aws_access_key_id=ACCESS_KEY,
                aws_secret_access_key=SECRET_KEY,
                aws_session_token=SESSION_TOKEN
            )

            self.sc_client = boto3_client.client('servicecatalog')
            self.s3_client = boto3_client.client('s3')
            self.s3_resource = boto3_client.resource('s3')
            self.launchArn = os.environ['LaunchRoleArn']

    def uploadArtifact(self):
        """ Uploads the product (CloudFormation template) to artifact buckets

        :return:
        """
        if (os.environ['BuildType'] == 'deploy'):
            response = self.s3_resource.meta.client.upload_file('cloudformation.json', self.bucketName,
                                                                "servicecatalog/%s/%s/cloudformation.json" % (
                                                                self.applicationName, self.version))
            templateUrl = "https://%s.s3.amazonaws.com/servicecatalog/%s/%s/cloudformation.json" % (
                self.bucketName, self.applicationName, self.version)
            return templateUrl
        else:
            self.data['Parameters']['appName']['Default'] = self.applicationName
            self.data['Parameters']['Version']['Default'] = self.version
            print(self.data)
            with open('cloudformation.json', 'w') as outfile:
                json.dump(self.data, outfile)
            response = self.s3_resource.meta.client.upload_file('cloudformation.json', self.bucketName,
                                                                "servicecatalog/%s/%s/cloudformation.json" % (
                                                                    self.applicationName, self.version))
            templateUrl = "https://%s.s3.amazonaws.com/servicecatalog/%s/%s/cloudformation.json" % (
                self.bucketName, self.applicationName, self.version)
            with ZipFile('package.zip', 'w') as myzip:
                myzip.write('cloudformation.json')
                myzip.write('servicecatalog.py')
                myzip.write('version.json')
                myzip.write('buildspec.yml')
            response = self.s3_resource.meta.client.upload_file('package.zip', self.bucketName,
                                                                "servicecatalog/%s/%s/package.zip" % (
                                                                    self.applicationName, self.version))
            return templateUrl

    def checkVersion(self, productId):
        """
        This method is used to check if specific version of a product in service catalog portfolio exists.
        :param productId:
        :return:
        """
        response = self.sc_client.describe_product_as_admin(
            AcceptLanguage='en',
            Id=productId
        )
        a = response['ProvisioningArtifactSummaries']
        for b in a:
            if (b['Name'] == self.version):
                return b['Id']
        else:
            return False

    def check_provisioning_artifact_status(self,versionId, ProductId):
        """
        This method is used to check the status of provisioning artifact
        :param versionId:
        :param ProductId:
        :return:
        """

        while (True):
            response = self.sc_client.describe_provisioning_artifact(
                AcceptLanguage='en',
                ProvisioningArtifactId=versionId,
                ProductId=ProductId
            )
            if (response['Status'] == 'CREATING'):
                logging.info("==== Provisioning artifact is being registered =====")
                time.sleep(20)
            elif (response['Status'] == 'FAILED'):
                logging.info("==== Provisioning artifact is failed =====")
                return 'FAILED'
            elif (response['Status'] == 'AVAILABLE'):
                logging.info("==== Provisioning product is available now =====")
                return 'AVAILABLE'

    def createProduct(self, portFolioId):
        """
        This method will be used to create Product in service Catalog
        :return:
        """

        templateUrl = self.uploadArtifact()
        print(templateUrl)
        try:
            products = self.sc_client.search_products()
            for p in products['ProductViewSummaries']:

                if (p['Name'] == self.applicationName):
                    logging.info("==== Product Exist, hence not creating new one ====")
                    parameterValue = p['ProductId']
                    self.produtId = p['ProductId']
                    print(parameterValue)
                    logging.info("==== Checking if the version exist ====")
                    response = self.sc_client.describe_product_as_admin(
                        AcceptLanguage='en',
                        Id=parameterValue
                    )
                    print(response)
                    a = response['ProvisioningArtifactSummaries']
                    print(a)
                    for b in a:
                        print(b)
                        if (b['Name'] == self.version):
                            logging.info(
                                "==== Version already exist in service catalog, hence not creating the version ==== ")
                            return
                    else:
                        logging.info("==== Uploading the file to S3 bucket ====")
                        logging.info("==== version does not exist in service catalog, hence registering the version =====")
                        try:
                            response = self.sc_client.create_provisioning_artifact(
                                AcceptLanguage='en',
                                ProductId=parameterValue,
                                Parameters={
                                    'Name': self.version,
                                    'Description': 'This is the new version',
                                    'Info': {
                                        "LoadTemplateFromURL": str(templateUrl)
                                    },
                                    'Type': 'CLOUD_FORMATION_TEMPLATE',
                                    'DisableTemplateValidation': True
                                }
                            )


                            if self.check_provisioning_artifact_status(response['ProvisioningArtifactDetail']['Id'], parameterValue) == 'AVAILABLE':
                                logging.info("==== Product version has been created sucessfully ====")
                            elif self.check_provisioning_artifact_status(response['ProvisioningArtifactDetail']['Id'], parameterValue) == 'FAILED':
                                logging.info("==== Product version creation has failed, hence exiting the system ====")
                                sys.exit(1)

                            return
                        except ClientError as e:
                            logging.info(
                                "==== There is a problem while registering the version, hence exiting the system ====")
                            logging.info(e)
                            sys.exit(1)

            else:
                    logging.info("==== Product does not exist, hence creating new product ====")

                    response = self.sc_client.create_product(
                        AcceptLanguage='en',
                        Name=self.applicationName,
                        Owner='CCOE',
                        Description='This is for application',
                        Distributor='CCOE',
                        ProductType='CLOUD_FORMATION_TEMPLATE',
                        Tags=[
                            {
                                'Key': 'name',
                                'Value': 'S3'
                            },
                        ],
                        ProvisioningArtifactParameters={
                            'Name': self.version,
                            'Description': 'This is initial version',
                            'Info': {
                                "LoadTemplateFromURL": templateUrl
                            },
                            'Type': 'CLOUD_FORMATION_TEMPLATE',
                            'DisableTemplateValidation': True
                        }
                    )

                    productId = response['ProductViewDetail']['ProductViewSummary']['ProductId']

                    productVersionId = response['ProvisioningArtifactDetail']['Id']

                    version_status = self.check_provisioning_artifact_status(productVersionId, productId)

                    self.produtId = productId

                    if (version_status == 'FAILED'):
                        logger.error("==== Product version artifact creation has failed ====")
                        sys.exit(1)
                    elif (version_status == 'AVAILABLE'):
                        logger.info("==== Product version artifact creation has been created ====")

                    logging.info("==== Associating product with portfolio ====")
                    res = self.sc_client.associate_product_with_portfolio(
                        AcceptLanguage='en',
                        ProductId=productId,
                        PortfolioId=portFolioId
                    )
                    logging.info("==== Associating principals with portfolio ====")
                    response = self.sc_client.associate_principal_with_portfolio(
                        AcceptLanguage='en',
                        PortfolioId=portFolioId,
                        PrincipalARN=self.role,
                        PrincipalType='IAM'
                    )
                    logging.info("==== Creating Constraint with portfolio ====")

                    response = self.sc_client.create_constraint(
                        AcceptLanguage='en',
                        PortfolioId=portFolioId,
                        ProductId=productId,
                        Parameters=json.dumps({"RoleArn": self.launchArn}),
                        Type='LAUNCH'

                    )

        except ClientError as e:
                    logging.info("==== There is a problem creating service catalog product, hence exiting system ====")
                    logging.info(e)
                    sys.exit(1)

    def checkIfPortFolioExist(self):
        """
        This method is used to check if portfolio exist
        :return:
        """
        try:

            response = self.sc_client.list_portfolios(
                AcceptLanguage='en'
            )
            for portfolio in response['PortfolioDetails']:
                if (portfolio['DisplayName'] == 'CI-CD-Portfolio-test'):
                    logging.info("==== Portfolio exist hence not creating a new one ====")
                    self.createProduct(portfolio['Id'])
                    return
            else:
                logging.info("==== Portfolio does not exist, hence creating new Portfolio ====")
                response = self.sc_client.create_portfolio(
                    AcceptLanguage='en',
                    DisplayName='CI-CD-Portfolio',
                    Description='this portfolio will be used by CI/CD pipeline to deploy Code',
                    ProviderName='CCOE'
                )
                portFolioId = response['PortfolioDetail']['Id']
                self.createProduct(portFolioId)
        except ClientError as e:
            logging.info("==== There is some error ====")
            logging.error(e)

    def provisionProduct(self, productId):
        """
        This method is used to initiate product provisioning

        :return:
        """
        response = self.sc_client.provision_product(
            AcceptLanguage='en',
            ProductId=productId,
            ProvisioningArtifactId=self.checkVersion(productId),
            ProvisionedProductName=self.applicationName
        )
        self.checkProvisionProductStatus(response['RecordDetail']['ProvisionedProductId'])

    def update_provisioned_product(self, pId, paId, productId):

        """
        This method is used to updated an exisiting provisioned product
        :param pId:
        :param paId:
        :param productId:
        :return:
        """

        response = self.sc_client.update_provisioned_product(
            AcceptLanguage='en',
            ProvisionedProductId=str(pId),
            ProductId=productId,
            ProvisioningArtifactId=paId
        )
        self.checkProvisionProductStatus(response['RecordDetail']['ProvisionedProductId'])

    def checkProvisionProductStatus(self, Id):
        """
        this method is used to check the status of provisioned product
        :param Id:
        :return:
        """
        while (True):
            response = self.sc_client.describe_provisioned_product(
                AcceptLanguage='en',
                Id=Id
            )

            if (response['ProvisionedProductDetail']['Status'] == 'AVAILABLE'):
                logger.info("==== Product has been sucessfully created or updated ====")
                return
            elif (response['ProvisionedProductDetail']['Status'] == 'UNDER_CHANGE' or
                  response['ProvisionedProductDetail']['Status'] == 'PLAN_IN_PROGRESS'):
                logger.info("==== Product execution is in progress, please wait ====")
                time.sleep(20)
            elif (response['ProvisionedProductDetail']['Status'] == 'ERROR' or response['ProvisionedProductDetail'][
                'Status'] == 'TAINTED'):
                logger.info("==== Product provisiong has failed ====")
                sys.exit(1)

    def deployStack(self):
        """
        This method is used to initiate the product deployment
        :return:
        """
        response = self.sc_client.scan_provisioned_products(
            AcceptLanguage='en',
            AccessLevelFilter={
                'Key': 'Account',
                'Value': 'self'
            }

        )
        products = response['ProvisionedProducts']
        update = False
        for product in products:
            if (product['Name'] == self.applicationName):
                if (product['Status'] == 'ERROR'):
                    logger.info("==== Product Status is Error hence deleting it ====")
                    response = self.sc_client.terminate_provisioned_product(
                        ProvisionedProductId=product['Id'],
                        IgnoreErrors=True,
                        AcceptLanguage='en'
                    )
                    time.sleep(20)
                else:
                    update = True
                    logging.info("==== Product has been provisioned, now updating the product with version ====")

                    self.update_provisioned_product(product['Id'], self.checkVersion(self.produtId),
                                                    self.produtId)
        else:
            if (not update):
                logging.info("==== Provisioning the product ====")
                self.provisionProduct(self.produtId)


if __name__ == '__main__':

    if (os.environ['BuildType'] == "build"):
        s = serviceCatalog()
        s.createProduct(os.environ['PortFolioid'])
    else:
        s = serviceCatalog()
        s.checkIfPortFolioExist()
        s.deployStack()

