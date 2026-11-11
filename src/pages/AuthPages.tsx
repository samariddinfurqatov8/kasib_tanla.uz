import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { apiFetch, ApiError } from '../lib/api.ts';

function AuthContainer({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const { navigate, t } = useApp();

  return (
    <div
      className="min-h-screen flex flex-col justify-center py-10 px-4 sm:px-6"
      style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}
    >
      <div className="max-w-md w-full mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 text-sm font-medium cursor-pointer hover:underline"
            style={{ color: 'var(--text-secondary)' }}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t.brand}</span>
          </button>
        </div>

        <div
          className="rounded-xl border p-6 sm:p-8"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <h1 className="font-display text-2xl font-bold tracking-tight mb-2">{title}</h1>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            {subtitle}
          </p>
          {children}
        </div>
      </div>
    </div>
  );
}

export function RegisterPage() {
  const { registerWithPassword, loginWithGoogle, navigate, t } = useApp();
  const [fullName, setFullName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [schoolGrade, setSchoolGrade] = useState<number>(9);
  const [schoolName, setSchoolName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await registerWithPassword({
        fullName,
        identifier,
        password,
        schoolGrade,
        schoolName: schoolName.trim() || undefined,
      });
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Xatolik yuz berdi.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await loginWithGoogle();
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google autentifikatsiyasida xatolik.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthContainer title={t.auth.registerTitle} subtitle={t.auth.registerSubtitle}>
      {error && (
        <div
          className="mb-4 p-3 rounded-lg border text-sm"
          style={{
            backgroundColor: 'rgba(220, 38, 38, 0.1)',
            borderColor: 'rgba(220, 38, 38, 0.35)',
            color: '#F87171',
          }}
        >
          {error}
        </div>
      )}

      <button
        type="button"
        disabled={submitting}
        onClick={() => void handleGoogle()}
        className="w-full py-2.5 px-4 rounded-lg border text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderColor: 'var(--border-strong)',
          color: 'var(--text-main)',
        }}
      >
        {t.auth.googleBtn}
      </button>

      <div className="my-5 flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
        <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-subtle)' }} />
        <span>{t.auth.orDivider}</span>
        <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-subtle)' }} />
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            {t.auth.fullName}
          </label>
          <input
            type="text"
            required
            minLength={2}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Azizbek Karimov"
            className="w-full px-3.5 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[#2878FF]"
            style={{
              backgroundColor: 'var(--bg-main)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-main)',
            }}
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            {t.auth.identifier}
          </label>
          <input
            type="text"
            required
            minLength={5}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="student@example.com / +998901234567"
            className="w-full px-3.5 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[#2878FF]"
            style={{
              backgroundColor: 'var(--bg-main)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-main)',
            }}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              {t.auth.schoolGrade}
            </label>
            <select
              value={schoolGrade}
              onChange={(e) => setSchoolGrade(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[#2878FF]"
              style={{
                backgroundColor: 'var(--bg-main)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-main)',
              }}
            >
              {[5, 6, 7, 8, 9, 10, 11, 12].map((g) => (
                <option key={g} value={g}>
                  {g}
                  {t.auth.gradeSuffix}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              {t.auth.password}
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              className="w-full px-3.5 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[#2878FF]"
              style={{
                backgroundColor: 'var(--bg-main)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-main)',
              }}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            {t.auth.schoolName}
          </label>
          <input
            type="text"
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            placeholder="24-sonli umumiy o‘rta ta’lim maktabi"
            className="w-full px-3.5 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[#2878FF]"
            style={{
              backgroundColor: 'var(--bg-main)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-main)',
            }}
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 px-4 rounded-lg text-sm font-semibold text-white cursor-pointer transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ backgroundColor: 'var(--accent-blue)' }}
        >
          {t.auth.registerSubmit}
        </button>
      </form>

      <div className="mt-5 text-center">
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="text-sm font-medium hover:underline cursor-pointer"
          style={{ color: 'var(--accent-cyan)' }}
        >
          {t.auth.haveAccount}
        </button>
      </div>
    </AuthContainer>
  );
}

export function LoginPage() {
  const { loginWithPassword, loginWithGoogle, navigate, t } = useApp();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await loginWithPassword(identifier, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Kirishda xatolik yuz berdi.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await loginWithGoogle();
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google orqali kirishda xatolik.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthContainer title={t.auth.loginTitle} subtitle={t.auth.loginSubtitle}>
      {error && (
        <div
          className="mb-4 p-3 rounded-lg border text-sm"
          style={{
            backgroundColor: 'rgba(220, 38, 38, 0.1)',
            borderColor: 'rgba(220, 38, 38, 0.35)',
            color: '#F87171',
          }}
        >
          {error}
        </div>
      )}

      <button
        type="button"
        disabled={submitting}
        onClick={() => void handleGoogle()}
        className="w-full py-2.5 px-4 rounded-lg border text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderColor: 'var(--border-strong)',
          color: 'var(--text-main)',
        }}
      >
        {t.auth.googleBtn}
      </button>

      <div className="my-5 flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
        <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-subtle)' }} />
        <span>{t.auth.orDivider}</span>
        <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-subtle)' }} />
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            {t.auth.identifier}
          </label>
          <input
            type="text"
            required
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="student@example.com / +998901234567"
            className="w-full px-3.5 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[#2878FF]"
            style={{
              backgroundColor: 'var(--bg-main)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-main)',
            }}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              {t.auth.password}
            </label>
            <button
              type="button"
              onClick={() => navigate('/recover')}
              className="text-xs font-medium hover:underline cursor-pointer"
              style={{ color: 'var(--accent-cyan)' }}
            >
              {t.auth.forgotPassword}
            </button>
          </div>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••"
            className="w-full px-3.5 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[#2878FF]"
            style={{
              backgroundColor: 'var(--bg-main)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-main)',
            }}
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 px-4 rounded-lg text-sm font-semibold text-white cursor-pointer transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ backgroundColor: 'var(--accent-blue)' }}
        >
          {t.auth.loginSubmit}
        </button>
      </form>

      <div className="mt-5 text-center">
        <button
          type="button"
          onClick={() => navigate('/register')}
          className="text-sm font-medium hover:underline cursor-pointer"
          style={{ color: 'var(--accent-cyan)' }}
        >
          {t.auth.noAccount}
        </button>
      </div>
    </AuthContainer>
  );
}

export function RecoverPasswordPage() {
  const { navigate, t } = useApp();
  const [step, setStep] = useState<'request' | 'reset' | 'done'>('request');
  const [identifier, setIdentifier] = useState('');
  const [fullName, setFullName] = useState('');
  const [schoolGrade, setSchoolGrade] = useState<number>(9);
  const [newPassword, setNewPassword] = useState('');
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiFetch<{ ok: boolean; message: string }>('/api/auth/recover/request', {
        method: 'POST',
        body: JSON.stringify({ identifier }),
      });
      setInfo(res.message);
      setStep('reset');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Xatolik yuz berdi.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch<{ ok: boolean }>('/api/auth/recover/reset', {
        method: 'POST',
        body: JSON.stringify({ identifier, fullName, schoolGrade, newPassword }),
      });
      setStep('done');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Xatolik yuz berdi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthContainer title={t.auth.recoverTitle} subtitle={t.auth.recoverSubtitle}>
      {error && (
        <div
          className="mb-4 p-3 rounded-lg border text-sm"
          style={{
            backgroundColor: 'rgba(220, 38, 38, 0.1)',
            borderColor: 'rgba(220, 38, 38, 0.35)',
            color: '#F87171',
          }}
        >
          {error}
        </div>
      )}

      {step === 'request' && (
        <form onSubmit={(e) => void handleRequest(e)} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              {t.auth.identifier}
            </label>
            <input
              type="text"
              required
              minLength={5}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="student@example.com / +998901234567"
              className="w-full px-3.5 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[#2878FF]"
              style={{
                backgroundColor: 'var(--bg-main)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-main)',
              }}
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 rounded-lg text-sm font-semibold text-white cursor-pointer disabled:opacity-60"
            style={{ backgroundColor: 'var(--accent-blue)' }}
          >
            {t.auth.recoverCheckBtn}
          </button>
        </form>
      )}

      {step === 'reset' && (
        <form onSubmit={(e) => void handleReset(e)} className="space-y-4">
          {info && (
            <p className="text-xs leading-relaxed" style={{ color: 'var(--accent-cyan)' }}>
              {info}
            </p>
          )}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              {t.auth.fullName}
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[#2878FF]"
              style={{
                backgroundColor: 'var(--bg-main)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-main)',
              }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              {t.auth.schoolGrade}
            </label>
            <select
              value={schoolGrade}
              onChange={(e) => setSchoolGrade(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[#2878FF]"
              style={{
                backgroundColor: 'var(--bg-main)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-main)',
              }}
            >
              {[5, 6, 7, 8, 9, 10, 11, 12].map((g) => (
                <option key={g} value={g}>
                  {g}
                  {t.auth.gradeSuffix}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              {t.auth.newPassword}
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[#2878FF]"
              style={{
                backgroundColor: 'var(--bg-main)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-main)',
              }}
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 rounded-lg text-sm font-semibold text-white cursor-pointer disabled:opacity-60"
            style={{ backgroundColor: 'var(--accent-blue)' }}
          >
            {t.auth.recoverResetBtn}
          </button>
        </form>
      )}

      {step === 'done' && (
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <p className="text-sm leading-relaxed">{t.auth.recoverSuccess}</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="w-full py-2.5 px-4 rounded-lg text-sm font-semibold text-white cursor-pointer"
            style={{ backgroundColor: 'var(--accent-blue)' }}
          >
            {t.auth.backToLogin}
          </button>
        </div>
      )}

      {step !== 'done' && (
        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-sm font-medium hover:underline cursor-pointer"
            style={{ color: 'var(--accent-cyan)' }}
          >
            {t.auth.backToLogin}
          </button>
        </div>
      )}
    </AuthContainer>
  );
}
