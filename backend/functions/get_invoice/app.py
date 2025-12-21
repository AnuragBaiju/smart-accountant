import json
import boto3
import os

dynamodb = boto3.resource('dynamodb')
# We access the table name from environment variables
TABLE_NAME = os.environ.get('TABLE_NAME')
table = dynamodb.Table(TABLE_NAME)

def lambda_handler(event, context):
    # 1. Get the Invoice ID from the URL path
    # Example URL: /invoice/myfile.pdf -> pathParameters = {'invoice_id': 'myfile.pdf'}
    invoice_id = event['pathParameters']['invoice_id']
    
    print(f"🔍 Looking for invoice: {invoice_id}")

    try:
        # 2. Fetch data from DynamoDB
        response = table.get_item(
            Key={
                'UserId': 'demo_user', # Hardcoded for this demo
                'InvoiceId': invoice_id
            }
        )

        # 3. Check if found
        if 'Item' in response:
            return {
                "statusCode": 200,
                "headers": {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET,OPTIONS",
                    "Access-Control-Allow-Headers": "*"
                },
                "body": json.dumps(response['Item'])
            }
        else:
            return {
                "statusCode": 404,
                "headers": {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET,OPTIONS",
                    "Access-Control-Allow-Headers": "*"
                },
                "body": json.dumps({"error": "Processing not finished yet"})
            }

    except Exception as e:
        print(e)
        return {"statusCode": 500, "body": json.dumps({"error": str(e)})}