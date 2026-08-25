// app.js - React component for Login/Register

const App = () => {
    // State variables
    const [isLogin, setIsLogin] = React.useState(true); // true=login, false=register
    const [form, setForm] = React.useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        university: ''
    });
    const [loading, setLoading] = React.useState(false);
    const [message, setMessage] = React.useState({ text: '', type: '' });

    // Handle input change
    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        if (message.text) setMessage({ text: '', type: '' });
    };

    // Toggle between login and register
    const toggleMode = () => {
        setIsLogin(!isLogin);
        setForm({ name: '', email: '', password: '', confirmPassword: '', university: '' });
        setMessage({ text: '', type: '' });
    };

    // Form submit
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ text: '', type: '' });

        // Validation for register
        if (!isLogin && form.password !== form.confirmPassword) {
            setMessage({ text: 'Passwords do not match!', type: 'error' });
            setLoading(false);
            return;
        }

        // Prepare API call
        const endpoint = isLogin ? 'login' : 'register';
        const url = `http://localhost:5000/api/auth/${endpoint}`;
        let body = {};
        if (isLogin) {
            body = { email: form.email, password: form.password };
        } else {
            body = {
                name: form.name,
                email: form.email,
                password: form.password,
                university: form.university
            };
        }

        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Something went wrong');

            // Success
            localStorage.setItem('token', data.token);
            setMessage({
                text: `${isLogin ? 'Login' : 'Registration'} successful! Welcome ${data.name}`,
                type: 'success'
            });
            console.log('User data:', data);
            // After 2 seconds, you can redirect (optional)
            setTimeout(() => {
                alert('You are now logged in! (Dashboard coming next)');
            }, 1000);
        } catch (err) {
            setMessage({ text: err.message, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    // JSX
    return (
        <div className="auth-container">
            <h2>🔍 Found & Lost</h2>
            <p className="subtitle">{isLogin ? 'Login to your account' : 'Create a new account'}</p>

            {message.text && (
                <div id="messageBox" className={message.type}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                {/* Extra fields for registration */}
                {!isLogin && (
                    <div className="extra-fields show">
                        <div className="input-group">
                            <label>Full Name</label>
                            <input
                                type="text"
                                name="name"
                                placeholder="Your name"
                                value={form.name}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="input-group">
                            <label>University</label>
                            <input
                                type="text"
                                name="university"
                                placeholder="e.g. Dhaka University"
                                value={form.university}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>
                )}

                <div className="input-group">
                    <label>Email</label>
                    <input
                        type="email"
                        name="email"
                        placeholder="you@example.com"
                        value={form.email}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div className="input-group">
                    <label>Password</label>
                    <input
                        type="password"
                        name="password"
                        placeholder="Min 6 characters"
                        value={form.password}
                        onChange={handleChange}
                        required
                        minLength="6"
                    />
                </div>
                {!isLogin && (
                    <div className="input-group">
                        <label>Confirm Password</label>
                        <input
                            type="password"
                            name="confirmPassword"
                            placeholder="Retype password"
                            value={form.confirmPassword}
                            onChange={handleChange}
                            required
                        />
                    </div>
                )}

                <button type="submit" className="btn" disabled={loading}>
                    {loading ? 'Please wait...' : (isLogin ? 'Login' : 'Register')}
                </button>
            </form>

            <div className="toggle-link">
                <span onClick={toggleMode}>
                    {isLogin ? "Don't have an account?  Register" : 'Already have an account?  Login'}
                </span>
            </div>
        </div>
    );
};