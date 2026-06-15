import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// 1. Import Amplify
import { Amplify } from 'aws-amplify';

// 2. Configure cross-region backend
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
      userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
      region: 'eu-west-1', // Auth database is in Ireland
    }
  },
  Storage: {
    S3: {
      bucket: import.meta.env.VITE_STORAGE_BUCKET,
      region: 'us-east-1' // S3 Bucket is in N. Virginia
    }
  }
});

// 3. Render the app
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)