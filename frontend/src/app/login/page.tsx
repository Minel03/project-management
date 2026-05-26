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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isDbInitializing, setIsDbInitializing] = useState(false);
  const [dbInitMessage, setDbInitMessage] = useState<string | null>(null);
  const [dbInitType, setDbInitType] = useState<'success' | 'error' | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
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
          `Database ready.\nDemo credentials:\n  Username: john_doe\n  Password: password123`
        );
        setEmailOrUsername('john_doe');
        setPassword('password123');
      } else {
        setDbInitType('error');
        setDbInitMessage(result.message || 'Failed to initialize database.');
      }
    } catch (err: any) {
      setDbInitType('error');
      setDbInitMessage(err.message || 'Could not reach backend. Is the server running?');
    } finally {
      setIsDbInitializing(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-5">

        {/* Logo */}
        <div className="mb-2">
          <div className="flex items-center gap-2.5 mb-4">
            <span className="text-base font-semibold text-zinc-100 tracking-tight">Project Management Tool</span>
          </div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Sign in</h1>
          <p className="text-sm text-zinc-500 mt-1">Enter your credentials to continue.</p>
        </div>

        {/* DB Init Panel */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Database Setup</span>
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Prepare the database tables or rebuild a fresh demo workspace.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handleDbInit(false)}
              disabled={isDbInitializing}
              className="flex-1 py-1.5 px-3 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isDbInitializing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Create Tables'}
            </button>
            <button
              onClick={() => handleDbInit(true)}
              disabled={isDbInitializing}
              className="flex-1 py-1.5 px-3 rounded-md text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isDbInitializing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Load Demo Data'}
            </button>
          </div>

          {dbInitMessage && (
            <div className={`flex gap-2 p-2.5 rounded-md text-xs whitespace-pre-line border ${
              dbInitType === 'success'
                ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                : 'bg-red-950/40 border-red-800 text-red-300'
            }`}>
              {dbInitType === 'success'
                ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-400" />
                : <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-400" />
              }
              <span>{dbInitMessage}</span>
            </div>
          )}
        </div>

        {/* Login Form */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-2.5 rounded-md bg-red-950/40 border border-red-800 text-red-300 text-xs">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="credential" className="block text-xs font-medium text-zinc-400 mb-1.5">
                Username or Email
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                <input
                  id="credential"
                  type="text"
                  placeholder="john_doe"
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-md bg-zinc-950 border border-zinc-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none text-sm text-zinc-200 placeholder-zinc-600 transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-medium text-zinc-400 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-md bg-zinc-950 border border-zinc-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none text-sm text-zinc-200 placeholder-zinc-600 transition-colors"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2 px-4 rounded-md font-medium bg-indigo-600 hover:bg-indigo-500 text-white text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-zinc-500 pt-3 border-t border-zinc-800">
            No account?{' '}
            <Link href="/register" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
