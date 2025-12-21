import React, { useState } from 'react';
import { uploadData } from 'aws-amplify/storage';

export default function UploadForm({ userId, userName, onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle'); // options: 'idle', 'uploading', 'success', 'error'

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setStatus('idle');
  };

  const handleUpload = async () => {
    if (!file) {
        alert("Please select a file first!");
        return;
    }

    try {
      setStatus('uploading');

      // 1. Sanitize Filename (spaces cause bugs in URLs)
      const cleanFileName = file.name.replace(/\s+/g, '_');
      const uniqueKey = `${userId}/${Date.now()}_${cleanFileName}`;

      // 2. SAFETY CHECK: Ensure we always have a name
      // If userName is blank, use the first part of the userId (email)
      const safeUserName = userName && userName.length > 0 ? userName : userId;

      // 3. Upload with Metadata
      await uploadData({
        key: uniqueKey,
        data: file,
        options: {
            metadata: {
                userid: userId, 
                username: safeUserName // Now guaranteed to have a value
            }
        }
      }).result;

      // 4. Success State (No Alert!)
      setStatus('success');
      setFile(null);
      
      // 5. Auto-Refresh after 3.5 seconds without blocking UI
      setTimeout(() => {
          if (onUploadSuccess) onUploadSuccess();
          setStatus('idle'); // Reset form ready for next one
      }, 3500);

    } catch (error) {
      console.error("Error : ", error);
      alert(`Upload failed: ${error.message}`);
      setStatus('idle');
    }
  };

  return (
    <div style={{
        marginTop: '20px', 
        padding: '40px', 
        border: '1px solid #333', 
        borderRadius: '12px', 
        textAlign: 'center',
        background: '#111'
    }}>
      <h2 style={{color: '#aaa', marginTop: 0}}>📥 Upload Receipt</h2>
      <p style={{fontSize: '12px', color: '#555', marginBottom: '20px'}}>
          Uploading as: <strong>{userName || userId}</strong>
      </p>

      {/* DYNAMIC STATUS UI */}
      {status === 'uploading' && (
          <button disabled style={{padding: '10px 20px', fontSize: '16px', borderRadius: '6px', border: 'none', background: '#333', color: '#888', cursor: 'wait'}}>
              ⏳ Uploading...
          </button>
      )}

      {status === 'success' && (
          <div style={{color: '#10b981', fontWeight: 'bold', fontSize: '18px', animation: 'fadeIn 0.5s', padding: '10px'}}>
              ✅ Upload Complete! Processing...
          </div>
      )}

      {status === 'idle' && (
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px'}}>
              <input 
                  type="file" 
                  onChange={handleFileChange} 
                  accept="image/*,.pdf"
                  style={{color: 'white'}}
              />
              {file && (
                  <button onClick={handleUpload} style={{padding: '10px 20px', fontSize: '16px', borderRadius: '6px', border: 'none', background: '#2563eb', color: 'white', cursor: 'pointer', fontWeight: 'bold'}}>
                      Upload Receipt 🚀
                  </button>
              )}
          </div>
      )}
    </div>
  );
}