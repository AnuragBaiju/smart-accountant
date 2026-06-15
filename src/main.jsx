import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { Amplify } from 'aws-amplify';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: 'eu-west-1_EVhy3v8FD',
      userPoolClientId: 'ku9og12s7nl351s57592npaue',
      region: 'eu-west-1', 
    }
  },
  Storage: {
    S3: {
      bucket: 'smart-accountant-upload-049145893383',
      region: 'us-east-1' 
    }
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)