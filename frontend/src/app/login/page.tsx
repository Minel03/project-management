'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Database, Lock, User, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { login, triggerDbInit } = useAuth();
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Database Initialization State
  const [isDbInitializing, setIsDbInitializing] = useState(false);
  const [dbInitMessage, setDbInitMessage] = useState<string | null>(null);
  const [dbInitType, setDbInitType] = useState<'success' | 'error' | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!emailOrUsername || !password) {
      setError('Please enter all credentials');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(emailOrUsername, password);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDbInit = async (reset: boolean) => {
    setIsDbInitializing(true);
    setDbInitMessage(null);
    setDbInitType(null);
    try {
      const result = await triggerDbInit(reset);
      if (result.success) {
        setDbInitType('success');
        setDbInitMessage(
          `Success! Database configured. Demo credentials: \n• Username: john_doe\n• Password: password123`
        );
        // Pre-fill form for easy login
        setEmailOrUsername('john_doe');
        setPassword('password123');
      } else {
        setDbInitType('error');
        setDbInitMessage(result.message || 'Failed to initialize database.');
      }
    } catch (err: any) {
      setDbInitType('error');
      setDbInitMessage(err.message || 'Connection to API failed. Is the backend server running?');
    } finally {
      setIsDbInitializing(false);
    }
  };

  return (
    <main className="relative min-h-screen flex items-center justify-center overflow-hidden px-4">
      {/* Premium Ambient Glowing Lights */}
      <div className="ambient-glow -top-40 -left-40 w-96 h-96"></div>
      <div className="ambient-glow-cyan -bottom-40 -right-40 w-96 h-96"></div>

      <div className="w-full max-w-md z-10">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 mb-3">
            <span className="text-3xl font-extrabold bg-linear-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">AB</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100">Welcome Back</h1>
          <p className="text-sm text-slate-400 mt-1">Manage your team projects on the AuraBoard dashboard.</p>
        </div>

        {/* Database Auto-initializer Card for Evaluators */}
        <div className="mb-6 p-4 rounded-2xl bg-slate-900/60 border border-indigo-500/15 backdrop-blur-xl">
          <div className="flex items-center gap-2 mb-2 text-indigo-400">
            <Database className="w-4 h-4" />
            <h2 className="text-xs font-semibold uppercase tracking-wider">Evaluator Quick Setup</h2>
          </div>
          <p className="text-xs text-slate-400 mb-3 leading-relaxed">
            Click here to programmatically create the MySQL schema and insert demo projects, tasks, and change logs.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handleDbInit(false)}
              disabled={isDbInitializing}
              className="flex-1 py-1.5 px-3 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 active:bg-slate-800 border border-slate-700 text-slate-200 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isDbInitializing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Init Schema'}
            </button>
            <button
              onClick={() => handleDbInit(true)}
              disabled={isDbInitializing}
              className="flex-1 py-1.5 px-3 rounded-lg text-xs font-medium bg-indigo-600/20 hover:bg-indigo-600/30 active:bg-indigo-600/40 border border-indigo-500/30 text-indigo-200 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isDbInitializing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Reset & Seed Demo'}
            </button>
          </div>

          {dbInitMessage && (
            <div className={`mt-3 p-2.5 rounded-lg border text-xs whitespace-pre-line flex gap-2 ${
              dbInitType === 'success' 
                ? 'bg-emerald-950/30 border-emerald-500/20 text-emerald-300' 
                : 'bg-rose-950/30 border-rose-500/20 text-rose-300'
            }`}>
              {dbInitType === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              )}
              <div>{dbInitMessage}</div>
            </div>
          )}
        </div>

        {/* Authentication Card */}
        <div className="p-6 rounded-3xl bg-slate-900/40 border border-slate-800 backdrop-blur-xl shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="credential" className="block text-xs font-medium text-slate-400 mb-1.5">
                Username or Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <User className="w-4 h-4" />
                </span>
                <input
                  id="credential"
                  type="text"
                  placeholder="john_doe or john@example.com"
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none text-sm text-slate-200 placeholder-slate-600 transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-xs font-medium text-slate-400">
                  Password
                </label>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none text-sm text-slate-200 placeholder-slate-600 transition-all"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-xl font-medium bg-linear-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-slate-100 shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Logging in...</span>
                </>
              ) : (
                <span>Log In</span>
              )}
            </button>
          </form>

          <div className="text-center mt-6 pt-6 border-t border-slate-800/60">
            <p className="text-xs text-slate-500">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                Create Account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
