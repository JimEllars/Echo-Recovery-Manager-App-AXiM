const fs = require('fs');
let code = fs.readFileSync('src/components/ui/Badge.jsx', 'utf8');

const search = `const statusStyles = {
  pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  patched: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  replaying: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  resolved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  failed: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
};`;
const replace = `const statusStyles = {
  pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  pending_triage: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  patched: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  replaying: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  resolved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  failed: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  error: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  dead_letter: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
};`;

code = code.replace(search, replace);
fs.writeFileSync('src/components/ui/Badge.jsx', code);
