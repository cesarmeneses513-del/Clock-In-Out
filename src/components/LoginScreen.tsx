import React, { useState, useEffect } from 'react';
import {
  Shield,
  Lock,
  Mail,
  LogIn,
  Eye,
  EyeOff,
  Building2,
  AlertCircle,
  ArrowLeft,
  Pencil,
  Key,
  CheckCircle2,
  Check,
} from 'lucide-react';
import { supabase } from '../utils/supabase';
import { checkInvitation, InvitationInfo } from '../utils/db';
import { contractTypeLabel } from '../types';
import { sound } from '../utils/audio';

// Supabase Auth default minimum password length
const MIN_PASSWORD_LENGTH = 6;

// Session changes are picked up by the auth listener in App, so no callbacks are needed here
export const LoginScreen: React.FC = () => {
  const [authMode, setAuthMode] = useState<'login' | 'create_password'>('login');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [pendingActivationPrompt, setPendingActivationPrompt] = useState<string | null>(null);
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);

  // Create password (invited worker activation) state
  const [activateEmail, setActivateEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [activateError, setActivateError] = useState<string | null>(null);
  const [activateSuccess, setActivateSuccess] = useState<string | null>(null);
  const [isSubmittingActivation, setIsSubmittingActivation] = useState(false);
  const [matchedInvitedEmployee, setMatchedInvitedEmployee] = useState<InvitationInfo | null>(null);

  // Check URL query parameters for direct invitation links (?activate=name@example.com)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const params = new URLSearchParams(window.location.search);
      const inviteEmail =
        params.get('activar') ||
        params.get('activate') ||
        params.get('email') ||
        params.get('invite');
      if (inviteEmail) {
        setActivateEmail(decodeURIComponent(inviteEmail));
        setAuthMode('create_password');
      }
    } catch {
      // ignore param parse errors
    }
  }, []);

  // Look up the invitation matching activateEmail (debounced)
  useEffect(() => {
    const clean = activateEmail.trim().toLowerCase();
    if (!clean.includes('@') || !clean.includes('.')) {
      setMatchedInvitedEmployee(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      checkInvitation(clean)
        .then((info) => {
          if (!cancelled) setMatchedInvitedEmployee(info);
        })
        .catch(() => {
          if (!cancelled) setMatchedInvitedEmployee(null);
        });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [activateEmail]);

  // Handle Login submission
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setPendingActivationPrompt(null);

    const emailTrimmed = loginEmail.trim().toLowerCase();
    const passTrimmed = loginPassword.trim();

    if (!emailTrimmed || !passTrimmed) {
      setLoginError(
        'Please enter your email and password.'
      );
      return;
    }

    setIsSubmittingLogin(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: emailTrimmed,
      password: passTrimmed,
    });
    setIsSubmittingLogin(false);

    if (!error) {
      sound.playClockIn();
      return;
    }

    sound.playKeypad();

    if (error.code === 'email_not_confirmed') {
      setLoginError(
        'Your email is not confirmed yet. Check your inbox and open the confirmation link.'
      );
      return;
    }

    // Check if worker was invited but has not created a password yet
    const invitation = await checkInvitation(emailTrimmed).catch(() => null);
    if (invitation?.invitationStatus === 'pending') {
      setPendingActivationPrompt(emailTrimmed);
      setLoginError(
        'You were invited by your CPR admin, but have not set your password yet.'
      );
      return;
    }

    setLoginError(
      'Incorrect email or password. Please verify and try again.'
    );
  };

  // Handle worker setting their access password
  const handleCreatePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActivateError(null);
    setActivateSuccess(null);

    const emailClean = activateEmail.trim().toLowerCase();
    const pass = newPassword.trim();
    const confirm = confirmPassword.trim();

    if (!emailClean) {
      setActivateError(
        'Enter the email you were invited with.'
      );
      return;
    }

    if (!matchedInvitedEmployee) {
      sound.playKeypad();
      setActivateError(
        'No active invitation found for this email. Ask your CPR administrator to invite you.'
      );
      return;
    }

    if (!pass || !confirm) {
      setActivateError(
        'Please enter and confirm your new password.'
      );
      return;
    }

    if (pass.length < MIN_PASSWORD_LENGTH) {
      setActivateError(
        `Password must have at least ${MIN_PASSWORD_LENGTH} characters.`
      );
      return;
    }

    if (pass !== confirm) {
      setActivateError(
        'Passwords do not match. Please verify and try again.'
      );
      return;
    }

    setIsSubmittingActivation(true);
    const { data, error } = await supabase.auth.signUp({
      email: emailClean,
      password: pass,
      options: { emailRedirectTo: window.location.origin },
    });
    setIsSubmittingActivation(false);

    if (error) {
      sound.playKeypad();
      if (error.code === 'user_already_exists') {
        setActivateError(
          'This email already has a password. Please sign in.'
        );
      } else {
        setActivateError(
          `Could not activate the account: ${error.message}`
        );
      }
      return;
    }

    sound.playClockIn();
    if (data.session) {
      setActivateSuccess(
        `Password created successfully for ${matchedInvitedEmployee.name}! Signing in...`
      );
    } else {
      // Email confirmation is enabled in Supabase: the session starts after the link is opened
      setActivateSuccess(
        'Password created! We sent you a confirmation email. Open the link, then sign in.'
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0f6ff] via-[#ffffff] to-[#e8f1fc] text-slate-900 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden font-sans selection:bg-blue-500/20 selection:text-blue-600">
      {/* Background ambient lighting - Soft Blue & Cyan CPR Glow */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-sky-200/40 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Header with CPR Facade Upgrade Specialists Corporate Logo */}
        <div className="text-center space-y-3">
          {/* CPR Facade Upgrade Specialists logo */}
          <div className="inline-flex items-center bg-white px-5 py-3 rounded-2xl shadow-lg shadow-blue-900/5 border border-slate-200/80">
            <img
              src="/cpr-logo.jpg"
              alt="CPR Facade Upgrade Specialists"
              className="h-14 sm:h-16 w-auto"
            />
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
              CPR Clock In/Out
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Time & attendance for{' '}
              <span className="text-blue-700 font-semibold">Internal Team</span> and{' '}
              <span className="text-purple-700 font-semibold">ASP Contractors</span>
            </p>
          </div>
        </div>

        {/* Clean Auth Card */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xl shadow-blue-900/5 space-y-5 text-slate-900">
          {/* Card Header */}
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            {authMode === 'login' ? (
              <Pencil className="w-4 h-4 text-blue-600 shrink-0" />
            ) : (
              <Key className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <h2 className="text-sm font-bold text-slate-900 tracking-wide">
              {authMode === 'login'
                ? 'Employee Sign In'
                : 'Set Access Password'}
            </h2>
          </div>

          {/* VIEW 1: SIGN IN */}
          {authMode === 'login' && (
            <div className="space-y-4">
              {loginError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-2 animate-in fade-in">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                    <span>{loginError}</span>
                  </div>
                  {pendingActivationPrompt && (
                    <button
                      type="button"
                      onClick={() => {
                        setActivateEmail(pendingActivationPrompt);
                        setAuthMode('create_password');
                        setLoginError(null);
                        setPendingActivationPrompt(null);
                      }}
                      className="w-full py-1.5 px-3 rounded-xl bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-900 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Key className="w-3.5 h-3.5 text-amber-700" />
                      <span>
                        Set my password now →
                      </span>
                    </button>
                  )}
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-black text-slate-900 block mb-1.5 uppercase tracking-wide">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="name@example.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full bg-white border-2 border-slate-300 rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-colors shadow-2xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-900 block mb-1.5 uppercase tracking-wide">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full bg-white border-2 border-slate-300 rounded-xl pl-10 pr-10 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-colors shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      {showLoginPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingLogin}
                  className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs sm:text-sm shadow-md shadow-blue-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer mt-2"
                >
                  <LogIn className="w-4 h-4 text-white" />
                  <span>SIGN IN</span>
                </button>
              </form>

              {/* Bottom row: Worker creates their key from admin invitation */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                <span className="text-xs text-slate-700 font-medium">
                  Invited by your admin?
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('create_password');
                    setLoginError(null);
                    setActivateError(null);
                    if (loginEmail) setActivateEmail(loginEmail);
                  }}
                  className="text-xs font-bold text-blue-700 hover:text-blue-900 hover:underline transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Key className="w-3.5 h-3.5 text-blue-700" />
                  <span>
                    Set your password
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* VIEW 2: WORKER SETS PASSWORD FROM INVITATION */}
          {authMode === 'create_password' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">
                Enter the email you were invited with by your CPR administrator to set up your personal password.
              </p>

              {activateError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{activateError}</span>
                </div>
              )}

              {activateSuccess && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5 animate-in fade-in">
                  <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
                  <span className="font-semibold">{activateSuccess}</span>
                </div>
              )}

              <form onSubmit={handleCreatePasswordSubmit} className="space-y-3.5">
                {/* Email */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Invited Email *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="your.email@example.com"
                      value={activateEmail}
                      onChange={(e) => {
                        setActivateEmail(e.target.value);
                        setActivateError(null);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-colors"
                    />
                  </div>
                </div>

                {/* Real-time Employee Match Card */}
                {matchedInvitedEmployee && (
                  <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-2.5 animate-in fade-in">
                    <div className="flex items-center justify-between pb-1.5 border-b border-blue-100">
                      <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                        <Check className="w-3 h-3" />
                        CPR Invitation Verified
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {contractTypeLabel(matchedInvitedEmployee.contractType)}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl ${matchedInvitedEmployee.avatarBg} flex items-center justify-center font-bold text-sm text-white shadow-xs shrink-0`}
                      >
                        {matchedInvitedEmployee.name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-slate-900 truncate">
                          {matchedInvitedEmployee.name}
                        </h4>
                        <p className="text-[11px] text-slate-500 truncate">
                          {matchedInvitedEmployee.role}
                        </p>
                      </div>
                    </div>

                    {matchedInvitedEmployee.siteName && (
                      <div className="text-[11px] text-slate-600 flex items-center gap-1.5 pt-1 border-t border-blue-100">
                        <Building2 className="w-3 h-3 text-blue-600 shrink-0" />
                        <span className="truncate">Site: {matchedInvitedEmployee.siteName}</span>
                      </div>
                    )}

                    {/* Notice if account is already active */}
                    {matchedInvitedEmployee.invitationStatus === 'active' && (
                      <div className="pt-2 border-t border-blue-100 text-[11px] text-blue-800 flex items-center justify-between">
                        <span>You already have a password.</span>
                        <button
                          type="button"
                          onClick={() => {
                            setLoginEmail(activateEmail.trim().toLowerCase());
                            setAuthMode('login');
                          }}
                          className="font-bold underline text-blue-700 hover:text-blue-900 cursor-pointer"
                        >
                          Go to Sign In →
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Show password fields if an invitation exists (or pending) */}
                {matchedInvitedEmployee && (
                  <div className="space-y-3 pt-1 animate-in fade-in">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Create your new password *
                      </label>
                      <div className="relative">
                        <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          required
                          placeholder={`Minimum ${MIN_PASSWORD_LENGTH} characters`}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-9 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showNewPassword ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Confirm password *
                      </label>
                      <div className="relative">
                        <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          required
                          placeholder="Repeat your password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingActivation}
                      className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Key className="w-4 h-4" />
                      <span>
                        Activate Account & Save Password
                      </span>
                    </button>
                  </div>
                )}

                {/* If email entered with @ and no match found */}
                {activateEmail.includes('@') && activateEmail.includes('.') && !matchedInvitedEmployee && (
                  <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1 animate-in fade-in">
                    <div className="font-semibold flex items-center gap-1.5 text-amber-800">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      <span>No active invitation</span>
                    </div>
                    <p className="text-[11px] text-amber-700">
                      We found no invitation for this email. Ask your CPR administrator or supervisor to add you.
                    </p>
                  </div>
                )}
              </form>

              {/* Bottom row with ← Back button */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setActivateError(null);
                  }}
                  className="text-slate-500 hover:text-slate-900 flex items-center gap-1.5 font-medium transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setActivateError(null);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline transition-colors cursor-pointer"
                >
                  I already have a password
                </button>
              </div>
            </div>
          )}

          {/* Privacy Note */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-500 space-y-1">
            <div className="font-semibold text-slate-700 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-blue-600" />
              Secure Access & Privacy:
            </div>
            <p>
              • Your admin invites you, then you create your own private password to sign in.
            </p>
          </div>
        </div>

        {/* Footer info matching user screenshot exact signature */}
        <p className="text-center text-[11px] text-slate-400 font-medium">
          Created by <strong className="text-slate-600">CIMA & Daniel Vidal</strong> · CPR 2026
        </p>
      </div>
    </div>
  );
};
