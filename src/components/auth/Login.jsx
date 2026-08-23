import React from 'react';
import { motion } from 'framer-motion';
import { FiLock } from 'react-icons/fi';

export default function Login() {
  const handleSSO = () => {
    const passportUrl = import.meta.env.VITE_PASSPORT_URL || 'https://passport.axim.us.com?redirect=echo';
    window.location.href = passportUrl;
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-950 font-sans overflow-hidden relative">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md p-8 bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl z-10 text-center"
      >
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <FiLock className="text-white text-lg" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">AXiM System Access</h1>
        </div>

        <button
          onClick={handleSSO}
          className="w-full mt-2 py-3 px-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium shadow-lg shadow-cyan-900/20 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all flex items-center justify-center gap-2"
        >
          <span>Authenticate via AXiM Passport</span>
        </button>

        <div className="mt-8 text-center text-xs text-slate-500">
          <p>AXiM Central Command. Authorized Personnel Only.</p>
        </div>
      </motion.div>
    </div>
  );
}
