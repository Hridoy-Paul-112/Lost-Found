// app.js - Full authentication with OTP and password reset

// ---------- CONFIGURATION ----------
// Backend API URL (Render deployment)
const API_BASE_URL = 'https://lost-found-2nke.onrender.com/api/auth';

// ---------- MAIN APP ----------
const App = () => {
    // ===================== STATE =====================
    const [page, setPage] = React.useState('login'); // login | register | verifyOtp | forgotPassword | resetPassword

    // Login state
    const [loginEmail, setLoginEmail] = React.useState('');
    const [loginPassword, setLoginPassword] = React.useState('');

    // Register state
    const [registerData, setRegisterData] = React.useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        university: ''
    });
    const [otp, setOtp] = React.useState(['', '', '', '', '', '']);

    // Forgot password state
    const [forgotEmail, setForgotEmail] = React.useState('');
    const [resetPasswordData, setResetPasswordData] = React.useState({
        email: '',
        otp: '',
        newPassword: '',
        confirmNewPassword: ''
    });

    // UI states
    const [loading, setLoading] = React.useState(false);
    const [message, setMessage] = React.useState({ text: '', type: '' });
    const [resendTimer, setResendTimer] = React.useState(0);

    // ===================== HELPER FUNCTIONS =====================
    const showMessage = (text, type) => {
        setMessage({ text, type });
        clearTimeout(window.msgTimeout);
        window.msgTimeout = setTimeout(() => setMessage({ text: '', type: '' }), 5000);
    };

    const clearMessage = () => setMessage({ text: '', type: '' });

    const handleOtpChange = (index, value) => {
        if (value.length > 1) return;
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        if (value && index < 5) {
            document.getElementById(`otp-${index+1}`)?.focus();
        }
    };

    const getOtpString = () => otp.join('');

    const startResendTimer = () => {
        setResendTimer(60);
        const interval = setInterval(() => {
            setResendTimer(prev => {
                if (prev <= 1) { clearInterval(interval); return 0; }
                return prev - 1;
            });
        }, 1000);
    };

    // ===================== API CALLS =====================

    // 1. Register - Send OTP
    const handleRegisterSubmit = async (e) => {
        e.preventDefault();
        clearMessage();

        if (registerData.password !== registerData.confirmPassword) {
            showMessage('Passwords do not match!', 'error');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: registerData.name,
                    email: registerData.email,
                    password: registerData.password,
                    university: registerData.university
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Registration failed');
            
            setPage('verifyOtp');
            showMessage('OTP sent to your email. Please verify.', 'success');
            startResendTimer();
        } catch (err) {
            showMessage(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    // 2. Verify OTP - Complete Registration
    const handleVerifyOtp = async () => {
        clearMessage();
        const otpCode = getOtpString();
        if (otpCode.length < 6) {
            showMessage('Please enter the full 6-digit OTP.', 'error');
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: registerData.email,
                    otp: otpCode
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'OTP verification failed');
            
            localStorage.setItem('token', data.token);
            showMessage('Registration successful! Welcome.', 'success');
            setTimeout(() => {
                alert('🎉 You are now registered and logged in!\nWelcome to Found & Lost!');
                setPage('login');
                setRegisterData({ name: '', email: '', password: '', confirmPassword: '', university: '' });
                setOtp(['', '', '', '', '', '']);
            }, 1000);
        } catch (err) {
            showMessage(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    // 3. Resend OTP
    const handleResendOtp = async () => {
        if (resendTimer > 0) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/resend-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: registerData.email })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Resend failed');
            showMessage('OTP resent successfully.', 'success');
            startResendTimer();
        } catch (err) {
            showMessage(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    // 4. Login
    const handleLogin = async (e) => {
        e.preventDefault();
        clearMessage();
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: loginEmail, password: loginPassword })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Login failed');
            
            localStorage.setItem('token', data.token);
            showMessage('Login successful!', 'success');
            setTimeout(() => {
                alert('👋 Welcome back ' + data.name + '!\nDashboard coming soon.');
                setLoginEmail('');
                setLoginPassword('');
            }, 1000);
        } catch (err) {
            showMessage(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    // 5. Forgot Password - Send OTP
    const handleForgotPassword = async (e) => {
        e.preventDefault();
        clearMessage();
        if (!forgotEmail) {
            showMessage('Please enter your email.', 'error');
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: forgotEmail })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to send reset OTP');
            
            setResetPasswordData(prev => ({ ...prev, email: forgotEmail }));
            setPage('resetPassword');
            showMessage('OTP sent to your email. Please check.', 'success');
            startResendTimer();
        } catch (err) {
            showMessage(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    // 6. Reset Password
    const handleResetPassword = async (e) => {
        e.preventDefault();
        clearMessage();
        const { email, otp: resetOtp, newPassword, confirmNewPassword } = resetPasswordData;
        
        if (newPassword !== confirmNewPassword) {
            showMessage('Passwords do not match!', 'error');
            return;
        }
        if (newPassword.length < 6) {
            showMessage('Password must be at least 6 characters.', 'error');
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp: resetOtp, newPassword })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Password reset failed');
            
            showMessage('Password reset successfully! Please login.', 'success');
            setTimeout(() => {
                setPage('login');
                setResetPasswordData({ email: '', otp: '', newPassword: '', confirmNewPassword: '' });
            }, 1500);
        } catch (err) {
            showMessage(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    // ===================== RENDER FUNCTIONS =====================

    const renderLogin = () => (
        <div>
            <h2>🔐 Login</h2>
            <p className="subtitle">Welcome back to Found & Lost</p>
            <form onSubmit={handleLogin}>
                <div className="input-group">
                    <label>Email</label>
                    <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required />
                </div>
                <div className="input-group">
                    <label>Password</label>
                    <input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required minLength="6" />
                </div>
                <button type="submit" className="btn" disabled={loading}>{loading ? 'Logging in...' : 'Login'}</button>
            </form>
            <div className="toggle-link">
                <span onClick={() => setPage('register')}>Don't have an account? Register</span>
            </div>
            <div className="toggle-link" style={{ marginTop: '5px' }}>
                <span onClick={() => setPage('forgotPassword')}>Forgot password?</span>
            </div>
        </div>
    );

    const renderRegister = () => (
        <div>
            <h2>📝 Register</h2>
            <p className="subtitle">Create your Found & Lost account</p>
            <form onSubmit={handleRegisterSubmit}>
                <div className="input-group">
                    <label>Full Name</label>
                    <input type="text" value={registerData.name} onChange={e => setRegisterData({...registerData, name: e.target.value})} required />
                </div>
                <div className="input-group">
                    <label>Email</label>
                    <input type="email" value={registerData.email} onChange={e => setRegisterData({...registerData, email: e.target.value})} required />
                </div>
                <div className="input-group">
                    <label>University</label>
                    <input type="text" value={registerData.university} onChange={e => setRegisterData({...registerData, university: e.target.value})} required />
                </div>
                <div className="input-group">
                    <label>Password (min 6 chars)</label>
                    <input type="password" value={registerData.password} onChange={e => setRegisterData({...registerData, password: e.target.value})} required minLength="6" />
                </div>
                <div className="input-group">
                    <label>Confirm Password</label>
                    <input type="password" value={registerData.confirmPassword} onChange={e => setRegisterData({...registerData, confirmPassword: e.target.value})} required />
                </div>
                <button type="submit" className="btn" disabled={loading}>{loading ? 'Sending OTP...' : 'Register'}</button>
            </form>
            <div className="toggle-link">
                <span onClick={() => setPage('login')}>Already have an account? Login</span>
            </div>
        </div>
    );

    const renderVerifyOtp = () => (
        <div>
            <h2>📧 Verify OTP</h2>
            <p className="subtitle">Enter the 6-digit code sent to {registerData.email}</p>
            <div className="otp-group">
                {[0,1,2,3,4,5].map(i => (
                    <input
                        key={i}
                        id={`otp-${i}`}
                        type="text"
                        maxLength="1"
                        value={otp[i] || ''}
                        onChange={e => handleOtpChange(i, e.target.value)}
                        onFocus={e => e.target.select()}
                    />
                ))}
            </div>
            <button className="btn" onClick={handleVerifyOtp} disabled={loading}>{loading ? 'Verifying...' : 'Verify OTP'}</button>
            <div className="resend-link">
                {resendTimer > 0 ? (
                    <span className="disabled">Resend OTP in {resendTimer}s</span>
                ) : (
                    <span onClick={handleResendOtp}>Resend OTP</span>
                )}
            </div>
            <div className="toggle-link">
                <span onClick={() => { setPage('login'); setRegisterData({name:'', email:'', password:'', confirmPassword:'', university:''}); setOtp(['','','','','','']); }}>Back to Login</span>
            </div>
        </div>
    );

    const renderForgotPassword = () => (
        <div>
            <h2>🔑 Forgot Password</h2>
            <p className="subtitle">We'll send an OTP to reset your password</p>
            <form onSubmit={handleForgotPassword}>
                <div className="input-group">
                    <label>Email</label>
                    <input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} required />
                </div>
                <button type="submit" className="btn" disabled={loading}>{loading ? 'Sending OTP...' : 'Send Reset OTP'}</button>
            </form>
            <div className="toggle-link">
                <span onClick={() => setPage('login')}>Back to Login</span>
            </div>
        </div>
    );

    const renderResetPassword = () => (
        <div>
            <h2>🔄 Reset Password</h2>
            <p className="subtitle">Enter the OTP and choose a new password</p>
            <form onSubmit={handleResetPassword}>
                <div className="input-group">
                    <label>Email</label>
                    <input type="email" value={resetPasswordData.email} disabled />
                </div>
                <div className="input-group">
                    <label>OTP (6 digits)</label>
                    <input type="text" value={resetPasswordData.otp} onChange={e => setResetPasswordData({...resetPasswordData, otp: e.target.value})} required maxLength="6" placeholder="Enter 6-digit OTP" />
                </div>
                <div className="input-group">
                    <label>New Password</label>
                    <input type="password" value={resetPasswordData.newPassword} onChange={e => setResetPasswordData({...resetPasswordData, newPassword: e.target.value})} required minLength="6" />
                </div>
                <div className="input-group">
                    <label>Confirm New Password</label>
                    <input type="password" value={resetPasswordData.confirmNewPassword} onChange={e => setResetPasswordData({...resetPasswordData, confirmNewPassword: e.target.value})} required />
                </div>
                <button type="submit" className="btn" disabled={loading}>{loading ? 'Resetting...' : 'Reset Password'}</button>
            </form>
            <div className="toggle-link">
                <span onClick={() => { setPage('login'); setResetPasswordData({email:'', otp:'', newPassword:'', confirmNewPassword:''}); }}>Back to Login</span>
            </div>
        </div>
    );

    // ===================== MAIN RENDER =====================
    return (
        <div className="container">
            {message.text && <div id="messageBox" className={message.type}>{message.text}</div>}

            {page === 'login' && renderLogin()}
            {page === 'register' && renderRegister()}
            {page === 'verifyOtp' && renderVerifyOtp()}
            {page === 'forgotPassword' && renderForgotPassword()}
            {page === 'resetPassword' && renderResetPassword()}
        </div>
    );
};