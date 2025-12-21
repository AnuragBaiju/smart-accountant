import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';

// --- IMPORTS ---
import Dashboard from './Dashboard';   
import UploadForm from './UploadForm'; 
import AdminPanel from './AdminPanel'; 

// AWS IMPORTS
import { Amplify } from 'aws-amplify';
import { Authenticator } from '@aws-amplify/ui-react';
import { fetchUserAttributes, fetchAuthSession } from 'aws-amplify/auth';
import '@aws-amplify/ui-react/styles.css';

// --- CONFIGURATION ---
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: 'us-east-1_VXExyF7hk', 
      userPoolClientId: '55r0vtktshnvkagu40pf534a6l', 
      identityPoolId: 'us-east-1:025ab946-da51-48a5-8231-92f235adf05d', 
    }
  },
  Storage: {
    S3: {
      bucket: 'smart-accountant-upload-810244486416', 
      region: 'us-east-1', 
    }
  }
});

const API_ENDPOINT = "https://ytywhx6eq0.execute-api.us-east-1.amazonaws.com/prod";

function App() {
  const [userName, setUserName] = useState(""); 
  const [userEmail, setUserEmail] = useState(""); 
  const [userId, setUserId] = useState("");
  const [invoices, setInvoices] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);

  // 1. INITIALIZATION SEQUENCE
  useEffect(() => {
    async function init() {
      try {
        // A. Get User Details (Improved to prevent "Unknown Name")
        const attributes = await fetchUserAttributes();
        
        // Use 'name' if it exists, otherwise use 'email' or a fallback
        const finalName = attributes.name || attributes.email || "Employee";
        
        setUserName(finalName);
        setUserEmail(attributes.email);

        const myUserId = attributes.sub || attributes.email;
        setUserId(myUserId);
        
        // B. Check Admin Status
        const session = await fetchAuthSession();
        let adminStatus = false;
        if (session.tokens) {
            const groups = session.tokens.accessToken.payload['cognito:groups'] || [];
            adminStatus = groups.includes('Admins');
            setIsAdmin(adminStatus);
        }

        // C. Fetch Data
        fetchInvoices();

      } catch (error) {
        console.log("Initialization Error:", error);
      }
    }
    init();
  }, []);

  // 2. FETCH FUNCTION
  const fetchInvoices = async () => {
    try {
      const url = `${API_ENDPOINT}/invoices`; 
      console.log("Fetching all data from:", url);

      const response = await axios.get(url);
      
      let data = response.data;
      if (data.body && typeof data.body === 'string') {
          data = JSON.parse(data.body);
      }
      console.log("Data received:", data.length, "items");
      setInvoices(data);
    } catch (e) {
      console.error("Error fetching invoices:", e);
    }
  };

  return (
    <Authenticator loginMechanisms={['email']} signUpAttributes={['name']}>
      {({ signOut }) => (
          <Router>
              <div className="app-container" style={{minHeight: '100vh', display: 'flex', flexDirection: 'column'}}>
                  
                  {/* --- NAVIGATION BAR --- */}
                  <nav style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 30px', background: '#1a1a1a', borderBottom: '1px solid #333'}}>
                      <div style={{display: 'flex', alignItems: 'center', gap: '20px'}}>
                          <h3 style={{margin: 0, color: 'white'}}>🧾 Smart Accountant</h3>
                          
                          <Link to="/" style={{color: '#aaa', textDecoration: 'none', fontWeight: 'bold'}}>Upload</Link>
                          
                          {isAdmin ? (
                              <Link to="/admin" style={{color: '#ef4444', textDecoration: 'none', fontWeight: 'bold', border: '1px solid #ef4444', padding: '5px 10px', borderRadius: '4px'}}>
                                  👨‍💼 CFO Panel
                              </Link>
                          ) : (
                              <Link to="/dashboard" style={{color: '#aaa', textDecoration: 'none', fontWeight: 'bold'}}>
                                  My Expenses
                              </Link>
                          )}
                      </div>

                      <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                          <span style={{color: '#666', fontSize: '14px'}}>Hi, {userName} {isAdmin && <span style={{color: '#ef4444'}}>(Admin)</span>}</span>
                          <button onClick={signOut} style={{padding: '6px 12px', fontSize: '12px', background: '#333', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'}}>Sign Out</button>
                      </div>
                  </nav>

                  {/* --- MAIN CONTENT --- */}
                  <div style={{ flex: 1, padding: '20px' }}>
                      <Routes>
                          <Route path="/" element={
                              <UploadForm 
                                userId={userId} 
                                userName={userName} 
                                onUploadSuccess={fetchInvoices} 
                              />
                          } />
                          
                          {/* Employee Dashboard */}
                          <Route path="/dashboard" element={
                              !isAdmin ? (
                                  <Dashboard 
                                    userId={userId} 
                                    invoices={invoices.filter(inv => 
                                        (inv.UserId === userId) || 
                                        (inv.UserEmail && inv.UserEmail === userEmail) ||
                                        (inv.UserName && inv.UserName === userName)
                                    )} 
                                    onRefresh={fetchInvoices} 
                                  />
                              ) : (
                                  <Navigate to="/admin" replace />
                              )
                          } />

                          {/* Admin Panel */}
                          <Route path="/admin" element={
                              isAdmin ? <AdminPanel invoices={invoices} /> : <div style={{textAlign: 'center', marginTop: '50px', color: '#ef4444'}}>⛔ Access Denied</div>
                          } />
                      </Routes>
                  </div>
              </div>
          </Router>
      )}
    </Authenticator>
  );
}

export default App;