# Smart Accountant
## An AI-powered, serverless invoice automation platform

![License](https://img.shields.io/badge/license-MIT-green.svg)
![AWS](https://img.shields.io/badge/AWS-Serverless-orange.svg)
![Build](https://img.shields.io/badge/build-passing-brightgreen.svg)

---.

## Overview

Smart Accountant is a production-grade, full-stack serverless application that automates invoice ingestion and data extraction for accountants and finance teams.

The platform removes manual data entry by leveraging an event-driven architecture on AWS. It enables automatic upload, parsing, storage, and retrieval of invoice data while maintaining scalability, security, and low operational overhead.

This project is designed with real-world accounting workflows in mind and follows cloud-native best practices.

---

## Problem Statement

Traditional invoice processing requires:
- Manual uploads
- Repetitive data entry
- Human validation of financial fields

These workflows are slow, error-prone, and difficult to scale.

Smart Accountant solves this problem by automating the entire invoice lifecycle using serverless, event-driven components.

---

## Architecture Overview

Smart Accountant uses an Event-Driven Serverless Architecture built entirely on AWS managed services.

### End-to-End Flow

1. User authenticates using Amazon Cognito  
2. User uploads a PDF invoice via the React dashboard  
3. The invoice is uploaded directly to Amazon S3  
4. S3 upload triggers a Python Lambda function  
5. Lambda extracts invoice metadata (date, amount, vendor)  
6. Metadata is stored in Amazon DynamoDB  
7. Invoice file is archived in S3  
8. Dashboard retrieves data via API Gateway and Lambda  

---

## Architecture Diagram

```mermaid
graph TD
    User[User - React Dashboard]
    Cognito[AWS Cognito]
    Amplify[AWS Amplify Hosting]
    S3[S3 Bucket - Invoices]
    LambdaProcessor[Lambda - Invoice Processor]
    DynamoDB[DynamoDB - Invoice Metadata]
    S3Archive[S3 Archive Folder]
    APIGW[API Gateway]
    LambdaGet[Lambda - Get Invoice]

    User -->|Authenticate| Cognito
    User -->|Upload Invoice| Amplify
    Amplify --> S3
    S3 -->|Event Trigger| LambdaProcessor
    LambdaProcessor --> DynamoDB
    LambdaProcessor --> S3Archive
    User -->|Fetch Invoices| APIGW
    APIGW --> LambdaGet
    LambdaGet --> DynamoDB

```

---

## Technology Stack

### Frontend
- React (Vite)
- Tailwind CSS
- AWS Amplify (Hosting & CI/CD)

### Authentication
- Amazon Cognito

### Backend Compute
- AWS Lambda (Python 3.9)

### Infrastructure as Code
- AWS SAM (Serverless Application Model)

### Storage
- Amazon S3 (Raw uploads and archived invoices)

### Database
- Amazon DynamoDB (NoSQL)

### API Layer
- Amazon API Gateway (REST)

---

## Repository Structure

    .
    ├── backend/
    │   ├── template.yaml              # AWS SAM infrastructure definition
    │   └── functions/
    │       ├── processor/             # S3-triggered Lambda
    │       │   └── app.py
    │       └── get_invoice/           # API Gateway Lambda
    │           └── app.py
    │
    ├── src/
    │   ├── Dashboard.jsx              # React dashboard
    │   ├── main.jsx
    │   └── api/
    │
    ├── amplify/
    │   └── backend/                   # Amplify deployment configuration
    │
    └── README.md

---

## Installation & Setup

### Prerequisites

- AWS Account
- AWS CLI (configured)
- AWS SAM CLI
- Amplify CLI
- Node.js 18+
- Python 3.9

---

## Backend Setup (AWS SAM)

    cd backend
    sam build
    sam deploy --guided

This provisions Lambda functions, S3 buckets, DynamoDB tables, API Gateway endpoints, and IAM roles.

---

## Frontend Setup (React + Amplify)

    npm install
    npm run dev

Deployment:

    amplify init
    amplify publish

Amplify manages hosting, CI/CD pipelines, and environment configuration.

---

## Security Model

- Authentication handled via Amazon Cognito
- IAM roles follow least-privilege principles
- Direct S3 uploads prevent backend exposure
- Invoice files are private and not publicly accessible
- All API endpoints require authentication

---

## Future Roadmap

### GenAI Integration
- Chat with invoices using AWS Bedrock (Claude 3)
- Natural language financial queries

### Fraud Detection
- Duplicate invoice detection
- Vendor and invoice number anomaly detection

### Smart Alerts
- SNS notifications for high-value invoices
- Alerts for suspicious billing patterns

---

## License

MIT License

---

## Author Notes

This project is built with senior-level engineering principles:
- Event-driven serverless design
- Infrastructure as Code
- Clean separation of concerns
- Cloud-native scalability and security

Smart Accountant is intended as a real-world foundation for modern accounting automation platforms.
