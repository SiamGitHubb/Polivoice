
import React from 'react';
import { ARCHITECTURE_DATA } from '../constants';

const ArchitectureView: React.FC = () => {
  return (
    <div className="bg-slate-900 text-slate-300 p-6 rounded-xl shadow-inner space-y-8 overflow-y-auto max-h-[70vh]">
      <h2 className="text-xl font-bold text-emerald-400 border-b border-slate-700 pb-2">আর্কিটেকচার ডিজাইন (Architectural Doc)</h2>
      {ARCHITECTURE_DATA.map((section, idx) => (
        <div key={idx} className="space-y-3">
          <h3 className="text-lg font-semibold text-white">{section.title}</h3>
          <p className="text-sm italic">{section.description}</p>
          <ul className="list-disc list-inside space-y-1 pl-4 text-sm">
            {section.items.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        </div>
      ))}
      <div className="mt-8 pt-4 border-t border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-2">৫. ব্যাকএন্ড API কাঠামো</h3>
        <code className="block bg-slate-800 p-3 rounded text-xs overflow-x-auto text-emerald-300">
          GET /api/v1/auth/login<br/>
          POST /api/v1/study/query (Bangla RAG)<br/>
          GET /api/v1/viva/start<br/>
          GET /api/v1/notices/list
        </code>
      </div>
    </div>
  );
};

export default ArchitectureView;
