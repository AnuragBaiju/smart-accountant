import React, { useState, useMemo } from 'react';
import axios from 'axios';

export default function AdminPanel({ invoices, currentUserId, currentUserName }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedUser, setSelectedUser] = useState(null);
  const [localResolved, setLocalResolved] = useState([]); 
  const [selectedMonth, setSelectedMonth] = useState("All Time");
  
  const [sortConfig, setSortConfig] = useState({ key: 'DateProcessed', direction: 'desc' });

  // --- 1. FIND THE "HERO" NAME ---
  // We scan your data to find the one REAL name (e.g. "Anurag Baiju")
  // and we will force EVERY receipt to use this name.
  const heroName = useMemo(() => {
      // A. Look for a real name in the receipt history
      const foundInHistory = invoices.find(inv => 
          inv.UserName && 
          !['Unknown', 'Unknown Name', 'Unknown_User', 'Admin User', 'My Account'].includes(inv.UserName)
      );
      if (foundInHistory) return foundInHistory.UserName;

      // B. If not found in receipts, use the login name
      if (currentUserName && currentUserName !== 'Unknown') return currentUserName;

      // C. Last resort
      return "My Account";
  }, [invoices, currentUserName]);

  // --- 2. THE SLEDGEHAMMER MERGE ---
  // Force 100% of receipts to belong to the Current User & Hero Name
  const unifiedInvoices = useMemo(() => {
      return invoices.map(inv => {
          return {
              ...inv,
              // FORCE everything to match the logged-in ID (or a Master ID)
              UserId: currentUserId || 'MASTER_USER_ID', 
              // FORCE everything to show the Hero Name
              UserName: heroName
          };
      });
  }, [invoices, currentUserId, heroName]);

  // --- 3. FILTER BY MONTH ---
  const filteredInvoices = useMemo(() => {
    if (selectedMonth === "All Time") return unifiedInvoices;
    return unifiedInvoices.filter(inv => {
        const dateStr = inv.DateProcessed || inv.UploadDate || "";
        return dateStr.startsWith(selectedMonth);
    });
  }, [unifiedInvoices, selectedMonth]);

  // --- 4. GET AVAILABLE MONTHS ---
  const availableMonths = useMemo(() => {
      const months = new Set(["All Time"]);
      unifiedInvoices.forEach(inv => {
          const d = inv.DateProcessed || inv.UploadDate;
          if(d && d.match(/^\d{4}-\d{2}/) && !d.startsWith('2099')) {
              months.add(d.slice(0, 7));
          }
      });
      return Array.from(months).sort().reverse();
  }, [unifiedInvoices]);

  // --- 5. PROCESS USER DATA (Now Guaranteed to be 1 User) ---
  const usersData = useMemo(() => {
    const userMap = {};

    filteredInvoices.forEach(inv => {
        if (inv.Type === 'Budget') return;
        
        // We use the forced ID, so everyone goes into the same bucket
        const groupId = inv.UserId; 
        
        if (!userMap[groupId]) {
            userMap[groupId] = { 
                id: groupId, 
                name: inv.UserName, 
                budget: 2000, 
                spent: 0, 
                txCount: 0 
            };
        }

        let cleanAmount = parseFloat(inv.DetectedTotal.replace(/[$,]/g, '')) || 0;
        userMap[groupId].spent += Math.abs(cleanAmount);
        userMap[groupId].txCount += 1;
    });

    // Capture Budgets
    unifiedInvoices.forEach(inv => {
        if (inv.Type === 'Budget' && userMap[inv.UserId]) {
            userMap[inv.UserId].budget = parseFloat(inv.DetectedTotal);
        }
    });

    return Object.values(userMap);
  }, [filteredInvoices, unifiedInvoices]);

  const totalSpend = usersData.reduce((acc, curr) => acc + curr.spent, 0).toFixed(2);

  // --- 6. AUDIT QUEUE ---
  const riskyInvoices = filteredInvoices.filter(inv => 
      inv.RiskFlag && 
      inv.RiskFlag !== 'RESOLVED' &&
      !localResolved.includes(inv.InvoiceId) &&
      inv.Type !== 'Budget'
  );
  
  const totalRiskValue = riskyInvoices.reduce((acc, curr) => {
      const val = parseFloat(curr.DetectedTotal.replace(/[$,]/g, '')) || 0;
      return acc + Math.abs(val);
  }, 0).toFixed(2);

  // --- 7. CLEAN HISTORY ---
  const cleanHistory = useMemo(() => {
    let data = filteredInvoices.filter(inv => {
        if (inv.Type === 'Budget') return false;
        
        const amount = parseFloat(inv.DetectedTotal.replace(/[$,]/g, ''));
        if (!amount || amount <= 0 || isNaN(amount)) return false;
        if ((!inv.Vendor || inv.Vendor === "Unknown Vendor") && !inv.DateProcessed) return false;

        return true;
    });

    if (sortConfig.key) {
        data.sort((a, b) => {
            let aVal = a[sortConfig.key];
            let bVal = b[sortConfig.key];

            if (sortConfig.key === 'DetectedTotal') {
                aVal = parseFloat(aVal.replace(/[$,]/g, '')) || 0;
                bVal = parseFloat(bVal.replace(/[$,]/g, '')) || 0;
            }
            if (sortConfig.key === 'DateProcessed') {
                aVal = a.DateProcessed || a.UploadDate || "";
                bVal = b.DateProcessed || b.UploadDate || "";
            }
            if (sortConfig.key === 'UserName') {
                aVal = (a.UserName || "").toLowerCase();
                bVal = (b.UserName || "").toLowerCase();
            }

            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }
    return data;
  }, [filteredInvoices, localResolved, sortConfig]);

  // --- UTILS ---
  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const getSortIcon = (name) => {
      if (sortConfig.key !== name) return <span style={{opacity: 0.3}}>↕</span>;
      return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const API_URL = "https://ytywhx6eq0.execute-api.us-east-1.amazonaws.com/prod"; 

  const updateBudget = async (userId, newAmount) => {
    try {
        if (selectedUser) setSelectedUser({ ...selectedUser, budget: parseFloat(newAmount) });
        await axios.post(`${API_URL}/pay`, { user_id: userId, budget_amount: newAmount });
        alert("Budget saved to Cloud! ☁️");
    } catch (e) { alert("Error saving budget."); }
  };

  const handleResolve = async (invoiceId) => {
      try {
          setLocalResolved(prev => [...prev, invoiceId]);
          await axios.post(`${API_URL}/pay`, { action: 'resolve', invoice_id: invoiceId });
      } catch (e) { alert("Failed to dismiss alert."); }
  };

  const UserModal = ({ user, onClose, onSaveBudget }) => {
    const [budgetInput, setBudgetInput] = useState(user.budget);
    const percent = Math.min((user.spent / user.budget) * 100, 100);
    const barColor = percent > 90 ? '#ef4444' : percent > 70 ? '#f59e0b' : '#10b981';
    
    // Using filteredInvoices for modal data
    const userTx = filteredInvoices.filter(inv => {
        const val = parseFloat(inv.DetectedTotal.replace(/[$,]/g, '')) || 0;
        return inv.Type !== 'Budget' && val > 0 && !isNaN(val);
    });

    return (
        <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000}}>
            <div style={{background: '#1e1e1e', width: '600px', borderRadius: '12px', padding: '30px', border: '1px solid #333', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                    <h3 style={{margin: 0, color: 'white'}}>{user.name}</h3>
                    <button onClick={onClose} style={{background: 'none', border: 'none', color: '#888', fontSize: '24px', cursor: 'pointer'}}>×</button>
                </div>
                <div style={{marginBottom: '20px', background: '#252525', padding: '15px', borderRadius: '8px'}}>
                    <label style={{display: 'block', color: '#888', fontSize: '12px', marginBottom: '8px', textTransform: 'uppercase'}}>Set Monthly Limit</label>
                    <div style={{display: 'flex', gap: '10px'}}>
                        <input type="number" value={budgetInput} onChange={(e) => setBudgetInput(e.target.value)} style={{background: '#111', border: '1px solid #444', color: 'white', padding: '8px', borderRadius: '4px', flex: 1}} />
                        <button onClick={() => onSaveBudget(user.id, budgetInput)} style={{background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', padding: '0 15px', cursor: 'pointer', fontWeight: 'bold'}}>Save</button>
                    </div>
                </div>
                <div style={{marginBottom: '20px'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px'}}>
                        <span style={{color: '#aaa'}}>Utilization ({selectedMonth})</span>
                        <span style={{color: barColor, fontWeight: 'bold'}}>${user.spent.toFixed(2)} / ${user.budget}</span>
                    </div>
                    <div style={{height: '10px', background: '#111', borderRadius: '5px', overflow: 'hidden'}}><div style={{width: `${percent}%`, height: '100%', background: barColor}}></div></div>
                </div>
                <h4 style={{color: '#888', fontSize: '12px', textTransform: 'uppercase', borderBottom: '1px solid #333', paddingBottom: '10px', marginBottom: '10px'}}>Transactions ({selectedMonth})</h4>
                <div style={{maxHeight: '200px', overflowY: 'auto', paddingRight: '5px'}}>
                    {userTx.map((tx, i) => (
                        <div key={i} style={{display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #333', fontSize: '13px'}}>
                            <div style={{display: 'flex', flexDirection: 'column'}}>
                                <span style={{color: 'white'}}>{tx.DateProcessed || "--"} - {tx.Vendor}</span>
                                <span style={{fontSize: '11px', color: '#666'}}>{tx.Category}</span>
                            </div>
                            <span style={{color: tx.RiskFlag === 'RESOLVED' ? '#10b981' : tx.RiskFlag ? '#ef4444' : '#ccc', fontWeight: 'bold'}}>
                                {tx.DetectedTotal}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
  };

  return (
    <div style={{marginTop: '20px', maxWidth: '1100px', margin: '30px auto'}}>
      
      {/* HEADER SECTION */}
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px'}}>
         <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
            <h2 style={{margin: 0}}>👨‍💼 CFO Command Center</h2>
            <div style={{background: 'rgba(239, 68, 68, 0.15)', padding: '4px 10px', borderRadius: '6px', border: '1px solid #ef4444', color: '#ef4444', fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.5px'}}>ADMIN MODE</div>
         </div>
         <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
             <span style={{color: '#888', fontSize: '14px'}}>Period:</span>
             <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} style={{padding: '8px 12px', background: '#222', border: '1px solid #444', color: 'white', borderRadius: '6px', cursor: 'pointer'}}>
                 {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
             </select>
         </div>
      </div>

      <div style={{display: 'flex', gap: '30px', borderBottom: '1px solid #333', marginBottom: '30px'}}>
          <button onClick={() => setActiveTab('overview')} style={{background: 'none', border: 'none', color: activeTab === 'overview' ? 'white' : '#666', padding: '10px 0', borderBottom: activeTab === 'overview' ? '2px solid #ef4444' : '2px solid transparent', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px'}}>Risk Overview</button>
          <button onClick={() => setActiveTab('team')} style={{background: 'none', border: 'none', color: activeTab === 'team' ? 'white' : '#666', padding: '10px 0', borderBottom: activeTab === 'team' ? '2px solid #ef4444' : '2px solid transparent', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px'}}>Team Budgets</button>
      </div>

      {activeTab === 'overview' && (
        <>
            <div style={{display: 'flex', gap: '20px', marginBottom: '30px'}}>
                <div style={{flex: 1, background: '#1a1a1a', padding: '25px', borderRadius: '12px', border: '1px solid #333', borderLeft: '4px solid #ef4444'}}>
                    <div style={{color: '#ef4444', fontSize: '12px', fontWeight: 'bold', marginBottom: '10px', textTransform: 'uppercase'}}>Risk Value ({selectedMonth})</div>
                    <div style={{fontSize: '32px', fontWeight: 'bold', color: 'white'}}>${totalRiskValue}</div>
                </div>
                <div style={{flex: 1, background: '#1a1a1a', padding: '25px', borderRadius: '12px', border: '1px solid #333', borderLeft: '4px solid #3b82f6'}}>
                    <div style={{color: '#3b82f6', fontSize: '12px', fontWeight: 'bold', marginBottom: '10px', textTransform: 'uppercase'}}>Total Spend ({selectedMonth})</div>
                    <div style={{fontSize: '32px', fontWeight: 'bold', color: 'white'}}>${totalSpend}</div>
                </div>
            </div>

            {riskyInvoices.length > 0 && (
                <div style={{marginBottom: '40px'}}>
                    <h3 style={{color: '#ef4444', fontSize: '14px', textTransform: 'uppercase', marginBottom: '15px'}}>⚠️ Audit Queue (Action Required)</h3>
                    <div style={{background: '#2a1a1a', borderRadius: '8px', border: '1px solid #ef4444', overflow: 'hidden'}}>
                        <table style={{width: '100%', borderCollapse: 'collapse'}}>
                            <thead>
                                <tr style={{textAlign: 'left', background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', fontSize: '13px'}}>
                                    <th style={{padding: '15px'}}>Date</th>
                                    <th style={{padding: '15px'}}>Employee</th>
                                    <th style={{padding: '15px'}}>AI Reason</th>
                                    <th style={{padding: '15px'}}>Evidence</th>
                                    <th style={{padding: '15px'}}>Amount</th>
                                    <th style={{padding: '15px'}}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {riskyInvoices.map(inv => (
                                    <tr key={inv.InvoiceId} style={{borderBottom: '1px solid #442'}}>
                                        <td style={{padding: '15px', color: '#ccc', fontSize: '13px'}}>
                                            {inv.DateProcessed || (inv.UploadDate ? inv.UploadDate.slice(0, 10) : "N/A")}
                                        </td>
                                        <td style={{padding: '15px', color: 'white', fontWeight: 'bold'}}>{inv.UserName}</td>
                                        <td style={{padding: '15px', color: '#fca5a5', fontSize: '13px'}}>{inv.AiSummary || "Suspicious Pattern"}</td>
                                        <td style={{padding: '15px'}}><a href={inv.PdfUrl} target="_blank" rel="noreferrer" style={{color: '#3b82f6'}}>View PDF ↗</a></td>
                                        <td style={{padding: '15px', color: '#ef4444', fontWeight: 'bold'}}>{inv.DetectedTotal}</td>
                                        <td style={{padding: '15px'}}><button onClick={() => handleResolve(inv.InvoiceId)} style={{background: '#333', color: '#ccc', border: '1px solid #555', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px'}}>Dismiss</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <h3 style={{color: '#888', fontSize: '14px', textTransform: 'uppercase', marginBottom: '15px'}}>Transaction History ({selectedMonth})</h3>
            <div style={{background: '#1a1a1a', borderRadius: '8px', border: '1px solid #333', overflow: 'hidden'}}>
                <table style={{width: '100%', borderCollapse: 'collapse'}}>
                    <thead>
                        <tr style={{textAlign: 'left', background: '#222', color: '#888', fontSize: '13px'}}>
                            <th onClick={() => requestSort('DateProcessed')} style={{padding: '15px', cursor: 'pointer', userSelect: 'none'}}>Date {getSortIcon('DateProcessed')}</th>
                            <th onClick={() => requestSort('UserName')} style={{padding: '15px', cursor: 'pointer', userSelect: 'none'}}>Employee {getSortIcon('UserName')}</th>
                            <th onClick={() => requestSort('Vendor')} style={{padding: '15px', cursor: 'pointer', userSelect: 'none'}}>Vendor {getSortIcon('Vendor')}</th>
                            <th style={{padding: '15px'}}>Evidence</th>
                            <th onClick={() => requestSort('DetectedTotal')} style={{padding: '15px', cursor: 'pointer', userSelect: 'none'}}>Amount {getSortIcon('DetectedTotal')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cleanHistory.length > 0 ? cleanHistory.map(inv => (
                            <tr key={inv.InvoiceId} style={{borderBottom: '1px solid #333'}}>
                                <td style={{padding: '15px', color: '#666', fontSize: '13px'}}>
                                    {inv.DateProcessed || (inv.UploadDate ? inv.UploadDate.slice(0, 10) : "N/A")}
                                </td>
                                <td style={{padding: '15px', color: '#aaa', fontSize: '13px', fontWeight: 'bold'}}>{inv.UserName}</td>
                                <td style={{padding: '15px', color: 'white'}}>{inv.Vendor}</td>
                                <td style={{padding: '15px'}}><a href={inv.PdfUrl} target="_blank" rel="noreferrer" style={{color: '#3b82f6', textDecoration: 'none', fontSize: '13px'}}>View PDF ↗</a></td>
                                <td style={{padding: '15px', color: '#10b981', fontWeight: 'bold'}}>{inv.DetectedTotal}</td>
                            </tr>
                        )) : (<tr><td colSpan="5" style={{padding: '40px', textAlign: 'center', color: '#555'}}>No transactions found.</td></tr>)}
                    </tbody>
                </table>
            </div>
        </>
      )}

      {activeTab === 'team' && (
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px'}}>
              {usersData.length > 0 ? usersData.map(u => {
                  const percent = Math.min((u.spent / u.budget) * 100, 100);
                  const isOver = percent >= 100;
                  return (
                      <div key={u.id} onClick={() => setSelectedUser(u)} style={{background: '#1a1a1a', padding: '20px', borderRadius: '12px', cursor: 'pointer', border: isOver ? '1px solid #ef4444' : '1px solid #333', transition: 'all 0.2s hover'}}>
                          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '20px'}}>
                              <div><div style={{fontWeight: 'bold', fontSize: '16px', color: 'white'}}>{u.name}</div><div style={{color: '#555', fontSize: '12px', marginTop: '4px'}}>{u.txCount} Receipts</div></div>
                              {isOver && <span style={{background: '#ef4444', color: 'white', fontSize: '10px', padding: '2px 6px', borderRadius: '4px'}}>OVER BUDGET</span>}
                          </div>
                          <div style={{marginBottom: '5px', display: 'flex', justifyContent: 'space-between', fontSize: '13px'}}><span style={{color: isOver ? '#ef4444' : '#ccc'}}>${u.spent.toFixed(2)}</span><span style={{color: '#555'}}>${u.budget}</span></div>
                          <div style={{height: '6px', background: '#333', borderRadius: '3px', overflow: 'hidden'}}><div style={{width: `${percent}%`, height: '100%', background: isOver ? '#ef4444' : '#10b981'}}></div></div>
                      </div>
                  )
              }) : (<p style={{color: '#666', gridColumn: '1/-1', textAlign: 'center'}}>No users found for {selectedMonth}.</p>)}
          </div>
      )}

      {selectedUser && <UserModal user={selectedUser} onClose={() => setSelectedUser(null)} onSaveBudget={updateBudget} />}
    </div>
  );
}