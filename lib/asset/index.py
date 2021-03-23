import boto3, logging, json, os
import requests
from botocore.exceptions import ClientError
logger = logging.getLogger()
logging.basicConfig()
logger.setLevel("INFO")
s3 = boto3.resource('s3')
s3_client = boto3.client('s3')
SUCCESS = "SUCCESS"
FAILED = "FAILED"
def send(event, context, responseStatus, responseData, physicalResourceId=None, noEcho=False):
  responseUrl = event['ResponseURL']
  responseBody = {}
  responseBody['Status'] = responseStatus
  responseBody['Reason'] = 'See the details in CloudWatch Log Stream: ' + context.log_stream_name
  responseBody['PhysicalResourceId'] = physicalResourceId or context.log_stream_name
  responseBody['StackId'] = event['StackId']
  responseBody['RequestId'] = event['RequestId']
  responseBody['LogicalResourceId'] = event['LogicalResourceId']
  responseBody['NoEcho'] = noEcho
  responseBody['Data'] = responseData
  json_responseBody = json.dumps(responseBody)
  print("Response body:\n" + json_responseBody)
  headers = {
      'content-type' : '',
      'content-length' : str(len(json_responseBody))
  }

  try:
      response = requests.put(responseUrl,
                              data=json_responseBody,
                              headers=headers)
      print("Status code: " + response.reason)
  except Exception as e:
      print("send(..) failed executing requests.put(..): " + str(e))



def uploadtoS3(appName,version,event,context):

  bucketName= os.environ['TargetBucketName']
  sourceBucket = os.environ['sourceBucket']
  responseData = {'passwordcheck': 'Password Valid!'}

  try:
    copy_source = {
        'Bucket': sourceBucket,
        'Key': "servicecatalog/%s/%s/package.zip"%(appName,version)
    }
    bucket = s3.Bucket(bucketName)
    bucket.copy(copy_source, 'package.zip')
    send(event, context, SUCCESS, responseData, physicalResourceId=None, noEcho=False)
  except ClientError as e:
      send(event, context, FAILED, responseData, physicalResourceId=None, noEcho=False)
      print (e)
def lambda_handler(event, context):
   responseData = {'passwordcheck': 'Password Valid!'}
   if (event.get('RequestType') == "Create"):
      appName = event['ResourceProperties']['appName']
      version = event['ResourceProperties']['Version']
      responseData = {'passwordcheck': 'Password Valid!'}
      uploadtoS3(appName,version,event,context)
   else:
      send(event, context, SUCCESS, responseData, physicalResourceId=None, noEcho=False)

