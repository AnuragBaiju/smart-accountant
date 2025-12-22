# 🧾 Smart Accountant: AI-Powered Invoice Automation

![Status](https://img.shields.io/badge/status-live-success)
![AWS](https://img.shields.io/badge/AWS-Serverless-orange)
![Python](https://img.shields.io/badge/backend-Python_3.9-blue)
![React](https://img.shields.io/badge/frontend-React_Vite-violet)

**Smart Accountant** is a next-generation financial platform that eliminates manual data entry. It uses an **Event-Driven Serverless Architecture** to ingest invoice PDFs, automatically extract financial data, and store it for instant analysis.

---

## 🏗 Architecture

The system uses an asynchronous pipeline to handle heavy processing without freezing the UI.

```mermaid
graph TD
    User([👤 User]) -->|Uploads PDF| Client[💻 React Dashboard]
    Client -->|Auth| Cognito[🔐 AWS Cognito]
    Client -->|HTTPS PUT| S3_In[📂 S3: Invoices]

    subgraph "The Serverless Brain"
        S3_In -->|Trigger Event| FN_Process[λ Lambda: Processor]
        FN_Process -->|Extract Data| Logic{Analysis Engine}
        Logic -->|Save Metadata| DDB[(🗄 DynamoDB)]
        FN_Process -->|Archive File| S3_Arch[📂 S3: Archive]
    end

    subgraph "API Layer"
        Client -->|Fetch Data| APIG[🌐 API Gateway]
        APIG -->|Route Request| FN_Get[λ Lambda: GetInvoice]
        FN_Get -->|Query| DDB
    end

🛠 Tech Stack
Frontend (The Interface)
React (Vite): Blazing fast dashboard for uploading and viewing invoices.

AWS Amplify: Handles CI/CD deployment and hosting.

Backend (The Engine)
AWS Lambda (Python): The compute layer that parses PDFs and runs business logic.

Amazon DynamoDB: NoSQL database for storing invoice details (Date, Vendor, Amount).

Amazon S3: Secure storage for raw and processed documents.

AWS SAM: Infrastructure as Code (IaC) to deploy the entire backend in one command.

🔮 Future Roadmap (The "Smart" Features)
[ ] 🤖 GenAI Financial Analyst: Integrate AWS Bedrock (Claude 3) to allow users to "chat" with their invoices (e.g., "Why is my electric bill 20% higher this month?").

[ ] 🚨 Automated Fraud Detection: Add logic to flag duplicate invoice numbers or suspicious vendor names automatically.

[ ] 📩 Smart Alerts: Use Amazon SNS to text/email the user when a high-value invoice (> $1,000) is processed.

[ ] 📊 One-Click Export: Generate CSV/Excel reports compatible with QuickBooks or Xero.
