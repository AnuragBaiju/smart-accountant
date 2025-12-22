# Smart Accountant
**An AI-powered, serverless invoice automation platform**

![License](https://img.shields.io/badge/license-MIT-green.svg)
![AWS](https://img.shields.io/badge/AWS-Serverless-orange.svg)
![Build](https://img.shields.io/badge/build-passing-brightgreen.svg)

---

## 📌 Overview

**Smart Accountant** is a full-stack, event-driven, serverless application designed to eliminate manual data entry for accountants.  
It automates invoice ingestion, parsing, storage, and retrieval using managed AWS services, ensuring scalability, reliability, and low operational overhead.

The system follows a **decoupled, event-driven architecture** where invoice uploads automatically trigger backend processing pipelines, making it suitable for real-world accounting workloads.

---

## 🎯 Problem Statement

Traditional accounting workflows rely heavily on:
- Manual invoice uploads
- Repetitive data entry
- Human validation of amounts, dates, and vendors

This approach is **time-consuming, error-prone, and non-scalable**.

**Smart Accountant** solves this by:
- Automating invoice ingestion
- Extracting structured data from PDFs
- Persisting metadata for fast retrieval
- Providing a modern dashboard for accountants

---

## 🧠 Architecture Overview

The platform is built using an **Event-Driven Serverless Architecture** on AWS.

### User Flow

1. User authenticates via **Amazon Cognito**
2. Invoice PDF is uploaded through the **React Dashboard**
3. File is stored directly in **Amazon S3**
4. S3 upload event triggers a **Python Lambda (processor)**
5. Lambda extracts invoice metadata (date, amount, vendor)
6. Metadata is stored in **Amazon DynamoDB**
7. File is moved to an **Archive** folder in S3
8. Dashboard retrieves processed invoices via **API Gateway + Lambda**

---

## 🧩 Architecture Diagram (Mermaid)

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

    User -->|Login| Cognito
    User -->|Upload PDF| Amplify
    Amplify --> S3
    S3 -->|Trigger| LambdaProcessor
    LambdaProcessor --> DynamoDB
    LambdaProcessor --> S3Archive
    User -->|Fetch Data| APIGW
    APIGW --> LambdaGet
    LambdaGet --> DynamoDB
