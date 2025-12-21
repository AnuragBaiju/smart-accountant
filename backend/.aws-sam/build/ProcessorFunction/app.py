import json
import boto3
import urllib.parse
import re

s3 = boto3.client('s3')
textract = boto3.client('textract')
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('SmartAccountantData')

def lambda_handler(event, context):
    print("🚀 Processor Woke Up!")
    
    # 1. Get the bucket name and file name
    bucket = event['Records'][0]['s3']['bucket']['name']
    key = urllib.parse.unquote_plus(event['Records'][0]['s3']['object']['key'], encoding='utf-8')
    
    try:
        # 2. Call AWS Textract
        print(f"🧠 Analyzing {key} with Textract...")
        response = textract.analyze_document(
            Document={'S3Object': {'Bucket': bucket, 'Name': key}},
            FeatureTypes=['FORMS'] 
        )
        
        # 3. Extract Raw Text
        raw_text = ""
        for block in response['Blocks']:
            if block['BlockType'] == 'LINE':
                raw_text += block['Text'] + "\n"
        
        # 4. Simple Logic: Try to find a dollar amount
        # (This searches for patterns like $100.00 or 100.00)
        amounts = re.findall(r'\$?\d+\.\d{2}', raw_text)
        detected_total = amounts[0] if amounts else "0.00"

        print("--- RESULTS ---")
        print(f"Extracted Text Length: {len(raw_text)}")
        print(f"Potential Total: {detected_total}")
        
        # 5. SAVE TO DATABASE (Long Term Memory)
        print("💾 Saving to DynamoDB...")
        table.put_item(
            Item={
                'UserId': 'demo_user',        # Hardcoded for now
                'InvoiceId': key,             # The filename acts as the ID
                'DetectedTotal': detected_total,
                'RawText': raw_text
            }
        )
        print("✅ Saved successfully!")

        return {'statusCode': 200, 'body': json.dumps('Saved to DB!')}

    except Exception as e:
        print(f"❌ Error: {e}")
        raise e