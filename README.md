cat <<EOF > README.md
# 🏦 Smart Accountant - AI Invoice Processor

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![Tech Stack](https://img.shields.io/badge/stack-React%20%7C%20AWS%20SAM%20%7C%20Python-blue)
![License](https://img.shields.io/badge/license-MIT-green)

A serverless full-stack application that automates invoice processing. Users upload PDFs via a React dashboard, which triggers an event-driven AWS backend to parse, analyze, and store financial data automatically.

## 🏗 Architecture

**Frontend:** React (Vite) hosted on AWS Amplify.
**Backend:** AWS SAM (Serverless Application Model) with Python Lambda functions.
**Database:** Amazon DynamoDB.
**Storage:** Amazon S3 for invoice documents.

---

## 🚀 Getting Started

### Prerequisites
* Node.js (v18+)
* AWS CLI & SAM CLI configured
* Python 3.9+

### 1. Backend Setup (The Brain)
The backend logic lives in the \`backend/\` folder and uses AWS SAM.

\`\`\`bash
cd backend
# Build the serverless application
sam build

# Deploy to your AWS account
sam deploy --guided
\`\`\`

### 2. Frontend Setup (The Interface)
The frontend is a modern React app located in the root directory.

\`\`\`bash
# Return to root
cd ..

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# (Edit .env with your new API Gateway URL from the backend deploy)

# Start local server
npm run dev
\`\`\`

---

## 📂 Project Structure

\`\`\`text
smart-accountant/
├── backend/                  # AWS SAM Application
│   ├── functions/            # Python Lambda source code
│   │   ├── processor/        # Invoice parsing logic
│   │   ├── upload_trigger/   # S3 event handlers
│   │   └── get_invoice/      # API handlers
│   └── template.yaml         # CloudFormation Infrastructure
│
├── src/                      # React Frontend
│   ├── components/           # UI Components
│   └── Dashboard.jsx         # Main Interface
│
└── dist/                     # Production build artifacts
\`\`\`

## 🔒 Security
* **No hardcoded credentials:** API URLs are managed via environment variables.
* **Least Privilege:** Lambda functions only have access to specific S3 buckets and DynamoDB tables.

## 📝 License
This project is licensed under the MIT License.
EOF
