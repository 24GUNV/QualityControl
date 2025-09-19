import React, { useState, useEffect, useMemo } from 'react';
import './App.css';
import { 
    collection, 
    addDoc, 
    onSnapshot, 
    doc, 
    updateDoc,
    query,
    where
} from 'firebase/firestore';
import { 
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut
} from "firebase/auth";
import { appId, db, auth } from './firebase';

// Styles moved to `src/App.css` and imported at the top of this file.


// --- SVG Icons ---
const QrCodeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect><path d="M14 14h7v7h-7z"></path></svg>;
const UserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>;
const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;
const XCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>;
const ClockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>;
const LogOutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>;

// Firebase initialization moved to `src/firebase.js` and exported as { appId, db, auth }


// --- Main App Component ---
export default function App() {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    if (isLoading) {
        return <div className="loading-screen"><div className="loading-text">Loading...</div></div>;
    }

    return (
        <>
            {user ? <Dashboard user={user} /> : <LoginScreen />}
        </>
    );
}

// --- Authentication Screen Component ---
function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            setError(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-header">
                    <h2>Sign in to your account</h2>
                    <p>Quality Control System</p>
                </div>
                <div className="login-card">
                    <form className="login-form" onSubmit={handleLogin}>
                        <div>
                            <label htmlFor="email">Email address</label>
                            <input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)}
                                className="form-input" />
                        </div>

                        <div>
                            <label htmlFor="password">Password</label>
                            <input id="password" name="password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)}
                                className="form-input" />
                        </div>
                        
                        {error && <p className="error-message">{error}</p>}

                        <div>
                            <button type="submit" disabled={isSubmitting} className="submit-button">
                                {isSubmitting ? 'Signing In...' : 'Sign in'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

// --- Main Dashboard Component ---
function Dashboard({ user }) {
    const [userRole, setUserRole] = useState('Manager'); // Manager, Technician
    const [chargers, setChargers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedChargerIdForQR, setSelectedChargerIdForQR] = useState(null);
    const [currentViewChargerId, setCurrentViewChargerId] = useState(null);

    // --- Data Fetching ---
    useEffect(() => {
        const chargersCollectionRef = collection(db, `artifacts/${appId}/public/data/chargers`);
        const unsubscribe = onSnapshot(chargersCollectionRef, (snapshot) => {
            const chargersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            chargersData.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
            setChargers(chargersData);
            setIsLoading(false);
        }, (err) => {
            setError("Failed to fetch data: " + err.message);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // --- Routing ---
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const chargerId = urlParams.get('chargerId');
        if (chargerId) {
            setCurrentViewChargerId(chargerId);
        }
    }, []);
    
    const selectedChargerForDetail = useMemo(() => {
        if (!currentViewChargerId) return null;
        return chargers.find(c => c.id === currentViewChargerId);
    }, [currentViewChargerId, chargers]);
    
    const handleRowClick = (chargerId) => {
        if (userRole === 'Manager') {
            const url = new URL(window.location);
            url.searchParams.set('chargerId', chargerId);
            window.history.pushState({}, '', url);
            setCurrentViewChargerId(chargerId);
        }
    };
    
    const handleBackToDashboard = () => {
        const url = new URL(window.location);
        url.searchParams.delete('chargerId');
        window.history.pushState({}, '', url);
        setCurrentViewChargerId(null);
    };
    
    // --- Render Logic ---
    if (currentViewChargerId) {
        if (isLoading) return <div className="loading-screen"><div className="loading-text">Loading Charger Details...</div></div>;
        if (!selectedChargerForDetail) {
             return (
                <div className="dashboard">
                    <Header userEmail={user.email} />
                    <main className="main-content">
                        <div className="error-banner">Error: Charger not found. It may have been deleted.</div>
                        <div className="back-link-container">
                             <button onClick={handleBackToDashboard} className="back-button">
                                &larr; Back to Dashboard
                            </button>
                        </div>
                    </main>
                </div>
            );
        }
        // Render detail page within the main layout for consistent styling
        return (
             <div className="dashboard">
                <Header userEmail={user.email} />
                <main className="main-content">
                    <ChargerDetailPage charger={selectedChargerForDetail} onBack={handleBackToDashboard} />
                </main>
            </div>
        )
    }

    return (
        <div className="dashboard">
            <Header userEmail={user.email} />
            <main className="main-content">
                <RoleSelector currentUserRole={userRole} setUserRole={setUserRole} />
                
                {error && <div className="error-banner">{error}</div>}
                
                <div className="content-area">
                    {userRole === 'Technician' && <CreateQuoteForm />}
                    <ChargerList 
                        chargers={chargers} 
                        isLoading={isLoading} 
                        userRole={userRole} 
                        setSelectedChargerIdForQR={setSelectedChargerIdForQR}
                        onRowClick={handleRowClick}
                    />
                </div>
            </main>
            {selectedChargerIdForQR && <QRCodeModal chargerId={selectedChargerIdForQR} onClose={() => setSelectedChargerIdForQR(null)} />}
        </div>
    );
}


// --- Sub-components ---
function Header({ userEmail }) {
    const handleLogout = () => signOut(auth);
    return (
        <header className="app-header">
            <div className="header-content">
                <div className="header-title">
                    <h1>QC Dashboard</h1>
                    <p>Battery Charger Quality Control System</p>
                </div>
                <div className="header-user-info">
                    <span className="user-email">{userEmail}</span>
                    <button onClick={handleLogout} className="logout-button">
                        <LogOutIcon />
                        Logout
                    </button>
                </div>
            </div>
        </header>
    );
}

function RoleSelector({ currentUserRole, setUserRole }) {
    const roles = {
        'Manager': 'Manager View',
        'Technician': 'Technician View',
    };

    return (
        <div className="role-selector">
            <div className="role-selector-label">
                <UserIcon />
                <span>Current Role:</span>
            </div>
            <div className="role-selector-buttons">
                {Object.entries(roles).map(([roleKey, roleName]) => (
                    <button
                        key={roleKey}
                        onClick={() => setUserRole(roleKey)}
                        className={`role-button ${currentUserRole === roleKey ? 'active' : ''}`}
                    >
                        {roleName}
                    </button>
                ))}
            </div>
        </div>
    );
}

function CreateQuoteForm() {
    const [serialNumber, setSerialNumber] = useState('');
    const [model, setModel] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!serialNumber.trim() || !model.trim()) {
            setMessage('Serial Number and Model are required.');
            return;
        }
        setIsSubmitting(true);
        setMessage('');

        const newCharger = {
            serialNumber: serialNumber.trim(),
            model: model.trim(),
            createdAt: new Date(),
            status: 'Pending',
            qcChecks: [
                { id: 1, name: "Visual Inspection", status: "Pending" },
                { id: 2, name: "Input Voltage Test (110V/220V)", status: "Pending" },
                { id: 3, name: "Output Voltage Test (DC)", status: "Pending" },
                { id: 4, name: "Load Test (Rated Amperage)", status: "Pending" },
                { id: 5, name: "Safety Cutoff Check", status: "Pending" },
                { id: 6, name: "Casing & Port Integrity", status: "Pending" },
            ]
        };

        try {
            await addDoc(collection(db, `artifacts/${appId}/public/data/chargers`), newCharger);
            setMessage('Successfully created new QC quote!');
            setSerialNumber('');
            setModel('');
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            setMessage('Error creating quote: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="form-card">
            <h2>Create New QC Quote</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-grid">
                    <input
                        type="text"
                        value={serialNumber}
                        onChange={(e) => setSerialNumber(e.target.value)}
                        placeholder="Serial Number (e.g., BC-2025-001)"
                        className="form-input"
                        disabled={isSubmitting}
                    />
                    <input
                        type="text"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        placeholder="Charger Model (e.g., FastCharge-5000)"
                        className="form-input"
                        disabled={isSubmitting}
                    />
                    <button type="submit" disabled={isSubmitting} className="submit-button">
                        {isSubmitting ? 'Creating...' : 'Create Quote'}
                    </button>
                </div>
                 {message && <p className={`form-message ${message.startsWith('Error') ? 'error' : 'success'}`}>{message}</p>}
            </form>
        </div>
    );
}

function ChargerList({ chargers, isLoading, userRole, setSelectedChargerIdForQR, onRowClick }) {
    if (isLoading) {
        return <div className="loading-text">Loading chargers...</div>;
    }
    if (chargers.length === 0) {
        return <div className="empty-state">No chargers found. Please create one if you are a technician.</div>;
    }

    return (
        <div className="table-container">
            <div className="table-wrapper">
                <table className="charger-table">
                    <thead>
                        <tr>
                            <th>Serial Number</th>
                            <th>Model</th>
                            <th>Status</th>
                            <th>Created At</th>
                            {userRole === 'Manager' && <th>Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {chargers.map(charger => (
                            <tr key={charger.id} 
                                className={userRole === 'Manager' ? 'clickable-row' : ''}
                                onClick={() => onRowClick(charger.id)}
                            >
                                <td>{charger.serialNumber}</td>
                                <td>{charger.model}</td>
                                <td><StatusBadge status={charger.status} /></td>
                                <td>{new Date(charger.createdAt?.toDate()).toLocaleString()}</td>
                                {userRole === 'Manager' && (
                                    <td>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setSelectedChargerIdForQR(charger.id); }}
                                            className="action-button"
                                        >
                                            <QrCodeIcon /> QR Code
                                        </button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

const StatusBadge = ({ status }) => {
    const statusClass = status.toLowerCase().replace(' ', '-');
    return (
        <span className={`status-badge status-${statusClass}`}>
            {status}
        </span>
    );
};

function QRCodeModal({ chargerId, onClose }) {
    const url = `${window.location.origin}${window.location.pathname}?chargerId=${chargerId}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(url)}`;
    
    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                 <button onClick={onClose} className="modal-close-button no-print">&times;</button>
                <h3>Scan QR Code</h3>
                <p>Print and attach this to the charger container.</p>
                <img src={qrCodeUrl} alt="QR Code" />
                <p className="modal-url">URL: {url}</p>
                <div className="modal-actions no-print">
                    <button onClick={handlePrint} className="print-button">Print QR Code</button>
                </div>
            </div>
        </div>
    );
}

function ChargerDetailPage({ charger, onBack }) {
    const [checks, setChecks] = useState(charger.qcChecks);
    const [isUpdating, setIsUpdating] = useState(false);

    const handleStatusChange = async (checkId, newStatus) => {
        const newChecks = checks.map(c => c.id === checkId ? { ...c, status: newStatus } : c);
        setChecks(newChecks);
        setIsUpdating(true);

        const allPassed = newChecks.every(c => c.status === 'Pass');
        const anyFailed = newChecks.some(c => c.status === 'Fail');

        let overallStatus = 'In Progress';
        if (anyFailed) {
            overallStatus = 'Failed';
        } else if (allPassed) {
            overallStatus = 'Passed';
        }

        try {
            const chargerRef = doc(db, `artifacts/${appId}/public/data/chargers`, charger.id);
            await updateDoc(chargerRef, {
                qcChecks: newChecks,
                status: overallStatus
            });
        } catch (error) {
            console.error("Failed to update status: ", error);
            setChecks(charger.qcChecks);
        } finally {
            setIsUpdating(false);
        }
    };
    
    const overallStatusIcon = () => {
        switch(charger.status){
            case 'Passed': return <CheckCircleIcon />;
            case 'Failed': return <XCircleIcon />;
            default: return <ClockIcon />;
        }
    };
    
    const statusClass = charger.status.toLowerCase().replace(' ', '-');

    return (
        <div className="detail-card">
            <div className="detail-header">
                <div>
                    <h1>{charger.model}</h1>
                        <p>{charger.serialNumber}</p>
                    </div>
                    <div className="detail-status">
                        <div className="status-container">
                             <StatusBadge status={charger.status} />
                             <span className={`status-icon-wrapper status-${statusClass}`}>{overallStatusIcon()}</span>
                        </div>
                         <p className="timestamp">Created: {new Date(charger.createdAt?.toDate()).toLocaleString()}</p>
                    </div>
                </div>

            <div className="checklist-container">
                <h2>Quality Control Checklist</h2>
                {checks.map(check => (
                        <div key={check.id} className="checklist-item">
                            <span>{check.name}</span>
                            <div className="status-buttons">
                                {['Pass', 'Fail', 'Pending'].map(status => (
                                    <button 
                                        key={status}
                                        onClick={() => handleStatusChange(check.id, status)}
                                        className={`status-button ${status.toLowerCase()} ${check.status === status ? 'active' : ''}`}
                                        disabled={isUpdating}
                                    >
                                        {status}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
            </div>
             {isUpdating && <div className="updating-message">Saving changes...</div>}
            
            <div className="back-link-container">
                <button onClick={onBack} className="back-button">
                    &larr; Back to Dashboard
                </button>
            </div>
        </div>
    );
}