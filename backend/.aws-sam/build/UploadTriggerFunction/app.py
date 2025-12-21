import json
import boto3
import os
import uuid

# Connect to AWS S3
s3_client = boto3.client('s3')

# Get the bucket name from the environment variables (we set this in template.yaml)
BUCKET_NAME = os.environ.get('UPLOAD_BUCKET_NAME')

def lambda_handler(event, context):
    """
    This function generates a Presigned URL.
    It allows the frontend to upload a file directly to S3 without revealing secrets.
    """
    
    # 1. Give the file a unique name so users don't overwrite each other
    # Example: "f47ac10b-58cc-4372-a567-0e02b2c3d479.pdf"
    file_id = str(uuid.uuid4())
    file_name = f"{file_id}.pdf"
    
    try:
        # 2. Ask S3 to generate the secure URL
        # This URL lets the user upload ONE file for 300 seconds (5 mins)
        upload_url = s3_client.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': BUCKET_NAME,
                'Key': file_name,
                'ContentType': 'application/pdf'
            },
            ExpiresIn=300 
        )
        
        # 3. Return the URL to the user
        return {
            "statusCode": 200,
            # These headers allow your website to talk to this API (CORS)
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET,OPTIONS",
                "Access-Control-Allow-Headers": "*"
            },
            "body": json.dumps({
                "upload_url": upload_url,
                "file_name": file_name
            })
        }

    except Exception as e:
        print(f"Error generating URL: {e}")
        return {
            "statusCode": 500,
            "body": json.dumps({"error": "Failed to generate URL"})
        }