import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  Activity, 
  Cloud, 
  Droplets, 
  Calendar,
  ChevronRight,
  Plus
} from 'lucide-react';
import { motion } from 'motion/react';

interface DashboardProps {
  stats: any;
  history: any[];
  onScanNew: () => void;
  onViewHistory: () => void;
  onAskAI: () => void;
}

const COLORS = ['#2D5A27', '#8BC34A', '#FFC107', '#F44336'];

export default function Dashboard({ stats, history, onScanNew, onViewHistory, onAskAI }: DashboardProps) {
  const summaryCards = [
    { title: 'Total Scanned', value: stats.summary.total, icon: Activity, color: 'bg-blue-500' },
    { title: 'Healthy', value: stats.summary.healthy, icon: CheckCircle, color: 'bg-agri-green' },
    { title: 'Diseased', value: stats.summary.diseased, icon: AlertCircle, color: 'bg-orange-500' },
    { title: 'High Risk', value: stats.summary.highRisk, icon: TrendingUp, color: 'bg-red-500' },
  ];

  const healthColor = stats.avgHealth > 80 ? 'text-agri-green' : stats.avgHealth > 50 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="space-y-6 pb-20">
      {/* Quick Summary */}
      <div className="grid grid-cols-2 gap-4">
        {summaryCards.map((card, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="card p-4 flex flex-col items-center text-center"
          >
            <div className={`${card.color} p-2 rounded-lg mb-2 text-white`}>
              <card.icon className="w-5 h-5" />
            </div>
            <span className="text-2xl font-bold">{card.value}</span>
            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">{card.title}</span>
          </motion.div>
        ))}
      </div>

      {/* Health Overview */}
      <div className="card p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg">Crop Health Overview</h3>
          <Activity className="w-5 h-5 text-agri-green" />
        </div>
        <div className="flex items-center gap-6">
          <div className="relative w-24 h-24">
            <svg className="w-full h-full" viewBox="0 0 36 36">
              <path
                className="text-gray-100 stroke-current"
                strokeWidth="3"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={`${healthColor} stroke-current`}
                strokeWidth="3"
                strokeDasharray={`${stats.avgHealth}, 100`}
                strokeLinecap="round"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-xl font-bold ${healthColor}`}>{stats.avgHealth}%</span>
            </div>
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-600 mb-2">Average health of your farm is <span className="font-bold">{stats.avgHealth > 70 ? 'Good' : 'Needs Attention'}</span>.</p>
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-agri-green" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-red-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Weather Widget */}
      <div className="card p-4 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Cloud className="w-5 h-5" />
              <span className="text-lg font-bold">28°C</span>
            </div>
            <p className="text-xs text-blue-100">Partly Cloudy • Humidity 65%</p>
          </div>
          <div className="bg-white/20 p-2 rounded-lg backdrop-blur-md">
            <Droplets className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-white/20">
          <p className="text-[10px] font-bold uppercase tracking-wider text-blue-100 mb-1">Disease Risk Alert</p>
          <p className="text-sm font-medium">High humidity detected. Risk of Fungal infection in Tomato crops is Medium.</p>
        </div>
      </div>

      {/* Analytics Charts */}
      <div className="space-y-4">
        <h3 className="font-bold text-lg px-2">Disease Analytics</h3>
        <div className="card p-4">
          <p className="text-xs font-bold text-gray-400 uppercase mb-4">Common Diseases</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.diseaseStats}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="disease_name" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  cursor={{ fill: '#f8f8f8' }}
                />
                <Bar dataKey="count" fill="#2D5A27" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Fertilizer Usage */}
      <div className="card p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold">Fertilizer Schedule</h3>
          <Calendar className="w-5 h-5 text-agri-green" />
        </div>
        <div className="space-y-3">
          {stats.fertilizers.length > 0 ? stats.fertilizers.map((f: any, i: number) => (
            <div key={i} className="flex items-center justify-between p-2 bg-agri-light rounded-xl">
              <div>
                <p className="text-sm font-bold">{f.name}</p>
                <p className="text-[10px] text-gray-500">Next: {new Date(f.next_application).toLocaleDateString()}</p>
              </div>
              <span className="text-xs font-bold text-agri-green">{f.quantity}</span>
            </div>
          )) : (
            <p className="text-center text-gray-400 py-4 text-sm">No fertilizer logs found</p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <button onClick={onScanNew} className="btn-primary py-4 text-sm">
          <Plus className="w-4 h-4" /> Scan New
        </button>
        <button onClick={onAskAI} className="btn-secondary py-4 text-sm">
          <Activity className="w-4 h-4" /> Ask Expert
        </button>
      </div>

      {/* Recent Scans Preview */}
      <div className="space-y-3">
        <div className="flex justify-between items-center px-2">
          <h3 className="font-bold">Recent Scans</h3>
          <button onClick={onViewHistory} className="text-agri-green text-sm font-bold flex items-center">
            See All <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        {history.slice(0, 3).map((item, i) => (
          <div key={i} className="card p-3 flex items-center gap-3">
            <img src={item.image_data} className="w-12 h-12 rounded-lg object-cover" referrerPolicy="no-referrer" />
            <div className="flex-1">
              <p className="font-bold text-sm">{item.crop_name}</p>
              <p className="text-xs text-gray-500">{item.disease_name}</p>
            </div>
            <div className={`w-2 h-2 rounded-full ${item.severity === 'High' ? 'bg-red-500' : 'bg-agri-green'}`} />
          </div>
        ))}
      </div>
    </div>
  );
}
