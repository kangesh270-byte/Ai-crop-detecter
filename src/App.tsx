import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  Upload, 
  History as HistoryIcon, 
  MessageSquare, 
  ChevronLeft, 
  ChevronRight,
  AlertTriangle, 
  CheckCircle2, 
  Leaf, 
  Volume2, 
  Download,
  Send,
  Loader2,
  Activity,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { analyzeCropImage, chatWithAssistant, generateVoiceExplanation, type AnalysisResult } from './services/geminiService';

import Dashboard from './components/Dashboard';

type View = 'home' | 'camera' | 'result' | 'history' | 'chat' | 'dashboard' | 'guide';
type Language = 'English' | 'Tamil' | 'Hindi';

const translations = {
  English: {
    title: "AI Crop Detector",
    subtitle: "Protect your crops with AI",
    upload: "Upload Image",
    camera: "Take Photo",
    history: "History",
    chat: "Ask Expert",
    dashboard: "Dashboard",
    guide: "Crop Guide",
    analyzing: "Analyzing Crop...",
    results: "Detection Results",
    crop: "Crop",
    disease: "Disease",
    confidence: "Confidence",
    severity: "Severity",
    solutions: "Solutions",
    organic: "Organic",
    chemical: "Chemical",
    prevention: "Prevention",
    askQuestion: "Ask a question about this result...",
    back: "Back",
    save: "Save Report"
  },
  Tamil: {
    title: "AI பயிர் கண்டறிதல்",
    subtitle: "AI மூலம் உங்கள் பயிர்களைப் பாதுகாக்கவும்",
    upload: "படம் பதிவேற்றவும்",
    camera: "புகைப்படம் எடுக்கவும்",
    history: "வரலாறு",
    chat: "நிபுணரிடம் கேளுங்கள்",
    guide: "பயிர் வழிகாட்டி",
    analyzing: "பயிரை ஆய்வு செய்கிறது...",
    results: "கண்டறிதல் முடிவுகள்",
    crop: "பயிர்",
    disease: "நோய்",
    confidence: "நம்பிக்கை",
    severity: "தீவிரம்",
    solutions: "தீர்வுகள்",
    organic: "இயற்கை",
    chemical: "ரசாயனம்",
    prevention: "தடுப்பு",
    askQuestion: "இந்த முடிவைப் பற்றி ஒரு கேள்வி கேளுங்கள்...",
    back: "பின்னால்",
    save: "அறிக்கையைச் சேமிக்கவும்"
  },
  Hindi: {
    title: "AI फसल डिटेक्टर",
    subtitle: "AI के साथ अपनी फसलों की रक्षा करें",
    upload: "छवि अपलोड करें",
    camera: "फोटो लें",
    history: "इतिहास",
    chat: "विशेषज्ञ से पूछें",
    guide: "फसल गाइड",
    analyzing: "फसल का विश्लेषण...",
    results: "परिणाम",
    crop: "फसल",
    disease: "रोग",
    confidence: "विश्वास",
    severity: "गंभीरता",
    solutions: "समाधान",
    organic: "जैविक",
    chemical: "रासायनिक",
    prevention: "रोकथाम",
    askQuestion: "इस परिणाम के बारे में एक प्रश्न पूछें...",
    back: "पीछे",
    save: "रिपोर्ट सहेजें"
  }
};

export default function App() {
  const [view, setView] = useState<View>('home');
  const [language, setLanguage] = useState<Language>('English');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [cropGuide, setCropGuide] = useState<any[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const t = translations[language];

  useEffect(() => {
    fetchHistory();
    fetchDashboardStats();
    fetchCropGuide();
  }, []);

  const fetchCropGuide = async () => {
    try {
      const res = await fetch('/api/crop-guide');
      const data = await res.json();
      setCropGuide(data);
    } catch (err) {
      console.error("Failed to fetch crop guide", err);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const res = await fetch('/api/dashboard-stats');
      const data = await res.json();
      setDashboardStats(data);
    } catch (err) {
      console.error("Failed to fetch dashboard stats", err);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/history');
      const data = await res.json();
      setHistory(data);
    } catch (err) {
      console.error("Failed to fetch history", err);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setImage(base64);
        analyzeImage(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    setView('camera');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      alert("Camera access denied");
      setView('home');
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const base64 = canvasRef.current.toDataURL('image/jpeg');
        setImage(base64);
        
        // Stop camera
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        
        analyzeImage(base64);
      }
    }
  };

  const analyzeImage = async (base64: string) => {
    setLoading(true);
    setView('result');
    try {
      const res = await analyzeCropImage(base64, language);
      setResult(res);
      
      // Save to history
      await fetch('/api/save-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          crop_name: res.cropName,
          disease_name: res.diseaseName,
          confidence: res.confidence,
          severity: res.severity,
          solutions: res.solutions,
          image_data: base64
        })
      });
      fetchHistory();
    } catch (err) {
      console.error(err);
      alert("Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const playVoice = async () => {
    if (!result) return;
    const text = `${result.cropName} detected with ${result.diseaseName}. Severity is ${result.severity}. ${result.explanation}`;
    const audioResponse = await generateVoiceExplanation(text);
    
    if (audioResponse) {
      const { data, mimeType } = audioResponse;
      
      // If it's raw PCM, we need to wrap it in a WAV header for HTMLAudioElement to play it
      // or use Web Audio API. A WAV header is often simpler for a quick fix.
      if (mimeType.includes('pcm') || !mimeType.includes('/')) {
        playRawPcm(data);
      } else {
        const audio = new Audio(`data:${mimeType};base64,${data}`);
        audio.play().catch(err => console.error("Audio play error:", err));
      }
    }
  };

  const playRawPcm = (base64Data: string) => {
    try {
      const binaryString = window.atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const audioBuffer = audioContext.createBuffer(1, len / 2, 24000);
      const channelData = audioBuffer.getChannelData(0);
      
      const dataView = new DataView(bytes.buffer);
      for (let i = 0; i < len / 2; i++) {
        // Assume 16-bit PCM Little Endian
        channelData[i] = dataView.getInt16(i * 2, true) / 32768;
      }
      
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start();
    } catch (err) {
      console.error("Error playing raw PCM:", err);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    const userMsg = inputMessage;
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInputMessage('');
    
    try {
      const context = result ? `Crop: ${result.cropName}, Disease: ${result.diseaseName}, Explanation: ${result.explanation}` : "General agricultural query";
      const aiResponse = await chatWithAssistant(userMsg, context, language);
      setChatMessages(prev => [...prev, { role: 'ai', text: aiResponse || "I'm sorry, I couldn't process that." }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'ai', text: "Error connecting to assistant." }]);
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col relative overflow-hidden">
      {/* Header */}
      <header className="bg-agri-green text-white p-6 rounded-b-3xl shadow-lg z-10">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Leaf className="w-8 h-8 text-agri-accent" />
            <h1 className="text-xl font-bold tracking-tight">{t.title}</h1>
          </div>
          <select 
            value={language} 
            onChange={(e) => setLanguage(e.target.value as Language)}
            className="bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-sm outline-none"
          >
            <option value="English" className="text-black">EN</option>
            <option value="Tamil" className="text-black">தமிழ்</option>
            <option value="Hindi" className="text-black">हिंदी</option>
          </select>
        </div>
        {view === 'home' && (
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-white/80 text-sm"
          >
            {t.subtitle}
          </motion.p>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 pb-24 overflow-y-auto">
        <AnimatePresence mode="wait">
          {view === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6"
            >
              {/* Hero Image */}
              <div className="relative h-48 rounded-2xl overflow-hidden shadow-md">
                <img 
                  src="https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?auto=format&fit=crop&w=800&q=80" 
                  alt="Agriculture"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                  <p className="text-white font-medium">Scan your crops to detect diseases instantly</p>
                </div>
              </div>

              {/* Dashboard Preview Card */}
              {dashboardStats && (
                <motion.div 
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setView('dashboard')}
                  className="card p-4 bg-agri-green text-white flex items-center justify-between cursor-pointer"
                >
                  <div>
                    <p className="text-xs text-white/70 uppercase font-bold">Farm Health</p>
                    <p className="text-2xl font-bold">{dashboardStats.avgHealth}%</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-white/70 uppercase font-bold">Total Scans</p>
                    <p className="text-2xl font-bold">{dashboardStats.summary.total}</p>
                  </div>
                  <ChevronRight className="w-6 h-6 text-white/50" />
                </motion.div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-1 gap-4">
                <button 
                  onClick={() => setView('guide')}
                  className="btn-secondary h-16 text-lg bg-agri-accent text-white border-none"
                >
                  <Leaf className="w-6 h-6" />
                  {t.guide}
                </button>
                <button 
                  onClick={startCamera}
                  className="btn-primary h-16 text-lg"
                >
                  <Camera className="w-6 h-6" />
                  {t.camera}
                </button>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-secondary h-16 text-lg"
                >
                  <Upload className="w-6 h-6" />
                  {t.upload}
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>

              {/* Quick Stats / History Preview */}
              <div className="card p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold flex items-center gap-2">
                    <HistoryIcon className="w-5 h-5 text-agri-green" />
                    Recent Scans
                  </h3>
                  <button onClick={() => setView('history')} className="text-agri-green text-sm font-semibold">View All</button>
                </div>
                <div className="space-y-3">
                  {history.slice(0, 3).map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 hover:bg-agri-light rounded-xl transition-colors">
                      <img src={item.image_data} className="w-12 h-12 rounded-lg object-cover" referrerPolicy="no-referrer" />
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{item.crop_name}</p>
                        <p className="text-xs text-gray-500">{item.disease_name}</p>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                        item.severity === 'High' ? 'bg-red-100 text-red-600' : 
                        item.severity === 'Medium' ? 'bg-orange-100 text-orange-600' : 
                        'bg-green-100 text-green-600'
                      }`}>
                        {item.severity}
                      </div>
                    </div>
                  ))}
                  {history.length === 0 && <p className="text-center text-gray-400 py-4 text-sm">No scans yet</p>}
                </div>
              </div>
            </motion.div>
          )}

          {view === 'dashboard' && dashboardStats && (
            <Dashboard 
              stats={dashboardStats} 
              history={history} 
              onScanNew={startCamera} 
              onViewHistory={() => setView('history')}
              onAskAI={() => setView('chat')}
            />
          )}

          {view === 'camera' && (
            <motion.div 
              key="camera"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-50 flex flex-col"
            >
              <div className="flex-1 relative">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none">
                  <div className="w-full h-full border-2 border-white/50 rounded-3xl" />
                </div>
                <button 
                  onClick={() => setView('home')}
                  className="absolute top-6 left-6 p-2 bg-white/20 backdrop-blur-md rounded-full text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="bg-black p-8 flex justify-center items-center">
                <button 
                  onClick={capturePhoto}
                  className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center"
                >
                  <div className="w-16 h-16 bg-white rounded-full active:scale-90 transition-transform" />
                </button>
              </div>
              <canvas ref={canvasRef} className="hidden" />
            </motion.div>
          )}

          {view === 'result' && (
            <motion.div 
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <button onClick={() => setView('home')} className="flex items-center gap-2 text-agri-green font-semibold">
                <ChevronLeft className="w-5 h-5" /> {t.back}
              </button>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <Loader2 className="w-12 h-12 text-agri-green animate-spin" />
                  <p className="font-bold text-agri-green animate-pulse">{t.analyzing}</p>
                </div>
              ) : result && (
                <div className="space-y-6">
                  {/* Result Header */}
                  <div className="card">
                    <img src={image!} className="w-full h-48 object-cover" referrerPolicy="no-referrer" />
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h2 className="text-2xl font-bold text-agri-green">{result.diseaseName}</h2>
                          <p className="text-gray-500 font-medium">{t.crop}: {result.cropName}</p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                          result.severity === 'High' ? 'bg-red-100 text-red-600' : 
                          result.severity === 'Medium' ? 'bg-orange-100 text-orange-600' : 
                          'bg-green-100 text-green-600'
                        }`}>
                          {result.severity} Severity
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                        <CheckCircle2 className="w-4 h-4 text-agri-accent" />
                        <span>{t.confidence}: {(result.confidence * 100).toFixed(1)}%</span>
                      </div>
                      <button onClick={playVoice} className="btn-secondary w-full py-2 text-sm">
                        <Volume2 className="w-4 h-4" /> Listen to Explanation
                      </button>
                    </div>
                  </div>

                  {/* Solutions */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-orange-500" />
                      {t.solutions}
                    </h3>
                    
                    <div className="grid grid-cols-1 gap-4">
                      <div className="card p-4 border-l-4 border-l-agri-accent">
                        <h4 className="font-bold text-agri-green mb-2">{t.organic}</h4>
                        <ul className="text-sm space-y-1 text-gray-700">
                          {result.solutions.organic.map((s, i) => <li key={i}>• {s}</li>)}
                        </ul>
                      </div>
                      <div className="card p-4 border-l-4 border-l-blue-500">
                        <h4 className="font-bold text-blue-600 mb-2">{t.chemical}</h4>
                        <ul className="text-sm space-y-1 text-gray-700">
                          {result.solutions.chemical.map((s, i) => <li key={i}>• {s}</li>)}
                        </ul>
                      </div>
                      <div className="card p-4 border-l-4 border-l-purple-500">
                        <h4 className="font-bold text-purple-600 mb-2">{t.prevention}</h4>
                        <ul className="text-sm space-y-1 text-gray-700">
                          {result.solutions.prevention.map((s, i) => <li key={i}>• {s}</li>)}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Chat Preview */}
                  <div className="card p-4 bg-agri-green text-white">
                    <h4 className="font-bold mb-2 flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" />
                      Need more help?
                    </h4>
                    <p className="text-sm text-white/80 mb-4">Ask our AI expert about this disease or treatment.</p>
                    <button onClick={() => setView('chat')} className="w-full bg-white text-agri-green py-2 rounded-xl font-bold">
                      Start Chat
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {view === 'history' && (
            <motion.div 
              key="history"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <button onClick={() => setView('home')} className="flex items-center gap-2 text-agri-green font-semibold">
                <ChevronLeft className="w-5 h-5" /> {t.back}
              </button>
              <h2 className="text-2xl font-bold">{t.history}</h2>
              <div className="space-y-4">
                {history.map((item, i) => (
                  <div key={i} className="card p-4 flex gap-4">
                    <img src={item.image_data} className="w-20 h-20 rounded-xl object-cover" referrerPolicy="no-referrer" />
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <h4 className="font-bold text-agri-green">{item.crop_name}</h4>
                        <span className="text-[10px] text-gray-400">{new Date(item.timestamp).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{item.disease_name}</p>
                      <div className="flex justify-between items-center">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          item.severity === 'High' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                        }`}>
                          {item.severity}
                        </span>
                        <button 
                          onClick={() => {
                            setImage(item.image_data);
                            setResult({
                              cropName: item.crop_name,
                              diseaseName: item.disease_name,
                              confidence: item.confidence,
                              severity: item.severity as any,
                              solutions: JSON.parse(item.solutions),
                              explanation: ""
                            });
                            setView('result');
                          }}
                          className="text-agri-green text-xs font-bold"
                        >
                          Details
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {view === 'guide' && (
            <motion.div 
              key="guide"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <button onClick={() => setView('home')} className="flex items-center gap-2 text-agri-green font-semibold">
                <ChevronLeft className="w-5 h-5" /> {t.back}
              </button>
              <h2 className="text-2xl font-bold">{t.guide}</h2>
              <div className="space-y-4">
                {cropGuide.map((crop, i) => (
                  <div key={i} className="card p-6 space-y-4">
                    <div className="flex justify-between items-start">
                      <h3 className="text-xl font-bold text-agri-green">{crop.crop_name}</h3>
                      <div className="bg-agri-light p-2 rounded-lg">
                        <Leaf className="w-5 h-5 text-agri-green" />
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">{crop.description}</p>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div className="bg-blue-50 p-3 rounded-xl">
                        <p className="font-bold text-blue-600 uppercase mb-1">Temperature</p>
                        <p>{crop.ideal_temperature}</p>
                      </div>
                      <div className="bg-cyan-50 p-3 rounded-xl">
                        <p className="font-bold text-cyan-600 uppercase mb-1">Water</p>
                        <p>{crop.water_requirement}</p>
                      </div>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-xl">
                      <p className="font-bold text-orange-600 uppercase mb-1 text-xs">Common Diseases</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {JSON.parse(crop.common_diseases).map((d: string, j: number) => (
                          <span key={j} className="bg-white px-2 py-1 rounded-md text-[10px] border border-orange-200">{d}</span>
                        ))}
                      </div>
                    </div>
                    <div className="bg-green-50 p-3 rounded-xl">
                      <p className="font-bold text-agri-green uppercase mb-1 text-xs">Fertilizer Tips</p>
                      <p className="text-xs">{crop.fertilizer_tips}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {view === 'chat' && (
            <motion.div 
              key="chat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col h-[70vh]"
            >
              <button onClick={() => setView(result ? 'result' : 'home')} className="flex items-center gap-2 text-agri-green font-semibold mb-4">
                <ChevronLeft className="w-5 h-5" /> {t.back}
              </button>
              
              <div className="flex-1 overflow-y-auto space-y-4 p-2">
                {chatMessages.length === 0 && (
                  <div className="text-center py-10 text-gray-400">
                    <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p>Ask anything about your crops!</p>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                      msg.role === 'user' ? 'bg-agri-green text-white rounded-tr-none' : 'bg-white shadow-sm border border-black/5 rounded-tl-none'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex gap-2">
                <input 
                  type="text" 
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder={t.askQuestion}
                  className="flex-1 bg-white border border-black/10 rounded-xl px-4 py-3 outline-none focus:border-agri-green transition-colors"
                />
                <button 
                  onClick={handleSendMessage}
                  className="bg-agri-green text-white p-3 rounded-xl active:scale-95 transition-transform"
                >
                  <Send className="w-6 h-6" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      {view !== 'camera' && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-black/5 p-4 flex justify-around items-center z-10 max-w-md mx-auto">
          <button onClick={() => setView('home')} className={`flex flex-col items-center gap-1 ${view === 'home' ? 'text-agri-green' : 'text-gray-400'}`}>
            <Leaf className="w-6 h-6" />
            <span className="text-[10px] font-bold">Home</span>
          </button>
          <button onClick={() => setView('dashboard')} className={`flex flex-col items-center gap-1 ${view === 'dashboard' ? 'text-agri-green' : 'text-gray-400'}`}>
            <Activity className="w-6 h-6" />
            <span className="text-[10px] font-bold">Stats</span>
          </button>
          <button onClick={startCamera} className="bg-agri-green text-white p-4 rounded-full -mt-12 shadow-lg active:scale-90 transition-transform">
            <Camera className="w-8 h-8" />
          </button>
          <button onClick={() => setView('history')} className={`flex flex-col items-center gap-1 ${view === 'history' ? 'text-agri-green' : 'text-gray-400'}`}>
            <HistoryIcon className="w-6 h-6" />
            <span className="text-[10px] font-bold">History</span>
          </button>
          <button onClick={() => setView('chat')} className={`flex flex-col items-center gap-1 ${view === 'chat' ? 'text-agri-green' : 'text-gray-400'}`}>
            <MessageSquare className="w-6 h-6" />
            <span className="text-[10px] font-bold">Chat</span>
          </button>
        </nav>
      )}
    </div>
  );
}
