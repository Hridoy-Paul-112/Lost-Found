// ============================================================
// FOUND & LOST - FACEBOOK-STYLE UI (Fully functional)
// ============================================================

const API_BASE = 'https://lost-found-2nke.onrender.com/api/auth';
const POSTS_API = 'https://lost-found-2nke.onrender.com/api/posts';

const getToken = () => localStorage.getItem('token');
const setToken = (t) => localStorage.setItem('token', t);
const removeToken = () => localStorage.removeItem('token');

const App = () => {
    // ========== STATE ==========
    const [user, setUser] = React.useState(null);
    const [loading, setLoading] = React.useState(true);

    // Page: home | login | register | verifyOtp | forgotPassword | resetPassword | dashboard | createPost | postDetail | profile
    const [page, setPage] = React.useState('home');

    // Auth forms
    const [loginEmail, setLoginEmail] = React.useState('');
    const [loginPassword, setLoginPassword] = React.useState('');
    const [reg, setReg] = React.useState({ name: '', email: '', password: '', confirm: '', university: '' });
    const [otp, setOtp] = React.useState(['', '', '', '', '', '']);
    const [forgotEmail, setForgotEmail] = React.useState('');
    const [reset, setReset] = React.useState({ email: '', otp: '', newPassword: '', confirm: '' });

    // Posts
    const [posts, setPosts] = React.useState([]);
    const [currentPost, setCurrentPost] = React.useState(null);
    const [filter, setFilter] = React.useState('all');
    const [search, setSearch] = React.useState('');
    const [newPost, setNewPost] = React.useState({ title: '', description: '', category: 'lost', itemName: '', location: '', contactInfo: '' });
    const [postImage, setPostImage] = React.useState(null);

    // UI
    const [msg, setMsg] = React.useState({ text: '', type: '' });
    const [resendTimer, setResendTimer] = React.useState(0);
    const [submitting, setSubmitting] = React.useState(false);

    // ========== HELPERS ==========
    const showMsg = (text, type) => {
        setMsg({ text, type });
        clearTimeout(window.msgTimeout);
        window.msgTimeout = setTimeout(() => setMsg({ text: '', type: '' }), 5000);
    };
    const clearMsg = () => setMsg({ text: '', type: '' });

    const getOtpString = () => otp.join('');

    const handleOtpChange = (idx, val) => {
        if (val.length > 1) return;
        const newOtp = [...otp];
        newOtp[idx] = val;
        setOtp(newOtp);
        if (val && idx < 5) {
            document.getElementById(`otp-${idx+1}`)?.focus();
        }
    };

    const startTimer = () => {
        setResendTimer(60);
        const interval = setInterval(() => {
            setResendTimer(prev => {
                if (prev <= 1) { clearInterval(interval); return 0; }
                return prev - 1;
            });
        }, 1000);
    };

    // ========== AUTH ==========
    const checkAuth = async () => {
        const token = getToken();
        if (!token) { setLoading(false); return; }
        try {
            const res = await fetch(`${API_BASE}/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setUser(data);
            } else {
                removeToken();
            }
        } catch (e) { removeToken(); }
        setLoading(false);
    };

    React.useEffect(() => { checkAuth(); }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        clearMsg();
        setSubmitting(true);
        try {
            const res = await fetch(`${API_BASE}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: loginEmail, password: loginPassword })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Login failed');
            setToken(data.token);
            setUser(data);
            showMsg(`Welcome back ${data.name}!`, 'success');
            setLoginEmail(''); setLoginPassword('');
            setPage('home');
        } catch (err) {
            showMsg(err.message, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        clearMsg();
        if (reg.password !== reg.confirm) {
            showMsg('Passwords do not match.', 'error');
            return;
        }
        setSubmitting(true);
        try {
            const res = await fetch(`${API_BASE}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: reg.name, email: reg.email, password: reg.password, university: reg.university })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Registration failed');
            setPage('verifyOtp');
            showMsg('OTP sent to your email.', 'success');
            startTimer();
        } catch (err) {
            showMsg(err.message, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleVerifyOtp = async () => {
        clearMsg();
        const code = getOtpString();
        if (code.length < 6) { showMsg('Enter full 6-digit OTP.', 'error'); return; }
        setSubmitting(true);
        try {
            const res = await fetch(`${API_BASE}/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: reg.email, otp: code })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'OTP verification failed');
            setToken(data.token);
            setUser(data);
            showMsg('Registration successful!', 'success');
            setPage('home');
            setReg({ name: '', email: '', password: '', confirm: '', university: '' });
            setOtp(['', '', '', '', '', '']);
        } catch (err) {
            showMsg(err.message, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleResendOtp = async () => {
        if (resendTimer > 0) return;
        setSubmitting(true);
        try {
            const res = await fetch(`${API_BASE}/resend-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: reg.email })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Resend failed');
            showMsg('OTP resent.', 'success');
            startTimer();
        } catch (err) {
            showMsg(err.message, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleForgot = async (e) => {
        e.preventDefault();
        clearMsg();
        setSubmitting(true);
        try {
            const res = await fetch(`${API_BASE}/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: forgotEmail })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to send reset OTP');
            setReset(prev => ({ ...prev, email: forgotEmail }));
            setPage('resetPassword');
            showMsg('OTP sent to your email.', 'success');
            startTimer();
        } catch (err) {
            showMsg(err.message, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleReset = async (e) => {
        e.preventDefault();
        clearMsg();
        if (reset.newPassword !== reset.confirm) {
            showMsg('Passwords do not match.', 'error');
            return;
        }
        setSubmitting(true);
        try {
            const res = await fetch(`${API_BASE}/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: reset.email, otp: reset.otp, newPassword: reset.newPassword })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Reset failed');
            showMsg('Password reset successfully.', 'success');
            setPage('login');
            setReset({ email: '', otp: '', newPassword: '', confirm: '' });
        } catch (err) {
            showMsg(err.message, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const logout = () => {
        removeToken();
        setUser(null);
        setPage('home');
        showMsg('Logged out.', 'success');
    };

    // ========== POSTS ==========
    const fetchPosts = async () => {
        try {
            const res = await fetch(POSTS_API);
            const data = await res.json();
            setPosts(data);
        } catch (e) { console.error(e); }
    };

    React.useEffect(() => {
        if (page === 'home' || page === 'dashboard') fetchPosts();
    }, [page]);

    const createPost = async (e) => {
        e.preventDefault();
        clearMsg();
        if (!user) { showMsg('Please login first.', 'error'); return; }
        setSubmitting(true);
        const formData = new FormData();
        Object.keys(newPost).forEach(k => formData.append(k, newPost[k]));
        if (postImage) formData.append('image', postImage);
        try {
            const res = await fetch(POSTS_API, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${getToken()}` },
                body: formData
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Create failed');
            showMsg('Post created!', 'success');
            setNewPost({ title: '', description: '', category: 'lost', itemName: '', location: '', contactInfo: '' });
            setPostImage(null);
            setPage('home');
            fetchPosts();
        } catch (err) {
            showMsg(err.message, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const deletePost = async (id) => {
        if (!confirm('Delete this post?')) return;
        try {
            const res = await fetch(`${POSTS_API}/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            if (!res.ok) throw new Error('Delete failed');
            showMsg('Post deleted.', 'success');
            setPage('home');
            fetchPosts();
        } catch (err) {
            showMsg(err.message, 'error');
        }
    };

    const resolvePost = async (id) => {
        try {
            const res = await fetch(`${POSTS_API}/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
                body: JSON.stringify({ isResolved: true })
            });
            if (!res.ok) throw new Error('Resolve failed');
            showMsg('Marked as resolved!', 'success');
            setPage('home');
            fetchPosts();
        } catch (err) {
            showMsg(err.message, 'error');
        }
    };

    // Filtered posts
    const filtered = posts.filter(p => {
        if (filter !== 'all' && p.category !== filter) return false;
        if (search) {
            const s = search.toLowerCase();
            return p.title.toLowerCase().includes(s) || p.description.toLowerCase().includes(s) || p.itemName.toLowerCase().includes(s);
        }
        return true;
    });

    // ========== RENDER COMPONENTS ==========

    const Navbar = () => (
        <nav className="navbar">
            <a href="#" className="brand" onClick={() => setPage('home')}>
                📘 Found<span>&</span>Lost
            </a>
            <div className="nav-links">
                <a href="#" onClick={() => setPage('home')}>Home</a>
                {user ? (
                    <>
                        <a href="#" onClick={() => setPage('dashboard')}>Dashboard</a>
                        <a href="#" onClick={() => setPage('createPost')}>+ New Post</a>
                        <span className="user-name">{user.name}</span>
                        <a href="#" onClick={() => setPage('profile')}>Profile</a>
                        <a href="#" className="logout-btn" onClick={logout}>Logout</a>
                    </>
                ) : (
                    <>
                        <a href="#" onClick={() => setPage('login')}>Login</a>
                        <a href="#" className="btn-primary" onClick={() => setPage('register')}>Register</a>
                    </>
                )}
            </div>
        </nav>
    );

    // AUTH PAGES (login, register, verify, forgot, reset) - similar but cleaner
    const LoginPage = () => (
        <div className="auth-card">
            <h2>Log In</h2>
            <p className="subtitle">to continue to Found & Lost</p>
            <form onSubmit={handleLogin}>
                <div className="input-group">
                    <label>Email</label>
                    <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required />
                </div>
                <div className="input-group">
                    <label>Password</label>
                    <input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required minLength="6" />
                </div>
                <button type="submit" className="btn" disabled={submitting}>{submitting ? 'Logging in...' : 'Log In'}</button>
            </form>
            <div className="toggle-link"><span onClick={() => setPage('register')}>Create New Account</span></div>
            <div className="toggle-link" style={{ marginTop: '6px' }}><span onClick={() => setPage('forgotPassword')}>Forgot Password?</span></div>
        </div>
    );

    const RegisterPage = () => (
        <div className="auth-card">
            <h2>Sign Up</h2>
            <p className="subtitle">It's quick and easy.</p>
            <form onSubmit={handleRegister}>
                <div className="input-group"><label>Full Name</label><input type="text" value={reg.name} onChange={e => setReg({...reg, name: e.target.value})} required /></div>
                <div className="input-group"><label>Email</label><input type="email" value={reg.email} onChange={e => setReg({...reg, email: e.target.value})} required /></div>
                <div className="input-group"><label>University</label><input type="text" value={reg.university} onChange={e => setReg({...reg, university: e.target.value})} required /></div>
                <div className="input-group"><label>Password</label><input type="password" value={reg.password} onChange={e => setReg({...reg, password: e.target.value})} required minLength="6" /></div>
                <div className="input-group"><label>Confirm Password</label><input type="password" value={reg.confirm} onChange={e => setReg({...reg, confirm: e.target.value})} required /></div>
                <button type="submit" className="btn" disabled={submitting}>{submitting ? 'Sending OTP...' : 'Sign Up'}</button>
            </form>
            <div className="toggle-link"><span onClick={() => setPage('login')}>Already have an account? Log in</span></div>
        </div>
    );

    const VerifyOtpPage = () => (
        <div className="auth-card">
            <h2>Verify Email</h2>
            <p className="subtitle">Enter the 6-digit code sent to {reg.email}</p>
            <div className="otp-group">
                {[0,1,2,3,4,5].map(i => (
                    <input key={i} id={`otp-${i}`} type="text" maxLength="1" value={otp[i] || ''} onChange={e => handleOtpChange(i, e.target.value)} onFocus={e => e.target.select()} />
                ))}
            </div>
            <button className="btn" onClick={handleVerifyOtp} disabled={submitting}>{submitting ? 'Verifying...' : 'Verify'}</button>
            <div className="resend-link">
                {resendTimer > 0 ? <span className="disabled">Resend in {resendTimer}s</span> : <span onClick={handleResendOtp}>Resend OTP</span>}
            </div>
            <div className="toggle-link"><span onClick={() => { setPage('login'); setReg({name:'', email:'', password:'', confirm:'', university:''}); setOtp(['','','','','','']); }}>Back to Login</span></div>
        </div>
    );

    const ForgotPage = () => (
        <div className="auth-card">
            <h2>Reset Password</h2>
            <p className="subtitle">Enter your email to receive an OTP</p>
            <form onSubmit={handleForgot}>
                <div className="input-group"><label>Email</label><input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} required /></div>
                <button type="submit" className="btn" disabled={submitting}>{submitting ? 'Sending...' : 'Send OTP'}</button>
            </form>
            <div className="toggle-link"><span onClick={() => setPage('login')}>Back to Login</span></div>
        </div>
    );

    const ResetPage = () => (
        <div className="auth-card">
            <h2>Set New Password</h2>
            <p className="subtitle">Enter OTP and new password</p>
            <form onSubmit={handleReset}>
                <div className="input-group"><label>Email</label><input type="email" value={reset.email} disabled /></div>
                <div className="input-group"><label>OTP</label><input type="text" value={reset.otp} onChange={e => setReset({...reset, otp: e.target.value})} required maxLength="6" /></div>
                <div className="input-group"><label>New Password</label><input type="password" value={reset.newPassword} onChange={e => setReset({...reset, newPassword: e.target.value})} required minLength="6" /></div>
                <div className="input-group"><label>Confirm Password</label><input type="password" value={reset.confirm} onChange={e => setReset({...reset, confirm: e.target.value})} required /></div>
                <button type="submit" className="btn" disabled={submitting}>{submitting ? 'Resetting...' : 'Reset Password'}</button>
            </form>
            <div className="toggle-link"><span onClick={() => { setPage('login'); setReset({email:'', otp:'', newPassword:'', confirm:''}); }}>Back to Login</span></div>
        </div>
    );

    // ===== POST CARD =====
    const PostCard = ({ post }) => {
        const isLost = post.category === 'lost';
        const imgUrl = post.image ? `https://lost-found-2nke.onrender.com${post.image}` : null;
        return (
            <div className="post-card" onClick={() => { setCurrentPost(post); setPage('postDetail'); }}>
                <div className="post-header">
                    <span className={`post-category ${isLost ? 'lost' : 'found'}`}>{isLost ? '🔴 Lost' : '🟢 Found'}</span>
                    <span style={{ color: '#606770', fontSize: '13px' }}>{new Date(post.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="post-title">{post.title}</div>
                <div className="post-desc">{post.description}</div>
                {imgUrl && <img src={imgUrl} alt="post" className="post-image" />}
                <div className="post-meta">
                    <span className="user">👤 {post.user?.name || 'Unknown'}</span>
                    <span>📍 {post.location}</span>
                </div>
            </div>
        );
    };

    // ===== HOME PAGE =====
    const HomePage = () => (
        <div>
            <div className="page-header"><h1>📰 Feed</h1><p>Lost or found something? Post it here.</p></div>
            <div className="filter-bar">
                <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
                <button className={`filter-btn ${filter === 'lost' ? 'active' : ''}`} onClick={() => setFilter('lost')}>Lost</button>
                <button className={`filter-btn ${filter === 'found' ? 'active' : ''}`} onClick={() => setFilter('found')}>Found</button>
            </div>
            <div className="search-bar">
                <input type="text" placeholder="Search posts..." value={search} onChange={e => setSearch(e.target.value)} />
                <button onClick={() => setSearch('')}>Clear</button>
            </div>
            <div className="posts-grid">
                {filtered.map(p => <PostCard key={p._id} post={p} />)}
                {filtered.length === 0 && <div style={{ textAlign: 'center', padding: '40px 0', color: '#606770' }}>No posts found.</div>}
            </div>
        </div>
    );

    // ===== DASHBOARD =====
    const DashboardPage = () => {
        const myPosts = posts.filter(p => p.user?._id === user?._id);
        const stats = { total: myPosts.length, lost: myPosts.filter(p => p.category === 'lost').length, found: myPosts.filter(p => p.category === 'found').length, resolved: myPosts.filter(p => p.isResolved).length };
        return (
            <div>
                <div className="page-header"><h1>📊 Dashboard</h1><p>Welcome back, {user?.name}!</p></div>
                <div className="stats-grid">
                    <div className="stat-card"><div className="number">{stats.total}</div><div className="label">Total</div></div>
                    <div className="stat-card"><div className="number" style={{ color: '#dc3545' }}>{stats.lost}</div><div className="label">Lost</div></div>
                    <div className="stat-card"><div className="number" style={{ color: '#28a745' }}>{stats.found}</div><div className="label">Found</div></div>
                    <div className="stat-card"><div className="number" style={{ color: '#1877f2' }}>{stats.resolved}</div><div className="label">Resolved</div></div>
                </div>
                <div className="flex justify-between" style={{ marginBottom: '12px' }}><h3>Your Posts</h3><button className="btn btn-primary" onClick={() => setPage('createPost')}>+ New</button></div>
                <div className="posts-grid">{myPosts.map(p => <PostCard key={p._id} post={p} />)}</div>
            </div>
        );
    };

    // ===== CREATE POST =====
    const CreatePostPage = () => (
        <div className="create-post">
            <h2>📝 Create Post</h2>
            <p className="subtitle">Help others find or return items.</p>
            <form onSubmit={createPost}>
                <div className="input-group"><label>Title</label><input type="text" value={newPost.title} onChange={e => setNewPost({...newPost, title: e.target.value})} required /></div>
                <div className="input-group"><label>Description</label><textarea value={newPost.description} onChange={e => setNewPost({...newPost, description: e.target.value})} required /></div>
                <div className="input-group"><label>Category</label><select value={newPost.category} onChange={e => setNewPost({...newPost, category: e.target.value})}><option value="lost">Lost</option><option value="found">Found</option></select></div>
                <div className="input-group"><label>Item Name</label><input type="text" value={newPost.itemName} onChange={e => setNewPost({...newPost, itemName: e.target.value})} required /></div>
                <div className="input-group"><label>Location</label><input type="text" value={newPost.location} onChange={e => setNewPost({...newPost, location: e.target.value})} required /></div>
                <div className="input-group"><label>Contact Info</label><input type="text" value={newPost.contactInfo} onChange={e => setNewPost({...newPost, contactInfo: e.target.value})} /></div>
                <div className="input-group"><label>Image</label><input type="file" accept="image/*" onChange={e => setPostImage(e.target.files[0])} /></div>
                <button type="submit" className="btn" disabled={submitting}>{submitting ? 'Creating...' : 'Create Post'}</button>
            </form>
            <div className="toggle-link" style={{ marginTop: '16px' }}><span onClick={() => setPage('home')}>← Back to Feed</span></div>
        </div>
    );

    // ===== POST DETAIL =====
    const PostDetailPage = () => {
        if (!currentPost) return <div>Loading...</div>;
        const p = currentPost;
        const isOwner = user && user._id === p.user?._id;
        const isLost = p.category === 'lost';
        const imgUrl = p.image ? `https://lost-found-2nke.onrender.com${p.image}` : null;
        return (
            <div className="post-detail">
                {imgUrl && <img src={imgUrl} alt="post" className="post-image" />}
                <span className={`category-badge ${isLost ? 'lost' : 'found'}`}>{isLost ? '🔴 Lost' : '🟢 Found'}</span>
                <h1>{p.title}</h1>
                <div className="description">{p.description}</div>
                <div className="info-grid">
                    <div><div className="label">Item</div><div className="value">{p.itemName}</div></div>
                    <div><div className="label">Location</div><div className="value">📍 {p.location}</div></div>
                    <div><div className="label">Date</div><div className="value">{new Date(p.createdAt).toLocaleDateString()}</div></div>
                    <div><div className="label">Contact</div><div className="value">{p.contactInfo || 'N/A'}</div></div>
                </div>
                <div className="user-section">
                    <div className="avatar">{p.user?.name?.charAt(0) || 'U'}</div>
                    <div><strong>{p.user?.name}</strong><br /><span style={{ color: '#606770' }}>{p.user?.university}</span></div>
                </div>
                <div className="actions">
                    <button className="btn btn-secondary" onClick={() => setPage('home')}>← Back</button>
                    {isOwner && (
                        <>
                            {!p.isResolved && <button className="btn btn-success" onClick={() => resolvePost(p._id)}>✅ Resolve</button>}
                            <button className="btn btn-danger" onClick={() => deletePost(p._id)}>🗑️ Delete</button>
                        </>
                    )}
                    {p.isResolved && <span style={{ color: '#28a745', fontWeight: 600 }}>✅ Resolved</span>}
                </div>
            </div>
        );
    };

    // ===== PROFILE =====
    const ProfilePage = () => (
        <div className="profile-card">
            <div className="avatar">{user?.name?.charAt(0) || 'U'}</div>
            <div className="name">{user?.name}</div>
            <div className="email">{user?.email}</div>
            <div className="university">🎓 {user?.university}</div>
            {user?.department && <div style={{ color: '#606770', marginTop: '4px' }}>{user.department}</div>}
            {user?.phone && <div style={{ color: '#606770' }}>📱 {user.phone}</div>}
            <button className="btn btn-secondary" style={{ marginTop: '20px' }} onClick={() => setPage('dashboard')}>← Dashboard</button>
        </div>
    );

    // ========== MAIN RENDER ==========
    if (loading && !user) {
        return <div style={{ padding: '60px', textAlign: 'center' }}>Loading...</div>;
    }

    return (
        <div className="app-container">
            <Navbar />
            {msg.text && <div id="messageBox" className={msg.type}>{msg.text}</div>}
            {page === 'home' && <HomePage />}
            {page === 'login' && <LoginPage />}
            {page === 'register' && <RegisterPage />}
            {page === 'verifyOtp' && <VerifyOtpPage />}
            {page === 'forgotPassword' && <ForgotPage />}
            {page === 'resetPassword' && <ResetPage />}
            {page === 'dashboard' && <DashboardPage />}
            {page === 'createPost' && <CreatePostPage />}
            {page === 'postDetail' && <PostDetailPage />}
            {page === 'profile' && <ProfilePage />}
        </div>
    );
};