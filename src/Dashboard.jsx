import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { uploadData } from 'aws-amplify/storage'; 

const API_URL = import.meta.env.VITE_API_URL;

export default function Dashboard({ invoices, onRefresh, userId }) {
  const [loadingId, setLoadingId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState("All Time");
  const [myBudget, setMyBudget] = useState(2000); 

  // --- 1. FETCH BUDGET ---
  useEffect(() => {
      if (!invoices) return;
      const budgetItem = invoices.find(inv => 
          inv.Type === 'Budget' && 
          (inv.UserId === userId || (inv.InvoiceId && inv.InvoiceId.includes(userId)))
      );
      if (budgetItem) {
          const val = parseFloat(budgetItem.DetectedTotal.replace(/[$,]/g, ''));
          setMyBudget(val);
      }
  }, [invoices, userId]);

  // --- 2. UPLOAD FUNCTION ---
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      await uploadData({
        key: file.name,
        data: file,
        options: { accessLevel: 'guest' }
      }).result;

      alert(`✅ Uploaded: ${file.name}\nIt will appear in the list momentarily.`);
      
      // Force refresh
      setTimeout(() => {
        if (onRefresh) onRefresh();
        else window.location.reload(); 
      }, 4000);

    } catch (error) {
      console.error("Upload failed", error);
      alert("Upload failed. Check console.");
    } finally {
      setUploading(false);
      e.target.value = null; 
    }
  };

  const handlePay = async (invoiceId) => {
    try {
        setLoadingId(invoiceId);
        await axios.post(`${API_URL}/pay`, { invoice_id: invoiceId });
        alert("Payment Recorded! 💸");
        if(onRefresh) onRefresh(); 
    } catch (err) {
        console.error(err);
        alert("Payment failed.");
    } finally {
        setLoadingId(null);
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
        case 'Food & Dining': return '#7c3aed';
        case 'Transportation': return '#db2777';
        case 'Groceries': return '#059669';
        case 'Utilities': return '#d97706';
        case 'Software/Subscription': return '#0891b2';
        case 'Business Services': return '#2563eb';
        default: return '#4b5563';
    }
  };

  // --- 3. FILTERING (Now allows duplicates!) ---
  const cleanInvoices = useMemo(() => {
      if (!invoices) return [];
      
      // Sort: Newest Uploads First
      const sortedRaw = [...invoices].sort((a, b) => {
          const dateA = new Date(a.DateProcessed || a.UploadDate || 0);
          const dateB = new Date(b.DateProcessed || b.UploadDate || 0);
          return dateB - dateA;
      });

      return sortedRaw.filter(inv => {
          if (inv.Type === 'Budget') return false;

          const amountStr = inv.DetectedTotal || "0";
          const amount = parseFloat(amountStr.replace(/[$,]/g, ''));

          // Rule 1: Money must be positive number (Hides $0.00 / negative errors)
          if (!amount || isNaN(amount) || amount <= 0.01) return false;

          // Rule 2: Must have a Vendor Name
          if (!inv.Vendor || inv.Vendor === "Unknown Vendor") return false;

          // Rule 3: Must have a PDF (unless it's barely uploaded)
          const isProcessing = !inv.DateProcessed; 
          if (!isProcessing && (!inv.PdfUrl || inv.PdfUrl === "undefined")) return false;

          // REMOVED "Smart Deduplication". 
          // Now, if you have 4 identical receipts, it will show all 4.
          
          return true;
      });
  }, [invoices]);

  const availableMonths = useMemo(() => {
    const months = new Set();
    months.add("All Time");
    cleanInvoices.forEach(inv => {
        const dateStr = inv.DateProcessed || inv.UploadDate;
        if (dateStr && dateStr.length >= 7 && !dateStr.includes('2099')) {
            months.add(dateStr.slice(0, 7));
        }
    });
    return Array.from(months).sort().reverse();
  }, [cleanInvoices]);

  const filteredInvoices = useMemo(() => {
    const data = selectedMonth === "All Time" 
        ? cleanInvoices 
        : cleanInvoices.filter(inv => (inv.DateProcessed || inv.UploadDate || "").startsWith(selectedMonth));
    
    return data;
  }, [cleanInvoices, selectedMonth]);

  // --- 4. CALCULATIONS ---
  const owedList = filteredInvoices.filter(inv => ['Business Services', 'Utilities', 'Software/Subscription'].includes(inv.Category) && inv.Status !== 'PAID');
  const spentList = filteredInvoices.filter(inv => !['Business Services', 'Utilities', 'Software/Subscription'].includes(inv.Category) || inv.Status === 'PAID');
  
  const calculateTotal = (list) => {
    return list.reduce((acc, curr) => {
        const cleanNum = curr.DetectedTotal.toString().replace(/[$,€\s-]/g, '');
        return acc + (parseFloat(cleanNum) || 0);
    }, 0).toFixed(2);
  };

  const totalMonthlySpend = parseFloat(filteredInvoices.reduce((acc, curr) => {
      const cleanNum = curr.DetectedTotal.toString().replace(/[$,€\s-]/g, '');
      return acc + (parseFloat(cleanNum) || 0);
  }, 0).toFixed(2));

  const budgetPercent = Math.min((totalMonthlySpend / myBudget) * 100, 100);
  const isOverBudget = totalMonthlySpend > myBudget;
  const barColor = isOverBudget ? '#ef4444' : budgetPercent > 75 ? '#f59e0b' : '#10b981';

  const chartData = useMemo(() => {
    const totals = {};
    filteredInvoices.forEach(inv => {
        const cleanNum = parseFloat(inv.DetectedTotal.toString().replace(/[$,€\s-]/g, '')) || 0;
        const cat = inv.Category || "General";
        if (totals[cat]) totals[cat] += cleanNum;
        else totals[cat] = cleanNum;
    });
    return Object.keys(totals).map(cat => ({ name: cat, value: totals[cat], color: getCategoryColor(cat) }));
  }, [filteredInvoices]);

  // --- 5. UI COMPONENTS ---
  const InvoiceTable = ({ data, showPayButton }) => (
    <table style={{ width: '100%', borderCollapse: 'collapse', background: '#1e1e1e', borderRadius: '8px', overflow: 'hidden', marginBottom: '40px' }}>
      <thead>
        <tr style={{ borderBottom: '2px solid #333', textAlign: 'left', background: '#252525', color: '#ccc' }}>
          <th style={{padding: '15px'}}>Date</th>
          <th style={{padding: '15px'}}>Vendor</th>
          <th style={{padding: '15px'}}>Category</th>
          <th style={{padding: '15px'}}>Total</th>
          <th style={{padding: '15px'}}>Action</th>
        </tr>
      </thead>
      <tbody>
        {data.map((inv) => (
          <tr key={inv.InvoiceId || Math.random()} style={{ borderBottom: '1px solid #333' }}>
            <td style={{padding: '15px', color: '#aaa', fontSize: '14px'}}>
                {(inv.DateProcessed || inv.UploadDate || "").slice(0, 10) || "Pending"}
            </td>
            <td style={{padding: '15px', fontWeight: 'bold', color: 'white'}}>{inv.Vendor || "Unknown Vendor"}</td>
            <td style={{padding: '15px'}}><span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', backgroundColor: getCategoryColor(inv.Category), color: 'white' }}>{inv.Category || "Pending"}</span></td>
            <td style={{padding: '15px', fontWeight: 'bold', color: '#4ade80'}}>
                ${parseFloat((inv.DetectedTotal || "0").toString().replace(/[$,]/g, '')).toFixed(2)}
            </td>
            <td style={{padding: '15px'}}>
              {showPayButton ? (
                  <button onClick={() => handlePay(inv.InvoiceId)} disabled={loadingId === inv.InvoiceId} style={{padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold', backgroundColor: loadingId === inv.InvoiceId ? '#555' : '#10b981', color: 'white'}}>{loadingId === inv.InvoiceId ? "..." : "Pay"}</button>
              ) : (
                inv.PdfUrl ? <a href={inv.PdfUrl} target="_blank" rel="noreferrer" style={{color: '#3b82f6', textDecoration: 'none'}}>View PDF ↗</a> : <span style={{color: '#666'}}>Processing...</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div style={{ marginTop: '30px', textAlign: 'left', maxWidth: '1000px', margin: '30px auto' }}>
      
      {/* HEADER WITH UPLOAD BUTTON */}
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px'}}>
        <h2 style={{margin: 0}}>My Expenses</h2>
        
        <div style={{display: 'flex', gap: '15px', alignItems: 'center'}}>
            
            <div style={{ position: 'relative', overflow: 'hidden', display: 'inline-block' }}>
               <button disabled={uploading} style={{
                   backgroundColor: uploading ? '#6b7280' : '#2563eb',
                   color: 'white', padding: '8px 16px', borderRadius: '6px', 
                   border: 'none', cursor: 'pointer', fontWeight: 'bold',
                   display: 'flex', alignItems: 'center', gap: '8px'
               }}>
                   {uploading ? 'Uploading...' : '☁️ Upload Invoice'}
               </button>
               <input 
                   type="file" 
                   onChange={handleFileUpload}
                   disabled={uploading}
                   style={{
                       position: 'absolute', left: 0, top: 0, 
                       opacity: 0, cursor: 'pointer', width: '100%', height: '100%'
                   }} 
               />
            </div>

            <div>
                <span style={{color: '#aaa', marginRight: '10px'}}>Viewing:</span>
                <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} style={{padding: '8px 12px', borderRadius: '6px', border: '1px solid #444', background: '#222', color: 'white', fontSize: '16px', cursor: 'pointer'}}>
                    {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
            </div>
        </div>
      </div>

      {/* STATS AREA */}
      <div style={{display: 'flex', gap: '20px', marginBottom: '40px', alignItems: 'stretch', flexWrap: 'wrap'}}>
        
        <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: '20px'}}>
            <div style={{flex: 1, background: '#1a1a1a', padding: '15px 20px', borderRadius: '12px', border: '1px solid #333', display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px'}}>
                    <span style={{color: '#aaa', fontSize: '12px', textTransform: 'uppercase'}}>Budget (Cloud Synced)</span>
                    <span style={{color: isOverBudget ? '#ef4444' : '#10b981', fontWeight: 'bold'}}>{budgetPercent.toFixed(0)}% Used</span>
                </div>
                <div style={{fontSize: '28px', color: 'white', fontWeight: 'bold'}}>${totalMonthlySpend.toFixed(2)} <span style={{fontSize: '16px', color: '#666'}}>/ ${myBudget}</span></div>
                <div style={{width: '100%', height: '6px', background: '#333', borderRadius: '3px', marginTop: '10px', overflow: 'hidden'}}><div style={{width: `${budgetPercent}%`, height: '100%', background: barColor}}></div></div>
            </div>
            <div style={{flex: 1, background: '#1a1a1a', padding: '15px 20px', borderRadius: '12px', borderLeft: '5px solid #2563eb', display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
                <span style={{color: '#aaa', fontSize: '12px', textTransform: 'uppercase'}}>Total Owed</span><strong style={{color: 'white', fontSize: '28px'}}>${calculateTotal(owedList)}</strong>
            </div>
        </div>

        {/* CHART BOX */}
        <div style={{flex: 1, background: '#1a1a1a', borderRadius: '12px', padding: '20px', minWidth: '300px', border: '1px solid #333', minHeight: '250px'}}>
            <h4 style={{marginTop: 0, marginBottom: '20px', color: '#aaa', textAlign: 'center'}}>Spending by Category</h4>
            {chartData.length > 0 ? (
                // This Wrapper Fixes the Crash
                <div style={{ width: '100%', height: '200px', minHeight: '200px' }}> 
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                {chartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} stroke="none"/>))}
                            </Pie>
                            <Tooltip contentStyle={{backgroundColor: '#333', border: 'none', borderRadius: '8px'}} formatter={(value) => `$${value.toFixed(2)}`}/>
                            <Legend verticalAlign="bottom" height={36}/>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            ) : (<p style={{textAlign: 'center', color: '#555', marginTop: '60px'}}>No data to display</p>)}
        </div>
      </div>

      {/* TABLES */}
      {owedList.length > 0 && <><h3 style={{color: '#93c5fd', borderBottom: '1px solid #333', paddingBottom: '10px'}}>🧾 Bills Due</h3><InvoiceTable data={owedList} showPayButton={true} /></>}
      {spentList.length > 0 && <><h3 style={{color: '#86efac', borderBottom: '1px solid #333', paddingBottom: '10px'}}>✅ Paid Expenses</h3><InvoiceTable data={spentList} showPayButton={false} /></>}
      
      {owedList.length === 0 && spentList.length === 0 && (
          <div style={{textAlign: 'center', color: '#666', marginTop: '40px', padding: '40px', border: '2px dashed #333', borderRadius: '12px'}}>
              <h3>No expenses found.</h3>
              <p>Try uploading an invoice using the button above!</p>
          </div>
      )}
    </div>
  );
}