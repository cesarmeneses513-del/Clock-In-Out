import React, { useState } from 'react';
import { AlertCircle, Eye, EyeOff, Key, Lock } from 'lucide-react';
import { supabase } from '../utils/supabase';

// Supabase Auth default minimum password length
const MIN_PASSWORD_LENGTH = 6;

interface SetNewPasswordScreenProps {
  onDone: () => void;
}

// Opened from the reset link in the email: the link signs the worker in, here they choose the new password
export const SetNewPasswordScreen: React.FC<SetNewPasswordScreenProps> = ({ onDone }) => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must have at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError('The passwords do not match.');
      return;
    }
    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (updateError) {
      setError(
        updateError.message.toLowerCase().includes('different')
          ? 'Choose a password different from the old one.'
          : `Could not save the password: ${updateError.message}`
      );
      return;
    }
    onDone();
  };

  const inputClass =
    'w-full bg-white border-2 border-slate-300 rounded-xl pl-10 pr-10 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-colors shadow-2xs';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 font-sans bg-gradient-to-br from-[#f0f6ff] via-[#ffffff] to-[#e8f1fc] text-slate-900">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xl shadow-blue-900/5 space-y-4"
      >
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Key className="w-4 h-4 text-emerald-600 shrink-0" />
          <h1 className="text-sm font-bold text-slate-900 tracking-wide">Choose a New Password</h1>
        </div>

        {error && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {[
          { label: 'New password', value: password, set: setPassword, placeholder: `Minimum ${MIN_PASSWORD_LENGTH} characters` },
          { label: 'Confirm password', value: confirm, set: setConfirm, placeholder: 'Repeat the password' },
        ].map((field) => (
          <div key={field.label}>
            <label className="text-xs font-black text-slate-900 block mb-1.5 uppercase tracking-wide">{field.label}</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={show ? 'text' : 'password'}
                required
                autoComplete="new-password"
                placeholder={field.placeholder}
                value={field.value}
                onChange={(e) => field.set(e.target.value)}
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 cursor-pointer"
                aria-label={show ? 'Hide password' : 'Show password'}
              >
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        ))}

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-black text-xs sm:text-sm shadow-md shadow-blue-600/30 cursor-pointer"
        >
          {saving ? 'SAVING...' : 'SAVE PASSWORD'}
        </button>
      </form>
    </div>
  );
};
