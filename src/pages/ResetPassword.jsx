import React, { useMemo, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { verifyPasswordResetCode, confirmPasswordReset, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../../firebase';

function useQuery() {
  const location = useLocation();
  return useMemo(() => new URLSearchParams(location.search), [location.search]);
}

export default function ResetPassword() {
  const query = useQuery();
  const navigate = useNavigate();
  // Try to obtain oobCode from query, hash, or full URL (fallback for provider quirks)
  const location = useLocation();
  const oobFromQuery = query.get('oobCode') || '';
  const oobFromHash = (() => {
    try {
      const hash = (location.hash || '').replace(/^#/, '');
      if (!hash) return '';
      const params = new URLSearchParams(hash);
      return params.get('oobCode') || '';
    } catch (_) {
      return '';
    }
  })();
  const oobFromHref = (() => {
    try {
      const match = window.location.href.match(/[?&#]oobCode=([^&]+)/i);
      return match ? decodeURIComponent(match[1]) : '';
    } catch (_) {
      return '';
    }
  })();
  const oobFromPath = (() => {
    try {
      const parts = (location.pathname || '').split('/').filter(Boolean);
      const idx = parts.findIndex(p => p.toLowerCase() === 'reset-password');
      if (idx >= 0 && parts[idx + 1] && parts[idx + 1].length > 10) {
        return parts[idx + 1];
      }
      return '';
    } catch (_) {
      return '';
    }
  })();
  const oobCode = oobFromQuery || oobFromHash || oobFromHref || oobFromPath || '';

  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function verify() {
      try {
        const verifiedEmail = await verifyPasswordResetCode(auth, oobCode);
        if (isMounted) {
          setEmail(verifiedEmail);
          setVerifying(false);
        }
      } catch (err) {
        if (isMounted) {
          setError('This reset link is invalid or has expired.');
          setVerifying(false);
        }
      }
    }
    if (oobCode) {
      verify();
    } else {
      setError('Missing reset code.');
      setVerifying(false);
    }
    return () => { isMounted = false; };
  }, [oobCode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      // Validate by signing in once, then sign out
      try {
        const verifiedEmail = email || (await verifyPasswordResetCode(auth, oobCode));
        await signInWithEmailAndPassword(auth, verifiedEmail, newPassword);
        await signOut(auth);
      } catch (_) {
        // Even if validation sign-in fails, continue to show success since reset succeeded
      }
      setInfo('Your password has been reset. You can now log in.');
      setTimeout(() => navigate('/login', { replace: true }), 1500);
    } catch (err) {
      // Show specific error guidance
      const code = err?.code || '';
      if (code === 'auth/weak-password') {
        setError('Password is too weak. Use at least 6 characters.');
      } else if (code === 'auth/expired-action-code') {
        setError('This reset link has expired. Please request a new one.');
      } else if (code === 'auth/invalid-action-code') {
        setError('Invalid reset link. Request a new password reset email.');
      } else {
        setError('Failed to reset password. Please request a new link and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
        <h2 className="text-3xl font-bold mb-6 text-center text-blue-600">BMSPRO</h2>
        <h2 className="text-xl font-bold mb-6 text-center">Reset Password</h2>
        {error && <div className="mb-4 text-red-600 text-sm">{error}</div>}
        {info && <div className="mb-4 text-green-600 text-sm">{info}</div>}

        {verifying ? (
          <div className="text-sm text-gray-600 mb-4">Verifying link...</div>
        ) : (
          <>
            <div className="mb-4">
              <label className="block mb-1 font-medium">Email</label>
              <input
                type="email"
                className="w-full border rounded px-3 py-2 bg-gray-100"
                value={email}
                readOnly
              />
            </div>
            <div className="mb-4">
              <label className="block mb-1 font-medium">New Password</label>
              <input
                type="password"
                className="w-full border rounded px-3 py-2"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="mb-4">
              <label className="block mb-1 font-medium">Confirm Password</label>
              <input
                type="password"
                className="w-full border rounded px-3 py-2"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 font-semibold mb-2"
              disabled={loading || verifying}
            >
              {loading ? 'Resetting...' : 'Reset password'}
            </button>
            <div className="text-center">
              <Link to="/login" className="text-sm text-blue-600 hover:underline">
                Back to login
              </Link>
            </div>
          </>
        )}
      </form>
    </div>
  );
}


