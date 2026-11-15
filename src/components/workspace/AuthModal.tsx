import React, { useState, useEffect } from 'react';
import { X, LogIn, UserPlus, KeyRound, ArrowRight } from 'lucide-react';
import { AppLanguage } from '../../types';
import { apiRequest, setModeHeader, setStoredToken } from '../../lib/api';
import { tr } from '../../i18n/translations';

interface AuthModalProps {
  isOpen: boolean;
  initialMode: 'login' | 'signup';
  language?: AppLanguage;
  onClose: () => void;
  onAuthenticated: () => void;
  onNotify: (msg: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode,
  language = 'en',
  onClose,
  onAuthenticated,
  onNotify,
}) => {
  const [view, setView] = useState<'login' | 'signup' | 'forgot'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState('Grocery & Kirana');
  const [city, setCity] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState<AppLanguage>(language);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetStep, setResetStep] = useState<'request' | 'confirm'>('request');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setView(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await apiRequest<{ token: string; businessName: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setModeHeader('live');
      setStoredToken(res.token);
      onNotify(
        tr(
          language,
          `Signed in to ${res.businessName} (Live Mode).`,
          `${res.businessName} में लॉगिन हो गया (लाइव मोड)।`
        )
      );
      onAuthenticated();
      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : tr(language, 'Login failed.', 'लॉगिन विफल रहा।')
      );
    } finally {
      setBusy(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await apiRequest<{ token: string }>('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          fullName,
          businessName,
          category,
          city,
          state: '',
          preferredLanguage,
        }),
      });
      setModeHeader('live');
      setStoredToken(res.token);
      onNotify(
        tr(
          language,
          `Workspace created for ${businessName}. You are now in Live Mode.`,
          `${businessName} के लिए कार्यक्षेत्र बन गया। अब आप लाइव मोड में हैं।`
        )
      );
      onAuthenticated();
      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : tr(language, 'Sign up failed.', 'साइन अप विफल रहा।')
      );
    } finally {
      setBusy(false);
    }
  };

  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await apiRequest<{ message: string; devResetToken?: string }>(
        '/api/auth/forgot-password',
        { method: 'POST', body: JSON.stringify({ email }) }
      );
      if (res.devResetToken) setResetToken(res.devResetToken);
      setResetStep('confirm');
      onNotify(res.message);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : tr(language, 'Request failed.', 'अनुरोध विफल रहा।')
      );
    } finally {
      setBusy(false);
    }
  };

  const handleResetConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await apiRequest<{ message: string }>('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token: resetToken, newPassword }),
      });
      onNotify(res.message);
      setView('login');
      setResetStep('request');
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : tr(language, 'Reset failed.', 'रीसेट विफल रहा।')
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#0B1E40] border border-[#CBD5E1] dark:border-[#1E3A5F] shadow-2xl overflow-hidden">
        <div className="px-6 py-4 bg-[#071A35] text-white flex items-center justify-between border-b border-[#1E3A5F]">
          <div className="flex items-center gap-2">
            {view === 'login' ? (
              <LogIn className="w-4 h-4 text-[#22D3EE]" />
            ) : view === 'signup' ? (
              <UserPlus className="w-4 h-4 text-[#22D3EE]" />
            ) : (
              <KeyRound className="w-4 h-4 text-[#22D3EE]" />
            )}
            <h3 className="text-sm font-extrabold">
              {view === 'login'
                ? tr(language, 'Merchant Login (Live Store)', 'व्यापारी लॉगिन (लाइव स्टोर)')
                : view === 'signup'
                ? tr(language, 'Create Your Live Store Workspace', 'अपना लाइव स्टोर कार्यक्षेत्र बनाएँ')
                : tr(language, 'Reset Password', 'पासवर्ड रीसेट करें')}
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label={tr(language, 'Close authentication modal', 'लॉगिन बंद करें')}
            className="p-1.5 rounded-lg hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex gap-2 text-xs">
            <button
              onClick={() => {
                setView('login');
                setError(null);
              }}
              className={`flex-1 h-9 rounded-lg font-bold cursor-pointer ${
                view === 'login'
                  ? 'bg-[#2563EB] text-white'
                  : 'bg-[#F8FAFC] dark:bg-[#061533] text-[#475569] dark:text-[#CBD5E1]'
              }`}
            >
              {tr(language, 'Login', 'लॉगिन')}
            </button>
            <button
              onClick={() => {
                setView('signup');
                setError(null);
              }}
              className={`flex-1 h-9 rounded-lg font-bold cursor-pointer ${
                view === 'signup'
                  ? 'bg-[#2563EB] text-white'
                  : 'bg-[#F8FAFC] dark:bg-[#061533] text-[#475569] dark:text-[#CBD5E1]'
              }`}
            >
              {tr(language, 'Get Started Free', 'मुफ़्त शुरू करें')}
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-[#FEE2E2] dark:bg-[#450A0A] text-xs font-semibold text-[#DC2626] dark:text-[#FCA5A5]">
              {error}
            </div>
          )}

          {view === 'login' && (
            <form onSubmit={handleLogin} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">{tr(language, 'Email', 'ईमेल')}</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="owner@yourstore.in"
                  className="w-full h-10 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#061533] text-[#071A35] dark:text-white"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">{tr(language, 'Password', 'पासवर्ड')}</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={tr(language, 'Min 8 characters', 'कम से कम 8 अक्षर')}
                  className="w-full h-10 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#061533] text-[#071A35] dark:text-white"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setView('forgot')}
                  className="text-[#2563EB] dark:text-[#22D3EE] font-semibold hover:underline cursor-pointer"
                >
                  {tr(language, 'Forgot password?', 'पासवर्ड भूल गए?')}
                </button>
              </div>
              <button
                type="submit"
                disabled={busy}
                className="w-full h-10 rounded-xl bg-[#2563EB] hover:bg-[#071A35] text-white font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <span>
                  {busy
                    ? tr(language, 'Signing in...', 'लॉगिन हो रहा है...')
                    : tr(language, 'Sign In to Live Store', 'लाइव स्टोर में साइन इन करें')}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {view === 'signup' && (
            <form onSubmit={handleSignup} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">{tr(language, 'Your Name *', 'आपका नाम *')}</label>
                  <input
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={tr(language, 'Amit Verma', 'अमित वर्मा')}
                    className="w-full h-9 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#061533] text-[#071A35] dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">{tr(language, 'Store Name *', 'स्टोर का नाम *')}</label>
                  <input
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder={tr(language, 'Verma Kirana & Foods', 'वर्मा किराना एंड फूड्स')}
                    className="w-full h-9 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#061533] text-[#071A35] dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">{tr(language, 'Email *', 'ईमेल *')}</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="owner@yourstore.in"
                    className="w-full h-9 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#061533] text-[#071A35] dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">{tr(language, 'Password (8+ chars) *', 'पासवर्ड (8+ अक्षर) *')}</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#061533] text-[#071A35] dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold mb-1">{tr(language, 'Category', 'श्रेणी')}</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-9 px-2 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#061533] text-[#071A35] dark:text-white"
                  >
                    <option value="Grocery & Kirana">{tr(language, 'Grocery & Kirana', 'किराना और ग्रॉसरी')}</option>
                    <option value="Apparel & Fashion">{tr(language, 'Apparel & Fashion', 'कपड़े और फ़ैशन')}</option>
                    <option value="Beauty & Ayurveda">{tr(language, 'Beauty & Ayurveda', 'ब्यूटी और आयुर्वेद')}</option>
                    <option value="Electronics & Home">{tr(language, 'Electronics & Home', 'इलेक्ट्रॉनिक्स और होम')}</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">{tr(language, 'City', 'शहर')}</label>
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder={tr(language, 'Jaipur', 'जयपुर')}
                    className="w-full h-9 px-2 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#061533] text-[#071A35] dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">{tr(language, 'Language', 'भाषा')}</label>
                  <select
                    value={preferredLanguage}
                    onChange={(e) => setPreferredLanguage(e.target.value as AppLanguage)}
                    className="w-full h-9 px-2 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#061533] text-[#071A35] dark:text-white"
                  >
                    <option value="en">English</option>
                    <option value="hi">हिन्दी (Hindi)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full h-10 rounded-xl bg-[#2563EB] hover:bg-[#071A35] text-white font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <span>
                  {busy
                    ? tr(language, 'Creating Workspace...', 'कार्यक्षेत्र बन रहा है...')
                    : tr(language, 'Create Store & Enter Live Mode', 'स्टोर बनाएँ और लाइव मोड खोलें')}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {view === 'forgot' && (
            <div className="space-y-3 text-xs">
              {resetStep === 'request' ? (
                <form onSubmit={handleForgotRequest} className="space-y-3">
                  <label className="block font-semibold">{tr(language, 'Registered Email', 'पंजीकृत ईमेल')}</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#061533] text-[#071A35] dark:text-white"
                  />
                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full h-10 rounded-xl bg-[#2563EB] text-white font-bold cursor-pointer"
                  >
                    {tr(language, 'Generate Reset Token', 'रीसेट टोकन बनाएँ')}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleResetConfirm} className="space-y-3">
                  <div>
                    <label className="block font-semibold mb-1">{tr(language, 'Reset Token', 'रीसेट टोकन')}</label>
                    <input
                      required
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#061533] text-[#071A35] dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">{tr(language, 'New Password (8+ chars)', 'नया पासवर्ड (8+ अक्षर)')}</label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-[#CBD5E1] dark:border-[#1E3A5F] bg-white dark:bg-[#061533] text-[#071A35] dark:text-white"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full h-10 rounded-xl bg-[#2563EB] text-white font-bold cursor-pointer"
                  >
                    {tr(language, 'Save New Password', 'नया पासवर्ड सेव करें')}
                  </button>
                </form>
              )}
              <button
                onClick={() => setView('login')}
                className="text-xs font-semibold text-[#2563EB] dark:text-[#22D3EE] hover:underline cursor-pointer"
              >
                {tr(language, 'Back to Login', 'लॉगिन पर वापस जाएँ')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
