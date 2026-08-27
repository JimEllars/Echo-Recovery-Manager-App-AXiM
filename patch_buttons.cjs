const fs = require('fs');

// Patch ReplayOrchestrator.jsx
let code1 = fs.readFileSync('src/components/ReplayOrchestrator.jsx', 'utf8');

// The original code already has:
// isTriaging || isReplaying ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
// and <SafeIcon icon={isTriaging ? FiLoader : FiZap} className={isTriaging ? 'animate-spin' : ''} />
// I will ensure it has opacity-50 too according to task requirements.

code1 = code1.replace(
  `isTriaging || isReplaying\n                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'\n                : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/20'`,
  `isTriaging || isReplaying\n                ? 'bg-slate-700 text-slate-400 opacity-50 cursor-not-allowed'\n                : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/20'`
);

code1 = code1.replace(
  `isReplaying || isTriaging\n              ? 'bg-slate-700 text-slate-400 cursor-not-allowed'\n              : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-500/20'`,
  `isReplaying || isTriaging\n              ? 'bg-slate-700 text-slate-400 opacity-50 cursor-not-allowed'\n              : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-500/20'`
);

fs.writeFileSync('src/components/ReplayOrchestrator.jsx', code1);


// Patch OnyxPatchReview.jsx
let code2 = fs.readFileSync('src/components/OnyxPatchReview.jsx', 'utf8');

// The original code already has `disabled:opacity-50 disabled:cursor-not-allowed` and icons. Just double checking.
// The code has: `className="px-6 py-2 rounded-lg text-sm font-medium bg-purple-600 hover:bg-purple-500 text-white transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/20"`
// This seems already compliant!

fs.writeFileSync('src/components/OnyxPatchReview.jsx', code2);
