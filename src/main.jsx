import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

import { Amplify } from 'aws-amplify';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
      userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
      region: 'eu-west-1', // Your Cognito is in Ireland
    }
  },
  Storage: {
    S3: {
      bucket: import.meta.env.VITE_STORAGE_BUCKET,
      region: 'us-east-1' // Your S3 Bucket is in Virginia
    }
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)