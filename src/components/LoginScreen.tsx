import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  Shield,
  Lock,
  Mail,
  LogIn,
  Eye,
  EyeOff,
  Building2,
  AlertCircle,
  Briefcase,
  ArrowLeft,
  Pencil,
  Globe,
  Key,
  CheckCircle2,
  Check,
  Sparkles,
  Sun,
  Moon,
  Copy,
} from 'lucide-react';
import { Employee, ProjectSite } from '../types';
import { sound } from '../utils/audio';

interface LoginScreenProps {
  employees: Employee[];
  projects?: ProjectSite[];
  onLogin: (employee: Employee) => void;
  onRegister?: (employee: Employee) => void;
  onActivateEmployee: (employeeId: string, password: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  employees,
  projects = [],
  onLogin,
  onActivateEmployee,
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'create_password'>('login');
  const [lang, setLang] = useState<'es' | 'en'>('es');
  const [showKeysModal, setShowKeysModal] = useState(false);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [pendingActivationPrompt, setPendingActivationPrompt] = useState<string | null>(null);

  // Create password (invited worker activation) state
  const [activateEmail, setActivateEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [activateError, setActivateError] = useState<string | null>(null);
  const [activateSuccess, setActivateSuccess] = useState<string | null>(null);
  const [isSubmittingActivation, setIsSubmittingActivation] = useState(false);

  // Check URL query parameters for direct invitation links (?activar=correo@cpr.org)
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

  // Find invited employee matching activateEmail
  const matchedInvitedEmployee = useMemo(() => {
    const clean = activateEmail.trim().toLowerCase();
    if (!clean || !clean.includes('@')) return null;
    return (
      employees.find((emp) => emp.email && emp.email.trim().toLowerCase() === clean) || null
    );
  }, [activateEmail, employees]);

  // Assigned project name for the matched employee
  const matchedProjectSite = useMemo(() => {
    if (!matchedInvitedEmployee?.activeProjectId) return projects[0] || null;
    return (
      projects.find((p) => p.id === matchedInvitedEmployee.activeProjectId) ||
      projects[0] ||
      null
    );
  }, [matchedInvitedEmployee, projects]);

  // Handle Login submission
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setPendingActivationPrompt(null);

    const emailTrimmed = loginEmail.trim().toLowerCase();
    const passTrimmed = loginPassword.trim();

    if (!emailTrimmed || !passTrimmed) {
      setLoginError(
        lang === 'es'
          ? 'Por favor, ingresa tu correo y tu clave.'
          : 'Please enter your email and password.'
      );
      return;
    }

    // Find employee by email (case-insensitive)
    const matchedEmployee = employees.find((emp) => {
      const empEmail = emp.email ? emp.email.trim().toLowerCase() : '';
      return empEmail === emailTrimmed;
    });

    if (!matchedEmployee) {
      sound.playKeypad();
      setLoginError(
        lang === 'es'
          ? 'No se encontró ningún usuario con ese correo electrónico.'
          : 'No user was found with that email address.'
      );
      return;
    }

    // Check if worker was invited but has not created a password yet
    if (matchedEmployee.invitationStatus === 'pending' || !matchedEmployee.password) {
      sound.playKeypad();
      setPendingActivationPrompt(matchedEmployee.email || emailTrimmed);
      setLoginError(
        lang === 'es'
          ? 'Fuiste invitado por tu administrador CPR, pero aún no has creado tu clave de acceso.'
          : 'You were invited by your CPR admin, but have not set your access password yet.'
      );
      return;
    }

    // Validate password or pin
    const validPassword = matchedEmployee.password || matchedEmployee.pin;
    if (passTrimmed === validPassword || passTrimmed === matchedEmployee.pin) {
      sound.playClockIn();
      onLogin(matchedEmployee);
    } else {
      sound.playKeypad();
      setLoginError(
        lang === 'es'
          ? 'Clave incorrecta. Verifica tu contraseña o PIN.'
          : 'Incorrect password. Please verify your password or PIN.'
      );
    }
  };

  // Handle worker setting their access password
  const handleCreatePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActivateError(null);
    setActivateSuccess(null);

    const emailClean = activateEmail.trim().toLowerCase();
    const pass = newPassword.trim();
    const confirm = confirmPassword.trim();

    if (!emailClean) {
      setActivateError(
        lang === 'es'
          ? 'Ingresa el correo con el que fuiste invitado.'
          : 'Enter the email you were invited with.'
      );
      return;
    }

    if (!matchedInvitedEmployee) {
      sound.playKeypad();
      setActivateError(
        lang === 'es'
          ? 'No se encontró ninguna invitación activa para este correo. Solicita a tu administrador CPR que te agregue a la empresa.'
          : 'No active invitation found for this email. Ask your CPR administrator to invite you.'
      );
      return;
    }

    if (!pass || !confirm) {
      setActivateError(
        lang === 'es'
          ? 'Por favor, ingresa y confirma tu nueva clave de acceso.'
          : 'Please enter and confirm your new access password.'
      );
      return;
    }

    if (pass.length < 4) {
      setActivateError(
        lang === 'es'
          ? 'La clave de acceso debe tener al menos 4 caracteres o números.'
          : 'Password must have at least 4 characters or digits.'
      );
      return;
    }

    if (pass !== confirm) {
      setActivateError(
        lang === 'es'
          ? 'Las claves ingresadas no coinciden. Verifícalas e intenta nuevamente.'
          : 'Passwords do not match. Please verify and try again.'
      );
      return;
    }

    // All valid - activate account!
    setIsSubmittingActivation(true);
    sound.playClockIn();
    setActivateSuccess(
      lang === 'es'
        ? `¡Clave creada con éxito para ${matchedInvitedEmployee.name}! Accediendo al sistema...`
        : `Password created successfully for ${matchedInvitedEmployee.name}! Logging in...`
    );

    setTimeout(() => {
      onActivateEmployee(matchedInvitedEmployee.id, pass);
    }, 700);
  };

  const handleAutofillCredentials = (email: string, pass: string) => {
    setLoginEmail(email);
    setLoginPassword(pass);
    setAuthMode('login');
    setShowKeysModal(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0f6ff] via-[#ffffff] to-[#e8f1fc] text-slate-900 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden font-sans selection:bg-blue-500/20 selection:text-blue-600">
      {/* Background ambient lighting - Soft Blue & Cyan CPR Glow */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-sky-200/40 rounded-full blur-3xl pointer-events-none" />

      {/* Top Controls: Language Switcher */}
      <div className="absolute top-6 right-6 z-20 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setLang(lang === 'es' ? 'en' : 'es')}
          className="px-3 py-1.5 rounded-full border border-slate-200 bg-white/95 text-slate-700 hover:text-blue-700 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer hover:border-blue-300"
          title="Cambiar idioma / Switch language"
        >
          <Globe className="w-3.5 h-3.5 text-blue-600" />
          <span>{lang === 'es' ? 'ES' : 'EN'}</span>
        </button>
      </div>

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Header with CPR Facade Upgrade Specialists Corporate Logo */}
        <div className="text-center space-y-3">
          {/* Logo badge matching user screenshot style */}
          <div className="inline-flex items-center gap-3 bg-white px-5 py-3 rounded-2xl shadow-lg shadow-blue-900/5 border border-slate-200/80">
            {/* CPR Facade Logo Geometric mark */}
            <div className="flex items-center">
              <svg viewBox="0 0 140 70" className="h-9 w-auto" fill="none">
                <path d="M12 36 L40 10 L56 22 L32 44 L54 62 L38 70 Z" fill="#0284c7" />
                <path d="M40 10 L68 32 L52 44 L38 32 Z" fill="#0369a1" />
                <path d="M54 62 L68 32 L56 22 L45 33 Z" fill="#0284c7" opacity="0.85" />
                <text
                  x="18"
                  y="43"
                  fill="white"
                  fontSize="15"
                  fontWeight="900"
                  fontFamily="system-ui, sans-serif"
                  letterSpacing="-0.5"
                >
                  CPR
                </text>
              </svg>
            </div>
            {/* Corporate typography */}
            <div className="text-left leading-none border-l-2 border-slate-200 pl-3">
              <div className="text-[12px] font-black tracking-wider text-[#0f2d59] font-sans">
                FACADE
              </div>
              <div className="text-[12px] font-black tracking-wider text-[#0f2d59] font-sans mt-0.5">
                UPGRADE
              </div>
              <div className="text-[10px] font-black tracking-wider text-[#0284c7] font-sans mt-0.5">
                SPECIALISTS
              </div>
            </div>
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
              CPR Clock In/Out
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {lang === 'es' ? (
                <>
                  Control de asistencia para{' '}
                  <span className="text-blue-700 font-semibold">Internal Team</span> y{' '}
                  <span className="text-purple-700 font-semibold">ASP Contratistas</span>
                </>
              ) : (
                <>
                  Time & attendance for{' '}
                  <span className="text-blue-700 font-semibold">Internal Team</span> and{' '}
                  <span className="text-purple-700 font-semibold">ASP Contractors</span>
                </>
              )}
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
                ? lang === 'es'
                  ? 'Acceso de Colaborador'
                  : 'Editor access'
                : lang === 'es'
                ? 'Crear Clave de Acceso (Invitación)'
                : 'Set Access Password'}
            </h2>
          </div>

          {/* VIEW 1: INICIAR SESIÓN (SIGN IN) */}
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
                        {lang === 'es'
                          ? 'Crear mi clave de acceso ahora →'
                          : 'Set my password now →'}
                      </span>
                    </button>
                  )}
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-black text-slate-900 block mb-1.5 uppercase tracking-wide">
                    {lang === 'es' ? 'Correo Electrónico (Email)' : 'Email'}
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder={lang === 'es' ? 'ejemplo@cpr.org' : 'name@example.com'}
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full bg-white border-2 border-slate-300 rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-colors shadow-2xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-900 block mb-1.5 uppercase tracking-wide">
                    {lang === 'es' ? 'Clave / Contraseña (Password)' : 'Password'}
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
                  className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs sm:text-sm shadow-md shadow-blue-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer mt-2"
                >
                  <LogIn className="w-4 h-4 text-white" />
                  <span>{lang === 'es' ? 'INGRESAR AL SISTEMA (SIGN IN)' : 'SIGN IN'}</span>
                </button>
              </form>

              {/* Bottom row: Worker creates their key from admin invitation */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                <span className="text-xs text-slate-700 font-medium">
                  {lang === 'es' ? '¿Fuiste invitado por tu administrador?' : 'Invited by your admin?'}
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
                    {lang === 'es' ? 'Crear mi clave de acceso' : 'Set your password'}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* VIEW 2: CREAR CLAVE DE ACCESO (WORKER SETS PASSWORD FROM INVITATION) */}
          {authMode === 'create_password' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">
                {lang === 'es'
                  ? 'Ingresa el correo con el que fuiste invitado por tu administrador CPR para crear tu clave de acceso personal.'
                  : 'Enter the email you were invited with by your CPR administrator to set up your personal access key.'}
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
                {/* Correo Electrónico */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    {lang === 'es' ? 'Correo Electrónico Invitado *' : 'Invited Email *'}
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="tu.correo@cpr.org"
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
                        {lang === 'es' ? 'Invitación CPR Confirmada' : 'CPR Invitation Verified'}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {matchedInvitedEmployee.contractType}
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

                    {matchedProjectSite && (
                      <div className="text-[11px] text-slate-600 flex items-center gap-1.5 pt-1 border-t border-blue-100">
                        <Building2 className="w-3 h-3 text-blue-600 shrink-0" />
                        <span className="truncate">Sede: {matchedProjectSite.name}</span>
                      </div>
                    )}

                    {/* Notice if account is already active */}
                    {matchedInvitedEmployee.invitationStatus === 'active' && matchedInvitedEmployee.password && (
                      <div className="pt-2 border-t border-blue-100 text-[11px] text-blue-800 flex items-center justify-between">
                        <span>Ya tienes una clave creada.</span>
                        <button
                          type="button"
                          onClick={() => {
                            setLoginEmail(matchedInvitedEmployee.email || '');
                            setAuthMode('login');
                          }}
                          className="font-bold underline text-blue-700 hover:text-blue-900 cursor-pointer"
                        >
                          Ir a Iniciar Sesión →
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
                        {lang === 'es'
                          ? 'Crea tu Nueva Clave de Acceso (Password) *'
                          : 'Create your new password *'}
                      </label>
                      <div className="relative">
                        <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          required
                          placeholder="Mínimo 4 caracteres o números"
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
                        {lang === 'es' ? 'Confirmar Clave de Acceso *' : 'Confirm password *'}
                      </label>
                      <div className="relative">
                        <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          required
                          placeholder="Repite tu clave"
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
                        {lang === 'es'
                          ? 'Activar Cuenta y Guardar mi Clave'
                          : 'Activate Account & Save Password'}
                      </span>
                    </button>
                  </div>
                )}

                {/* If email entered with @ and no match found */}
                {activateEmail.includes('@') && activateEmail.includes('.') && !matchedInvitedEmployee && (
                  <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1 animate-in fade-in">
                    <div className="font-semibold flex items-center gap-1.5 text-amber-800">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      <span>Sin invitación activa</span>
                    </div>
                    <p className="text-[11px] text-amber-700">
                      No encontramos ninguna invitación registrada para este correo. Solicita a tu administrador o supervisor CPR que te agregue.
                    </p>
                  </div>
                )}
              </form>

              {/* Bottom row with ← Volver button */}
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
                  <span>{lang === 'es' ? 'Volver (Back)' : 'Back'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setActivateError(null);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline transition-colors cursor-pointer"
                >
                  {lang === 'es' ? 'Ya tengo mi clave' : 'Already set my password'}
                </button>
              </div>
            </div>
          )}

          {/* Privacy Note */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-500 space-y-1">
            <div className="font-semibold text-slate-700 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-blue-600" />
              {lang === 'es' ? 'Acceso Seguro y Privacidad:' : 'Secure Access & Privacy:'}
            </div>
            <p>
              {lang === 'es'
                ? '• El administrador registra al colaborador y el trabajador crea su clave privada para ingresar.'
                : '• Admin invites the employee and the worker creates their private key to sign in.'}
            </p>
          </div>
        </div>

        {/* Helper to view already created keys */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setShowKeysModal(true)}
            className="px-4 py-2 rounded-2xl border border-blue-200 bg-white hover:bg-blue-50 text-blue-800 text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <Key className="w-3.5 h-3.5 text-blue-600" />
            <span>Ver Claves de Acceso Creadas ({employees.length})</span>
          </button>
        </div>

        {/* Modal: Claves Creadas */}
        {showKeysModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
            <div className="w-full max-w-lg rounded-3xl p-6 bg-white border border-slate-200 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto text-slate-900">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Claves de Acceso del Sistema</h3>
                    <p className="text-[11px] text-slate-500">Usuarios configurados en CPR Clock</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowKeysModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 transition-colors cursor-pointer font-bold text-sm"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2.5 text-xs">
                {employees.map((emp) => {
                  const isPending = emp.invitationStatus === 'pending' || !emp.password;
                  return (
                    <div
                      key={emp.id}
                      className="p-3 rounded-2xl border border-slate-200 bg-slate-50/80 hover:bg-blue-50/40 hover:border-blue-200 flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-xl ${emp.avatarBg} text-white font-bold flex items-center justify-center text-xs shrink-0`}>
                          {emp.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 truncate">{emp.name}</span>
                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold border ${
                              emp.systemRole === 'admin'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : emp.systemRole === 'manager'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}>
                              {emp.systemRole}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate">{emp.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isPending ? (
                          <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
                            Invitación Pendiente
                          </span>
                        ) : (
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block">Clave / PIN</span>
                            <span className="font-mono font-bold text-blue-700 text-sm tracking-wider">
                              {emp.password || emp.pin}
                            </span>
                          </div>
                        )}

                        {!isPending && (
                          <button
                            type="button"
                            onClick={() => {
                              handleAutofillCredentials(emp.email || '', emp.password || emp.pin || '');
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[11px] transition-colors cursor-pointer shadow-xs"
                          >
                            Usar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowKeysModal(false)}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors cursor-pointer"
                >
                  Entendido / Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer info matching user screenshot exact signature */}
        <p className="text-center text-[11px] text-slate-400 font-medium">
          Created by <strong className="text-slate-600">CIMA & Daniel Vidal</strong> · CPR 2026
        </p>
      </div>
    </div>
  );
};
