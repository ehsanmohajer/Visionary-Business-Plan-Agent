
import React, { useState, useEffect, useRef } from 'react';
import { 
  Moon, Sun, Globe, ChevronRight, ChevronLeft, 
  Rocket, Lightbulb, TrendingUp, DollarSign, 
  Target, AlertTriangle, FileText, Download, BarChart3,
  Loader2, CheckCircle2, User as UserIcon, ShieldCheck, 
  LogOut, CreditCard, Tag, Users, History, PieChart as PieIcon,
  Upload, Check, X, LayoutDashboard, MessageSquare, Briefcase,
  Plus, Clock, Calendar, Home, HelpCircle, Info, Star, Mail, Phone,
  Settings
} from 'lucide-react';
import { translations } from './translations';
import { Language, BusinessFormData, User, SubscriptionTier, SavedPlan, Coupon, PaymentReceipt, SubscriptionStatus, UserMessage } from './types';
import FinancialInput from './components/FinancialInput';
import BusinessCharts from './components/Charts';
import { generateBusinessPlan } from './services/gemini';
import { auth, db } from './services/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, doc, getDoc, setDoc, addDoc, updateDoc, query, where, onSnapshot, deleteDoc, getDocs } from 'firebase/firestore';
// @ts-ignore
import html2canvas from 'html2canvas';
// @ts-ignore
import { jsPDF } from 'jspdf';

const initialFormData: BusinessFormData = {
  businessType: '',
  companyName: '',
  description: '',
  uniqueness: '',
  targetAudience: '',
  competitors: '',
  competitorDifferentiator: '',
  marketTrends: '',
  revenueStreams: '',
  resources: '',
  deliveryProcess: '',
  customerReach: '',
  marketingChannels: '',
  brandImage: '',
  startupCosts: [{ id: '1', name: 'Registration', amount: 0 }],
  fixedCosts: [{ id: '1', name: 'Rent', amount: 0 }],
  variableCosts: [{ id: '1', name: 'Marketing', amount: 0 }],
  revenueGoal: 0,
  risks: '',
  mitigation: ''
};

const ADMIN_CREDENTIALS = {
  email: 'admin@sanistudio.com',
  password: 'admin'
};

const INITIAL_COUPONS: Coupon[] = [
  { id: '1', code: 'SANI10', discountPercent: 10 },
  { id: '2', code: 'PROMO20', discountPercent: 20 }
];

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>(Language.EN);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [step, setStep] = useState<number>(0);
  const [formData, setFormData] = useState<BusinessFormData>(initialFormData);
  
  const updateFormData = (field: keyof BusinessFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const [generatedPlan, setGeneratedPlan] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [showResult, setShowResult] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'plan' | 'analysis'>('plan');
  const [pdfLoading, setPdfLoading] = useState(false);
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [plans, setPlans] = useState<SavedPlan[]>([]);
  const [receipts, setReceipts] = useState<PaymentReceipt[]>([]);
  const [messages, setMessages] = useState<UserMessage[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>(INITIAL_COUPONS);
  const [totalRevenue, setTotalRevenue] = useState(0);
  
  const [view, setView] = useState<'landing' | 'auth' | 'wizard' | 'admin' | 'checkout' | 'package-detail' | 'user-dashboard' | 'pricing-select'>('landing');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [pendingTier, setPendingTier] = useState<SubscriptionTier | null>(null);
  
  // Auth fields
  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [password, setPassword] = useState('');

  // Pricing & Checkout
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<string>('');
  const [discount, setDiscount] = useState(0);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptData, setReceiptData] = useState<string | undefined>(undefined);

  // Contact fields
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');

  const planRef = useRef<HTMLDivElement>(null);
  const benefitsRef = useRef<HTMLElement>(null);
  const pricingRef = useRef<HTMLElement>(null);
  const aboutRef = useRef<HTMLElement>(null);
  const faqRef = useRef<HTMLElement>(null);
  const contactRef = useRef<HTMLElement>(null);
  const t = translations[lang];

  useEffect(() => {
    const savedDarkMode = localStorage.getItem('visionary_darkmode') === 'true';
    setDarkMode(savedDarkMode);
  }, []);

  useEffect(() => {
    localStorage.setItem('visionary_darkmode', darkMode.toString());
  }, [darkMode]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setCurrentUser(null);
        setPlans([]);
        setReceipts([]);
        setMessages([]);
        return;
      }

      const userRef = doc(db, 'users', fbUser.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        setCurrentUser(userSnap.data() as User);
      } else {
        const newUser: User = {
          id: fbUser.uid,
          name: fbUser.displayName || 'User',
          email: fbUser.email || '',
          role: 'user',
          tier: 'free',
          subscriptionStatus: 'none',
          generationsToday: 0,
          lastGenerationDate: new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString()
        };
        await setDoc(userRef, newUser);
        setCurrentUser(newUser);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const plansQuery = query(collection(db, 'plans'), where('userId', '==', currentUser.id));
    const receiptsQuery = currentUser.role === 'admin'
      ? query(collection(db, 'receipts'))
      : query(collection(db, 'receipts'), where('userId', '==', currentUser.id));
    const messagesQuery = currentUser.role === 'admin'
      ? query(collection(db, 'messages'))
      : query(collection(db, 'messages'), where('userId', '==', currentUser.id));
    const couponsQuery = query(collection(db, 'coupons'));

    const unsubPlans = onSnapshot(plansQuery, (snapshot) => {
      const data = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })) as SavedPlan[];
      const sorted = [...data].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setPlans(sorted);
    });

    const unsubReceipts = onSnapshot(receiptsQuery, (snapshot) => {
      const data = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })) as PaymentReceipt[];
      const sorted = [...data].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setReceipts(sorted);
    });

    const unsubMessages = onSnapshot(messagesQuery, (snapshot) => {
      const data = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })) as UserMessage[];
      const sorted = [...data].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setMessages(sorted);
    });

    const unsubCoupons = onSnapshot(couponsQuery, (snapshot) => {
      const data = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })) as Coupon[];
      if (data.length === 0) {
        INITIAL_COUPONS.forEach(async (c) => {
          await addDoc(collection(db, 'coupons'), c);
        });
      } else {
        setCoupons(data);
      }
    });

    return () => {
      unsubPlans();
      unsubReceipts();
      unsubMessages();
      unsubCoupons();
    };
  }, [currentUser?.id, currentUser?.role]);

  useEffect(() => {
    const revenue = receipts.filter(r => r.status === 'approved').reduce((sum, r) => sum + r.amount, 0);
    setTotalRevenue(revenue);
  }, [receipts]);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  const handleAuth = async () => {
    if (authMode === 'login') {
      try {
        const credentials = await signInWithEmailAndPassword(auth, email, password);
        const userRef = doc(db, 'users', credentials.user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const user = userSnap.data() as User;
          setCurrentUser(user);
          if (pendingTier) {
            await handleTierPostAuth(pendingTier, user);
          } else {
            setView('landing');
          }
        } else {
          alert("User profile missing. Please sign up again.");
        }
      } catch (error) {
        alert("Invalid credentials");
      }
    } else {
      if (!userName || !email || !confirmEmail || !password) return alert("Please fill all fields.");
      if (email.toLowerCase() !== confirmEmail.toLowerCase()) {
        return alert("Emails do not match");
      }

      try {
        const credentials = await createUserWithEmailAndPassword(auth, email, password);
        const newUser: User = {
          id: credentials.user.uid,
          name: userName,
          phone: userPhone,
          email: email.toLowerCase(),
          role: 'user',
          tier: 'free',
          subscriptionStatus: 'none',
          generationsToday: 0,
          lastGenerationDate: new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'users', credentials.user.uid), newUser);
        setCurrentUser(newUser);
        if (pendingTier) {
          await handleTierPostAuth(pendingTier, newUser);
        } else {
          setView('landing');
        }
      } catch (error) {
        alert("Signup failed. Please try another email.");
      }
    }
  };

  const handleAdminPrefill = () => {
    setAuthMode('login');
    setEmail(ADMIN_CREDENTIALS.email);
    setPassword(ADMIN_CREDENTIALS.password);
  };

  const handleTierPostAuth = async (tier: SubscriptionTier, user: User) => {
    if (tier === 'free') {
      const updatedUser = { ...user, tier: 'free' as SubscriptionTier, subscriptionStatus: 'active' as SubscriptionStatus };
      await updateDoc(doc(db, 'users', user.id), {
        tier: 'free',
        subscriptionStatus: 'active'
      });
      setCurrentUser(updatedUser);
      setStep(1);
      setView('wizard');
    } else {
      setSelectedTier(tier);
      setView('checkout');
    }
    setPendingTier(null);
  };

  const handleSendMessage = async () => {
    if (!currentUser) return alert("Please login to send a message.");
    if (!contactMessage || !contactSubject) return alert("Please fill all fields.");

    const newMessage: UserMessage = {
      userId: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      subject: contactSubject,
      message: contactMessage,
      createdAt: new Date().toISOString(),
      replied: false
    };

    await addDoc(collection(db, 'messages'), newMessage);
    setContactMessage('');
    setContactSubject('');
    alert("Message sent! Sani Studio will contact you via email.");
  };

  const handleLogout = async () => {
    await signOut(auth);
    setCurrentUser(null);
    setView('landing');
    setStep(0);
    setShowResult(false);
  };

  const checkLimit = () => {
    if (!currentUser) return false;
    const today = new Date().toISOString().split('T')[0];
    const limits = { free: 1, plus: 5, pro: 15 };
    
    let generationsToday = currentUser.generationsToday;
    if (currentUser.lastGenerationDate !== today) {
      generationsToday = 0;
    }

    if (currentUser.subscriptionStatus === 'pending') {
      if (generationsToday >= 1) {
        alert("Trial Limit: 1 proposal allowed while pending approval. Please wait for admin.");
        return false;
      }
      return true;
    }

    const limit = limits[currentUser.tier] || 1;
    if (generationsToday >= limit) {
      alert(t.limit_reached);
      return false;
    }
    return true;
  };

  const updateUsageAndPlans = async (newPlan: string) => {
    if (!currentUser) return;
    const today = new Date().toISOString().split('T')[0];

    const generationsToday = currentUser.lastGenerationDate === today ? currentUser.generationsToday + 1 : 1;
    const updatedUser = { ...currentUser, generationsToday, lastGenerationDate: today };
    await updateDoc(doc(db, 'users', currentUser.id), {
      generationsToday,
      lastGenerationDate: today
    });
    setCurrentUser(updatedUser);

    const tierStorageLimits = { free: 5, plus: 50, pro: Infinity };
    const limit = tierStorageLimits[currentUser.tier];
    const userPlans = plans.filter(p => p.userId === currentUser.id);

    const newSavedPlan: SavedPlan = {
      id: '',
      userId: currentUser.id,
      userEmail: currentUser.email,
      companyName: formData.companyName || "Untitled",
      planText: newPlan,
      createdAt: new Date().toISOString(),
      data: { ...formData }
    };

    if (userPlans.length >= limit) {
      const oldest = [...userPlans].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];
      if (oldest?.id) {
        await deleteDoc(doc(db, 'plans', oldest.id));
      }
    }

    await addDoc(collection(db, 'plans'), newSavedPlan);
  };

  const handleGenerate = async () => {
    if (!currentUser) {
      setAuthMode('login');
      setView('auth');
      return;
    }
    if (!checkLimit()) return;

    setIsGenerating(true);
    try {
      const plan = await generateBusinessPlan(formData, lang, currentUser.tier);
      setGeneratedPlan(plan);
      setShowResult(true);
      setActiveTab('plan');
      updateUsageAndPlans(plan);
    } catch (err) {
      alert("Error generating plan. Check API Key.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptData(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const applyCoupon = () => {
    if (!appliedCoupon) return alert("Please enter a code");
    const c = coupons.find(x => x.code.toUpperCase() === appliedCoupon.toUpperCase());
    if (c) {
      setDiscount(c.discountPercent);
      alert(`Applied ${c.discountPercent}% discount!`);
    } else {
      alert("Invalid code");
      setDiscount(0);
    }
  };

  const handleSubmitReceipt = async () => {
    if (!selectedTier || !currentUser) return;
    
    if (!receiptFile) {
      alert(t.missing_receipt_tip);
      return;
    }

    setUploadingReceipt(true);
    
    setTimeout(async () => {
      const basePrices = { free: 0, plus: 10, pro: 15 };
      const price = basePrices[selectedTier] * (1 - discount / 100);

      const newReceipt: PaymentReceipt = {
        id: '',
        userId: currentUser.id,
        email: currentUser.email,
        tier: selectedTier,
        amount: price,
        fileName: receiptFile.name,
        fileData: receiptData,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'receipts'), newReceipt);
      await updateDoc(doc(db, 'users', currentUser.id), {
        subscriptionStatus: 'pending',
        tier: selectedTier
      });

      setCurrentUser({ ...currentUser, subscriptionStatus: 'pending', tier: selectedTier });

      setUploadingReceipt(false);
      setReceiptFile(null);
      setReceiptData(undefined);
      alert("Receipt sent! Admin will review. You can create 1 trial proposal while waiting.");
      setView('user-dashboard');
    }, 1500);
  };

  const approveReceipt = async (receiptId: string) => {
    const r = receipts.find(x => x.id === receiptId);
    if (!r) return;

    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    await updateDoc(doc(db, 'receipts', receiptId), { status: 'approved' });
    await updateDoc(doc(db, 'users', r.userId), {
      tier: r.tier,
      subscriptionStatus: 'active',
      subscriptionEndDate: endDate
    });

    if (currentUser?.id === r.userId) {
      setCurrentUser({ ...currentUser, tier: r.tier, subscriptionStatus: 'active', subscriptionEndDate: endDate });
    }
    alert("Approved! User account is now Active.");
  };

  const PricingCard = ({ tier, price, features, color }: any) => {
    const isCurrentTier = currentUser?.tier === tier && currentUser?.subscriptionStatus === 'active';
    const isUpgrade = currentUser?.subscriptionStatus === 'active' && currentUser?.tier !== tier;

    return (
      <div className={`p-8 rounded-3xl border-2 transition-all hover:scale-105 bg-white dark:bg-slate-900 shadow-xl ${selectedTier === tier ? 'border-brand-500 ring-2 ring-brand-500/20' : 'border-slate-100 dark:border-slate-800'}`}>
        <div className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center text-white mb-6`}>
          {tier === 'free' ? <Rocket /> : tier === 'plus' ? <TrendingUp /> : <ShieldCheck />}
        </div>
        <h3 className="text-2xl font-bold mb-2 uppercase tracking-wide">{t[`${tier}_plan` as keyof typeof t] as string}</h3>
        <div className="flex items-baseline mb-6">
          <span className="text-4xl font-extrabold">{price}€</span>
          <span className="text-slate-500 ml-1">{t.per_month}</span>
        </div>
        <ul className="space-y-4 mb-8">
          {(features as string[]).map((f: string, i: number) => (
            <li key={i} className="flex items-center text-sm text-slate-600 dark:text-slate-400">
              <CheckCircle2 className="w-4 h-4 text-brand-500 mr-2 shrink-0" />
              {f}
            </li>
          ))}
        </ul>
        <button 
          onClick={async () => {
            if (!currentUser) { setAuthMode('signup'); setPendingTier(tier); setView('auth'); return; }
            if (tier === 'free') { 
              await handleTierPostAuth('free', currentUser);
              return; 
            }
            setSelectedTier(tier);
            setView('checkout');
          }}
          disabled={isCurrentTier}
          className={`w-full py-3 rounded-xl font-bold transition-all ${isCurrentTier ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-brand-600 dark:hover:bg-brand-500'}`}
        >
          {isCurrentTier ? "Active" : (isUpgrade ? "Upgrade" : t.choose_plan)}
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors duration-200">
      <nav className="sticky top-0 z-50 px-6 py-4 flex justify-between items-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center space-x-2 cursor-pointer" onClick={() => { setView('landing'); setStep(0); setShowResult(false); }}>
          <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-brand-500/20 tracking-tighter">V</div>
          <span className="text-2xl font-black tracking-tighter hidden sm:block">Visionary</span>
        </div>
        
        <div className="flex items-center space-x-1 sm:space-x-4">
          <button onClick={() => setView('landing')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 hover:text-brand-500 transition-colors">
            <Home className="w-5 h-5" />
          </button>
          <button onClick={() => setLang(l => l === Language.EN ? Language.FI : Language.EN)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full flex items-center space-x-1">
            <Globe className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase">{lang}</span>
          </button>
          <button onClick={() => setDarkMode(!darkMode)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          {currentUser ? (
            <div className="flex items-center space-x-1 sm:space-x-3 border-l pl-3 border-slate-200 dark:border-slate-800">
              <button onClick={() => setView('user-dashboard')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-brand-500">
                <LayoutDashboard className="w-5 h-5" />
              </button>
              {currentUser.role === 'admin' && (
                <button onClick={() => setView('admin')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-amber-500">
                  <ShieldCheck className="w-5 h-5" />
                </button>
              )}
              <button onClick={handleLogout} className="p-2 hover:bg-red-50 text-red-500 rounded-full">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button onClick={() => { setAuthMode('login'); setView('auth'); }} className="px-4 sm:px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-sm font-black">{t.login}</button>
          )}
        </div>
      </nav>

      <main className="flex-1 overflow-x-hidden">
        {view === 'landing' && !showResult && (
          <div className="space-y-32 pb-32">
            <section className="px-6 pt-24 pb-12 text-center max-w-6xl mx-auto space-y-10">
              <div className="inline-flex items-center px-5 py-2 rounded-full bg-brand-100 dark:bg-brand-950/30 text-brand-700 dark:text-brand-400 text-[10px] font-black tracking-widest uppercase animate-pulse">
                Expert Mentorship Included
              </div>
              <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter leading-[0.8] text-slate-900 dark:text-white">
                {t.hero_title}
              </h1>
              <p className="text-xl md:text-2xl text-slate-500 dark:text-slate-400 max-w-3xl mx-auto font-medium">
                {t.hero_subtitle}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
                <button onClick={() => benefitsRef.current?.scrollIntoView({ behavior: 'smooth' })} className="w-full sm:w-auto px-12 py-6 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl font-black text-2xl shadow-2xl shadow-brand-600/30 transition-all">
                  {t.get_started}
                </button>
                <button onClick={() => setView('pricing-select')} className="w-full sm:w-auto px-12 py-6 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl font-black text-2xl border-2 border-slate-100 dark:border-slate-800 hover:border-brand-500 transition-all">
                  Create Proposal
                </button>
              </div>
            </section>

            <section ref={benefitsRef} className="px-6 max-w-7xl mx-auto">
              <div className="bg-white dark:bg-slate-900 rounded-[50px] p-12 lg:p-20 border border-slate-100 dark:border-slate-800 shadow-xl">
                <div className="text-center space-y-4 mb-12">
                  <h2 className="text-5xl font-black tracking-tighter">{t.benefits_title}</h2>
                  <p className="text-xl text-slate-500">{t.benefits_desc}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-8 rounded-[32px] bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 shadow-sm">
                      <h3 className="text-2xl font-black mb-3">{t[`benefit_${i}` as keyof typeof t] as string}</h3>
                      <p className="text-slate-500">{t[`benefit_${i}_desc` as keyof typeof t] as string}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="px-6 max-w-7xl mx-auto">
               <div className="bg-slate-900 text-white rounded-[50px] p-12 lg:p-20 relative overflow-hidden">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div className="space-y-8">
                       <h2 className="text-5xl font-black tracking-tighter">{t.guidance_title}</h2>
                       <div className="space-y-8">
                          {[t.guidance_step_1, t.guidance_step_2, t.guidance_step_3].map((step, i) => (
                            <div key={i} className="flex gap-6 items-start">
                               <div className="w-10 h-10 rounded-full bg-brand-500 flex items-center justify-center font-black shrink-0">{i+1}</div>
                               <p className="text-xl opacity-80 leading-relaxed">{step}</p>
                            </div>
                          ))}
                       </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="aspect-square bg-white/5 rounded-3xl border border-white/10 p-8 flex flex-col justify-center text-center">
                          <CheckCircle2 className="w-12 h-12 text-brand-500 mx-auto mb-4" />
                          <p className="font-black text-lg">AI Accuracy</p>
                       </div>
                       <div className="aspect-square bg-white/5 rounded-3xl border border-white/10 p-8 flex flex-col justify-center text-center">
                          <Clock className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                          <p className="font-black text-lg">Fast Setup</p>
                       </div>
                    </div>
                  </div>
               </div>
            </section>

            <section ref={faqRef} className="px-6 max-w-4xl mx-auto space-y-16">
               <div className="text-center space-y-4">
                  <HelpCircle className="w-16 h-16 text-brand-500 mx-auto opacity-20" />
                  <h2 className="text-5xl font-black tracking-tighter">{t.faq_title}</h2>
               </div>
               <div className="space-y-6">
                  {[1, 2, 3].map(id => (
                    <details key={id} className="group bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm transition-all hover:shadow-md">
                       <summary className="flex items-center justify-between p-8 cursor-pointer list-none font-black text-xl">
                          {t[`faq_${id}_q` as keyof typeof t] as string}
                          <ChevronRight className="w-6 h-6 group-open:rotate-90 transition-transform" />
                       </summary>
                       <div className="px-8 pb-8 text-slate-500 leading-relaxed text-lg border-t border-slate-50 dark:border-slate-800 pt-6">
                          {t[`faq_${id}_a` as keyof typeof t] as string}
                       </div>
                    </details>
                  ))}
               </div>
            </section>

            <section className="bg-brand-50 dark:bg-brand-950/20 py-32 px-6">
               <div className="max-w-7xl mx-auto">
                  <div className="text-center mb-16"><h2 className="text-5xl font-black tracking-tighter">What Entrepreneurs Say</h2></div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                      { name: "Mikael K.", role: "SaaS Founder", text: "Visionary helped me secure a bank loan. The financial charts were exactly what they wanted to see." },
                      { name: "Anna S.", role: "Retail Owner", text: "Switching between Finnish and English was seamless. Professional results in minutes." },
                      { name: "Leo J.", role: "Consultant", text: "The FIFO logic is fair. I love the ease of creating a quick proposal for clients." }
                    ].map((item, i) => (
                      <div key={i} className="bg-white dark:bg-slate-900 p-10 rounded-[40px] shadow-xl border border-slate-100 dark:border-slate-800 space-y-6">
                        <div className="flex text-amber-500">{Array(5).fill(0).map((_,j)=><Star key={j} className="w-5 h-5 fill-current" />)}</div>
                        <p className="text-lg italic text-slate-500">"{item.text}"</p>
                        <div><p className="font-black">{item.name}</p><p className="text-sm opacity-50">{item.role}</p></div>
                      </div>
                    ))}
                  </div>
               </div>
            </section>

            <section ref={aboutRef} className="px-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
               <div className="space-y-10">
                  <div className="w-20 h-20 bg-brand-500 rounded-3xl flex items-center justify-center text-white"><Info className="w-10 h-10" /></div>
                  <h2 className="text-6xl font-black tracking-tighter leading-[0.9]">{t.about_title}</h2>
                  <p className="text-xl text-slate-500 leading-relaxed">{t.about_content}</p>
               </div>
               <div className="bg-slate-200 dark:bg-slate-800 rounded-[60px] aspect-video flex items-center justify-center overflow-hidden grayscale hover:grayscale-0 transition-all">
                  <img src="https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=800" alt="Office" className="w-full h-full object-cover opacity-50" />
               </div>
            </section>

            <section ref={contactRef} className="px-6 max-w-4xl mx-auto">
               <div className="bg-white dark:bg-slate-900 p-12 lg:p-20 rounded-[60px] shadow-2xl border border-slate-100 dark:border-slate-800 space-y-12">
                  <div className="text-center space-y-4">
                    <h2 className="text-5xl font-black tracking-tighter">{t.contact_title}</h2>
                    <p className="text-xl text-slate-500">{t.contact_subtitle}</p>
                  </div>
                  <div className="grid grid-cols-1 gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2"><label className="text-xs font-black uppercase tracking-widest opacity-40">{t.subject_label}</label><input value={contactSubject} onChange={(e)=>setContactSubject(e.target.value)} type="text" className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 focus:border-brand-500 outline-none" /></div>
                      <div className="space-y-2"><label className="text-xs font-black uppercase tracking-widest opacity-40">Direct Email</label><div className="flex items-center px-6 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 font-bold font-mono tracking-tighter"><Mail className="w-4 h-4 mr-2" /> ehsanmohajer.fi@gmail.com</div></div>
                    </div>
                    <div className="space-y-2"><label className="text-xs font-black uppercase tracking-widest opacity-40">{t.message_label}</label><textarea rows={6} value={contactMessage} onChange={(e)=>setContactMessage(e.target.value)} className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 focus:border-brand-500 outline-none" /></div>
                    <button onClick={handleSendMessage} className="w-full py-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-3xl font-black text-2xl hover:opacity-90 transition-opacity">{t.send_btn}</button>
                  </div>
               </div>
            </section>
          </div>
        )}

        {view === 'pricing-select' && (
          <section ref={pricingRef} className="px-6 max-w-7xl mx-auto py-24 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="text-center mb-20 space-y-4">
              <h2 className="text-6xl font-black tracking-tighter">{t.pricing}</h2>
              <p className="text-slate-500 text-lg">Choose your package to get started.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <PricingCard tier="free" price="0" features={t.features_free} color="bg-slate-400" />
              <PricingCard tier="plus" price="10" features={t.features_plus} color="bg-blue-600" />
              <PricingCard tier="pro" price="15" features={t.features_pro} color="bg-brand-600" />
            </div>
          </section>
        )}

        {view === 'package-detail' && selectedTier && (
          <div className="max-w-4xl mx-auto mt-20 p-12 bg-white dark:bg-slate-900 rounded-[50px] shadow-2xl border border-slate-100 dark:border-slate-800">
            <button onClick={() => setView('pricing-select')} className="flex items-center text-sm text-slate-500 mb-8 hover:text-brand-500 font-black"><ChevronLeft className="w-4 h-4 mr-1" /> Back</button>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-6">
                <h2 className="text-5xl font-black tracking-tighter uppercase">{selectedTier} {t.package_details_title}</h2>
                <div className="space-y-4">
                   {(translations[lang][`features_${selectedTier}` as keyof typeof t] as string[]).map((f: any, i: number) => (
                      <div key={i} className="flex items-start space-x-3">
                        <CheckCircle2 className="w-6 h-6 text-brand-500 shrink-0 mt-1" />
                        <span className="font-bold text-lg">{f}</span>
                      </div>
                   ))}
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-950 p-10 rounded-[40px] border border-slate-100 dark:border-slate-800 flex flex-col justify-center text-center">
                <span className="text-7xl font-black mb-2">{selectedTier === 'plus' ? 10 : 15}€</span>
                <span className="text-slate-500 uppercase text-xs font-bold tracking-widest mb-10">Monthly Billing</span>
                <button onClick={() => setView('checkout')} className="w-full py-6 bg-brand-600 hover:bg-brand-700 text-white rounded-3xl font-black text-2xl shadow-xl shadow-brand-600/30 transition-all">{t.upgrade_btn}</button>
              </div>
            </div>
          </div>
        )}

        {view === 'user-dashboard' && (
          <div className="max-w-6xl mx-auto p-6 space-y-12 pb-24 animate-in fade-in duration-500">
             <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div><h1 className="text-5xl font-black tracking-tighter">Welcome, {currentUser?.name}</h1><p className="text-slate-500 font-medium">Account: <span className="font-black text-brand-500 uppercase">{currentUser?.tier}</span></p></div>
                <div className="flex gap-2">
                   <button onClick={() => setView('pricing-select')} className="bg-brand-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-brand-600/20 hover:scale-105 transition-all flex items-center"><Plus className="w-5 h-5 mr-2" /> New Proposal</button>
                   <button onClick={() => setView('pricing-select')} className="px-6 py-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 font-black flex items-center shadow-sm uppercase text-xs tracking-widest hover:border-brand-500 transition-colors">
                     <Settings className="w-4 h-4 mr-2" /> Change Plan
                   </button>
                   <div className="px-6 py-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 font-black flex items-center shadow-sm uppercase text-xs tracking-widest text-brand-500">
                     {currentUser ? t[`${currentUser.subscriptionStatus}_status` as keyof typeof t] as string : ''}
                   </div>
                </div>
             </header>

             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                   <div className="bg-white dark:bg-slate-900 rounded-[40px] p-10 shadow-sm border border-slate-100 dark:border-slate-800 space-y-8">
                      <div className="flex items-center justify-between"><h3 className="text-2xl font-black flex items-center tracking-tighter"><PieIcon className="w-6 h-6 mr-3 text-brand-500" /> Usage Metrics</h3></div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                         <div className="space-y-4">
                            <div className="flex justify-between items-end"><span className="text-[10px] font-black uppercase tracking-widest opacity-40">{t.proposals_left}</span><span className="text-xl font-black">{Math.max(0, (currentUser?.subscriptionStatus === 'pending' ? 1 : (currentUser?.tier === 'pro' ? 15 : (currentUser?.tier === 'plus' ? 5 : 1))) - (currentUser?.generationsToday || 0))} Remaining</span></div>
                            <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                               <div className="h-full bg-emerald-500" style={{width: `${((currentUser?.generationsToday || 0) / (currentUser?.subscriptionStatus === 'pending' ? 1 : (currentUser?.tier === 'pro' ? 15 : (currentUser?.tier === 'plus' ? 5 : 1)))) * 100}%`}}></div>
                            </div>
                         </div>
                         <div className="space-y-4">
                            <div className="flex justify-between items-end"><span className="text-[10px] font-black uppercase tracking-widest opacity-40">Plan Storage</span><span className="text-xl font-black">{plans.filter(p=>p.userId===currentUser?.id).length} / {currentUser?.tier === 'free' ? 5 : (currentUser?.tier === 'plus' ? 50 : '∞')}</span></div>
                            <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                               <div className="h-full bg-blue-500" style={{width: `${(plans.filter(p=>p.userId===currentUser?.id).length / (currentUser?.tier === 'free' ? 5 : (currentUser?.tier === 'plus' ? 50 : 100))) * 100}%`}}></div>
                            </div>
                            {currentUser?.tier === 'free' && <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">{t.fifo_warning}</p>}
                         </div>
                      </div>
                   </div>

                   <div className="bg-white dark:bg-slate-900 rounded-[40px] p-10 shadow-sm border border-slate-100 dark:border-slate-800">
                      <h3 className="text-2xl font-black mb-10 flex items-center tracking-tighter"><Briefcase className="w-6 h-6 mr-3 text-brand-500" /> {t.my_proposals}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {plans.filter(p => p.userId === currentUser?.id).map(p => (
                          <div key={p.id} className="p-8 bg-slate-50 dark:bg-slate-950 rounded-[32px] border border-slate-100 dark:border-slate-800 hover:border-brand-500 transition-all cursor-pointer group" onClick={()=>{setFormData(p.data); setGeneratedPlan(p.planText); setShowResult(true);}}>
                             <div className="flex justify-between mb-4">
                                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl group-hover:bg-brand-500 group-hover:text-white transition-colors"><FileText className="w-6 h-6" /></div>
                                <ChevronRight className="w-6 h-6 opacity-20" />
                             </div>
                             <h4 className="text-xl font-black truncate">{p.companyName}</h4>
                             <p className="text-xs opacity-50 uppercase tracking-widest font-bold">{new Date(p.createdAt).toLocaleDateString()}</p>
                          </div>
                        ))}
                      </div>
                   </div>
                </div>

                <div className="space-y-8">
                   <div className="bg-slate-900 text-white rounded-[40px] p-10 relative overflow-hidden shadow-2xl">
                      <div className="absolute top-0 right-0 p-8 opacity-5"><Target className="w-40 h-40" /></div>
                      <h3 className="text-2xl font-black mb-6 tracking-tighter">Mentor Channel</h3>
                      <p className="opacity-60 text-sm leading-relaxed mb-10">{t.support_desc}</p>
                      <button onClick={()=>faqRef.current?.scrollIntoView()} className="w-full py-4 bg-brand-500 rounded-2xl font-black hover:bg-brand-600 transition-colors">How it works?</button>
                   </div>

                   <div className="bg-white dark:bg-slate-900 rounded-[40px] p-10 border border-slate-100 dark:border-slate-800 shadow-sm">
                      <h3 className="text-xl font-black mb-6 flex items-center tracking-tighter"><CreditCard className="w-5 h-5 mr-3 text-blue-500" /> Payment Log</h3>
                      <div className="space-y-4">
                        {receipts.filter(r => r.userId === currentUser?.id).map(r => (
                          <div key={r.id} className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                             <div><p className="font-black text-xs uppercase">{r.tier}</p><p className="text-[10px] opacity-50">{new Date(r.createdAt).toLocaleDateString()}</p></div>
                             <div className="text-right"><p className="font-black">{r.amount}€</p><span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${r.status==='approved'?'bg-emerald-100 text-emerald-700':'bg-amber-100 text-amber-700'}`}>{r.status}</span></div>
                          </div>
                        ))}
                      </div>
                   </div>
                </div>
             </div>
          </div>
        )}

        {view === 'admin' && (
          <div className="max-w-7xl mx-auto p-6 space-y-12 pb-32">
             <header><h1 className="text-6xl font-black tracking-tighter">Admin Control</h1></header>
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="space-y-8">
                   <div className="bg-white dark:bg-slate-900 p-10 rounded-[40px] border border-slate-100 dark:border-slate-800">
                      <h2 className="text-3xl font-black mb-8 flex items-center tracking-tighter"><CreditCard className="w-6 h-6 mr-3 text-emerald-500" /> Pending Receipts</h2>
                      <div className="space-y-6">
                        {receipts.filter(r => r.status === 'pending').map(r => (
                          <div key={r.id} className="p-8 bg-slate-50 dark:bg-slate-950 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-6">
                             <div className="flex justify-between items-start">
                                <div><p className="text-2xl font-black">{r.email}</p><p className="text-sm font-bold opacity-40 uppercase tracking-widest">{r.tier} Plan - {r.amount}€</p></div>
                                <div className="flex gap-2">
                                  <button onClick={()=>approveReceipt(r.id)} className="p-4 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-500/20"><Check className="w-6 h-6" /></button>
                                  <button onClick={async ()=>{await updateDoc(doc(db, 'receipts', r.id), { status: 'rejected' });}} className="p-4 bg-red-500 text-white rounded-2xl shadow-lg shadow-red-500/20"><X className="w-6 h-6" /></button>
                                </div>
                             </div>
                             {r.fileData && (
                               <div className="mt-4 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">Receipt Preview</p>
                                  <img src={r.fileData} alt="Receipt" className="max-h-64 rounded-xl mx-auto shadow-sm" />
                               </div>
                             )}
                          </div>
                        ))}
                      </div>
                   </div>
                </div>

                <div className="space-y-8">
                   <div className="bg-white dark:bg-slate-900 p-10 rounded-[40px] border border-slate-100 dark:border-slate-800">
                      <h2 className="text-3xl font-black mb-8 flex items-center tracking-tighter"><Mail className="w-6 h-6 mr-3 text-blue-500" /> User Messages</h2>
                      <div className="space-y-6">
                        {messages.map(m => (
                          <div key={m.id} className="p-6 bg-slate-50 dark:bg-slate-950 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
                             <div className="flex justify-between items-start">
                                <div><p className="font-black">{m.userName}</p><p className="text-[10px] opacity-40">{m.userEmail}</p></div>
                                <a href={`mailto:${m.userEmail}?subject=RE: ${m.subject}`} className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black text-[10px] uppercase tracking-widest">Reply via Email</a>
                             </div>
                             <p className="font-black text-xs uppercase opacity-60">Sub: {m.subject}</p>
                             <p className="text-sm italic opacity-80 leading-relaxed">"{m.message}"</p>
                          </div>
                        ))}
                      </div>
                   </div>
                </div>
             </div>
          </div>
        )}

        {view === 'auth' && (
          <div className="max-w-md mx-auto mt-20 p-12 bg-white dark:bg-slate-900 rounded-[50px] shadow-2xl border border-slate-100 dark:border-slate-800 space-y-10">
            <h2 className="text-5xl font-black tracking-tighter text-center">{authMode === 'login' ? t.login : t.signup}</h2>
            <div className="space-y-6">
              {authMode === 'signup' && (
                <>
                  <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-widest opacity-40">{t.name_label}</label><input value={userName} onChange={(e)=>setUserName(e.target.value)} type="text" className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 outline-none" /></div>
                  <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-widest opacity-40">{t.phone_label}</label><input value={userPhone} onChange={(e)=>setUserPhone(e.target.value)} type="tel" className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 outline-none" /></div>
                </>
              )}
              <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-widest opacity-40">{t.email_label}</label><input value={email} onChange={(e)=>setEmail(e.target.value)} type="email" className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 outline-none" /></div>
              {authMode === 'signup' && (
                <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-widest opacity-40">{t.email_confirm_label}</label><input value={confirmEmail} onChange={(e)=>setConfirmEmail(e.target.value)} type="email" className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 outline-none" /></div>
              )}
              <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-widest opacity-40">Password</label><input value={password} onChange={(e)=>setPassword(e.target.value)} type="password" className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 outline-none" /></div>
              
              <button onClick={handleAuth} className="w-full py-6 bg-brand-600 hover:bg-brand-700 text-white rounded-3xl font-black text-2xl shadow-xl transition-all mt-6">{authMode === 'login' ? t.login : t.signup}</button>
              
              <div className="relative my-10"><div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-100 dark:border-slate-800"></span></div><div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest"><span className="bg-white dark:bg-slate-900 px-4 opacity-40">Secure Access</span></div></div>

              <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm text-slate-600 dark:text-slate-300 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Admin Access</span>
                  <button onClick={handleAdminPrefill} className="text-xs font-black text-brand-600 hover:underline">Use Admin Credentials</button>
                </div>
                <div className="font-mono text-xs">
                  <div>Email: {ADMIN_CREDENTIALS.email}</div>
                  <div>Password: {ADMIN_CREDENTIALS.password}</div>
                </div>
              </div>
              
              <p className="text-center font-bold text-slate-400">
                {authMode === 'login' ? "New here?" : "Joined before?"}{' '}
                <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="text-brand-500 font-black hover:underline">{authMode === 'login' ? t.signup : t.login}</button>
              </p>
            </div>
          </div>
        )}

        {view === 'checkout' && selectedTier && (
          <div className="max-w-4xl mx-auto mt-20 p-12 bg-white dark:bg-slate-900 rounded-[50px] shadow-2xl border border-slate-100 dark:border-slate-800 space-y-12 animate-in fade-in duration-500">
             <div className="space-y-2"><h2 className="text-5xl font-black tracking-tighter">{t.checkout}</h2><p className="text-xl text-slate-500 font-bold uppercase tracking-widest">Selected Package: {selectedTier}</p></div>
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
                <div className="space-y-8">
                   <div className="bg-slate-900 text-white p-10 rounded-[40px] shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-8 opacity-5"><DollarSign className="w-40 h-40" /></div>
                      <h3 className="text-2xl font-black mb-8 flex items-center text-brand-400 tracking-tighter"><CreditCard className="w-6 h-6 mr-3" /> {t.payment_details}</h3>
                      <div className="space-y-6 text-sm font-medium">
                         <p className="opacity-60">{t.bank_name}</p>
                         <p className="opacity-60">{t.account_holder}</p>
                         <p className="text-xl font-black bg-white/10 p-6 rounded-3xl border border-white/20 select-all tracking-tighter leading-none">{t.account_number}</p>
                      </div>
                   </div>
                   <div className="bg-slate-50 dark:bg-slate-950 p-10 rounded-[40px] border-2 border-dashed border-slate-200 dark:border-slate-800 group hover:border-brand-500 transition-colors">
                      <h3 className="text-2xl font-black mb-4 flex items-center tracking-tighter"><Upload className="w-6 h-6 mr-3 text-brand-500" /> {t.upload_receipt}</h3>
                      <p className="text-sm opacity-50 mb-8 font-medium">{t.upload_hint}</p>
                      <input type="file" onChange={handleFileChange} className="w-full text-xs text-slate-500 file:mr-4 file:py-4 file:px-8 file:rounded-2xl file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-slate-900 file:text-white dark:file:bg-white dark:file:text-slate-900 file:cursor-pointer" />
                   </div>
                </div>
                <div className="space-y-12 py-10">
                   <div className="space-y-6">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center"><Tag className="mr-2 w-4 h-4" /> {t.discount_code}</label>
                        <div className="flex gap-3">
                          <input type="text" value={appliedCoupon} onChange={(e) => setAppliedCoupon(e.target.value)} className="flex-1 px-6 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 outline-none focus:border-brand-500 transition-all font-bold" placeholder="E.g. SANI10" />
                          <button onClick={applyCoupon} className="px-6 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-sm">{t.apply}</button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-2xl font-bold opacity-40"><span>Base Price</span><span>{selectedTier==='plus'?10:15}€</span></div>
                      {discount > 0 && <div className="flex justify-between items-center text-2xl font-bold text-emerald-500"><span>Discount</span><span>-{((selectedTier==='plus'?10:15)*(discount/100)).toFixed(2)}€</span></div>}
                      <div className="flex justify-between items-center text-6xl font-black pt-10 border-t border-slate-100 dark:border-slate-800"><span>Total</span><span className="text-brand-500 tracking-tighter">{((selectedTier==='plus'?10:15)*(1-discount/100)).toFixed(2)}€</span></div>
                   </div>
                   <button onClick={handleSubmitReceipt} disabled={uploadingReceipt} className="w-full py-8 bg-brand-600 hover:bg-brand-700 text-white rounded-[40px] font-black text-3xl shadow-2xl shadow-brand-600/30 transition-all flex items-center justify-center">
                      {uploadingReceipt ? <Loader2 className="w-10 h-10 animate-spin mr-4" /> : <CheckCircle2 className="w-10 h-10 mr-4" />} {t.confirm_payment}
                   </button>
                </div>
             </div>
          </div>
        )}

        {view === 'wizard' && step > 0 && !showResult && (
           <div className="max-w-3xl mx-auto w-full p-6 py-20 animate-in fade-in duration-700">
             <div className="bg-white dark:bg-slate-900 rounded-[60px] shadow-2xl p-12 lg:p-16 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-16">
                  <div className="flex items-center space-x-6">
                    <div className="w-16 h-16 bg-brand-50 dark:bg-brand-950/30 text-brand-600 dark:text-brand-400 rounded-3xl flex items-center justify-center"><Rocket className="w-8 h-8" /></div>
                    <div><h2 className="text-3xl font-black tracking-tighter">Step {step} of 7</h2><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{currentUser?.tier} Plan</p></div>
                  </div>
                  <div className="flex space-x-3">{Array.from({length: 7}).map((_, i)=>(<div key={i} className={`h-2 rounded-full transition-all duration-500 ${i+1 <= step ? 'w-12 bg-brand-500' : 'w-2 bg-slate-100 dark:bg-slate-800'}`} />))}</div>
                </div>

                <div className="min-h-[450px]">
                  {step === 1 && (
                    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="space-y-4"><label className="text-2xl font-black tracking-tighter">{t.q_biz_type}</label><input type="text" placeholder="E.g. Coffee shop, SaaS" className="w-full px-8 py-5 rounded-3xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 outline-none focus:border-brand-500 text-xl font-bold" value={formData.businessType} onChange={(e)=>updateFormData('businessType', e.target.value)} /></div>
                      <div className="space-y-4"><label className="text-2xl font-black tracking-tighter">{t.q_biz_name}</label><input type="text" placeholder="Startup Name" className="w-full px-8 py-5 rounded-3xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 outline-none focus:border-brand-500 text-xl font-bold" value={formData.companyName} onChange={(e)=>updateFormData('companyName', e.target.value)} /></div>
                    </div>
                  )}
                  {step >= 2 && step <= 7 && (
                    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                       {step === 2 && (
                         <>
                           <div className="space-y-4"><label className="text-2xl font-black tracking-tighter">{t.q_biz_desc}</label><textarea rows={5} className="w-full px-8 py-5 rounded-3xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 outline-none focus:border-brand-500 text-xl font-bold" value={formData.description} onChange={(e)=>updateFormData('description', e.target.value)} /></div>
                           <div className="space-y-4"><label className="text-2xl font-black tracking-tighter">{t.q_biz_unique}</label><textarea rows={3} className="w-full px-8 py-5 rounded-3xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 outline-none focus:border-brand-500 text-xl font-bold" value={formData.uniqueness} onChange={(e)=>updateFormData('uniqueness', e.target.value)} /></div>
                         </>
                       )}
                       {step === 3 && (
                        <div className="space-y-4"><label className="text-2xl font-black tracking-tighter">{t.q_competitors}</label><textarea rows={4} className="w-full px-8 py-5 rounded-3xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 outline-none focus:border-brand-500 text-xl font-bold" value={formData.competitors} onChange={(e)=>updateFormData('competitors', e.target.value)} /></div>
                       )}
                       {step === 4 && (
                        <div className="space-y-4"><label className="text-2xl font-black tracking-tighter">{t.q_rev_model}</label><input className="w-full px-8 py-5 rounded-3xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 outline-none focus:border-brand-500 text-xl font-bold" value={formData.revenueStreams} onChange={(e)=>updateFormData('revenueStreams', e.target.value)} /></div>
                       )}
                       {step === 5 && (
                        <div className="space-y-4"><label className="text-2xl font-black tracking-tighter">{t.q_reach}</label><input className="w-full px-8 py-5 rounded-3xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 outline-none focus:border-brand-500 text-xl font-bold" value={formData.customerReach} onChange={(e)=>updateFormData('customerReach', e.target.value)} /></div>
                       )}
                       {step === 6 && (
                        <div className="space-y-8">
                           <FinancialInput label={t.q_startup} items={formData.startupCosts} onChange={(v)=>updateFormData('startupCosts', v)} lang={lang} />
                           <FinancialInput label={t.q_fixed} items={formData.fixedCosts} onChange={(v)=>updateFormData('fixedCosts', v)} lang={lang} />
                           <div className="space-y-2"><label className="text-2xl font-black tracking-tighter">{t.q_rev_goal}</label><input type="number" className="w-full px-8 py-5 rounded-3xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 outline-none focus:border-brand-500 text-xl font-bold" value={formData.revenueGoal || ''} onChange={(e)=>updateFormData('revenueGoal', parseFloat(e.target.value)||0)} /></div>
                        </div>
                       )}
                       {step === 7 && (
                        <div className="space-y-4"><label className="text-2xl font-black tracking-tighter">{t.q_risks}</label><textarea rows={6} className="w-full px-8 py-5 rounded-3xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 outline-none focus:border-brand-500 text-xl font-bold" value={formData.risks} onChange={(e)=>updateFormData('risks', e.target.value)} /></div>
                       )}
                    </div>
                  )}
                </div>

                {currentUser?.tier === 'free' && (
                  <div className="mt-8 p-6 bg-brand-50 dark:bg-brand-950/20 rounded-[32px] border border-brand-100 dark:border-brand-800 text-center animate-in fade-in duration-500">
                    <p className="text-brand-700 dark:text-brand-400 font-bold mb-2">{t.free_nudge}</p>
                    <button onClick={() => setView('pricing-select')} className="text-xs font-black uppercase tracking-widest underline hover:text-brand-600 transition-colors">
                      {t.upgrade_btn}
                    </button>
                  </div>
                )}

                <div className="flex justify-between items-center mt-12 pt-8 border-t border-slate-50 dark:border-slate-800">
                  <button onClick={()=>setStep(step-1)} className="px-10 py-4 text-xl font-black opacity-30 hover:opacity-100 transition-opacity uppercase tracking-widest">{t.back}</button>
                  {step < 7 ? (
                    <button onClick={()=>setStep(step+1)} className="px-12 py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[32px] font-black text-2xl flex items-center shadow-2xl hover:scale-105 transition-all">{t.next} <ChevronRight className="ml-3 w-8 h-8" /></button>
                  ) : (
                    <button onClick={handleGenerate} disabled={isGenerating} className="px-12 py-5 bg-brand-600 text-white rounded-[32px] font-black text-2xl flex items-center shadow-2xl shadow-brand-600/30 hover:bg-brand-700 transition-all disabled:opacity-50">
                      {isGenerating ? <Loader2 className="w-8 h-8 mr-4 animate-spin" /> : <BarChart3 className="w-8 h-8 mr-4" />} {t.generate}
                    </button>
                  )}
                </div>
             </div>
           </div>
        )}

        {showResult && (
          <div className="max-w-6xl mx-auto p-6 py-20 space-y-12 pb-40">
            <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-slate-900 p-12 rounded-[60px] border border-slate-100 dark:border-slate-800 shadow-2xl gap-8">
               <div className="space-y-2"><h2 className="text-5xl font-black tracking-tighter leading-none">{t.plan_generated_title}</h2><p className="text-slate-500 font-black uppercase text-xs tracking-widest">{formData.companyName}</p></div>
               <div className="flex flex-col sm:flex-row items-center space-x-0 sm:space-x-3 w-full md:w-auto gap-4 sm:gap-0">
                  <div className="flex flex-col items-center">
                    <button 
                      onClick={() => currentUser?.tier !== 'free' ? console.log('Downloading...') : null}
                      disabled={currentUser?.tier === 'free'}
                      className={`w-full sm:w-auto flex items-center justify-center space-x-3 px-10 py-5 rounded-[32px] font-black text-xl shadow-xl transition-all ${currentUser?.tier==='free'?'bg-slate-100 dark:bg-slate-800 text-slate-300 cursor-not-allowed':'bg-slate-900 dark:bg-white text-white dark:text-slate-900'}`}
                    >
                       <Download className="w-6 h-6" /> <span>{t.download_pdf}</span>
                    </button>
                    {currentUser?.tier === 'free' && <p className="mt-2 text-[10px] font-black text-amber-500 uppercase tracking-widest">{t.download_pdf_locked}</p>}
                  </div>
               </div>
            </div>
            
            <div className="flex space-x-10 border-b-2 border-slate-100 dark:border-slate-800 overflow-x-auto pb-4">
               {['plan', 'analysis'].map(tab => (
                 <button key={tab} onClick={()=>setActiveTab(tab as any)} className={`whitespace-nowrap pb-4 px-2 font-black text-2xl transition-all border-b-8 ${activeTab===tab?'border-brand-500 text-brand-500':'border-transparent text-slate-300 hover:text-slate-500'}`}>{tab.toUpperCase()}</button>
               ))}
            </div>

            <div ref={planRef} className="animate-in fade-in duration-700">
               {activeTab === 'plan' ? (
                 <div className="prose prose-slate dark:prose-invert max-w-none bg-white dark:bg-slate-900 p-16 rounded-[60px] shadow-2xl border border-slate-100 dark:border-slate-800 whitespace-pre-wrap font-serif leading-[1.8] text-xl">
                   {generatedPlan}
                 </div>
               ) : (
                 <div className="space-y-12">
                   <BusinessCharts data={formData} lang={lang} />
                 </div>
               )}
            </div>
          </div>
        )}
      </main>

      <footer className="mt-auto py-24 border-t border-slate-100 dark:border-slate-800 text-center px-6 bg-white dark:bg-slate-900/30">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-16">
          <div className="flex items-center space-x-3">
             <div className="w-14 h-14 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl flex items-center justify-center font-black text-3xl">V</div>
             <span className="font-black text-3xl tracking-tighter">Visionary</span>
          </div>
          <div className="flex flex-wrap justify-center gap-12 text-sm font-black uppercase tracking-widest text-slate-400">
             <button onClick={()=>aboutRef.current?.scrollIntoView()} className="hover:text-brand-500">About</button>
             <button onClick={()=>faqRef.current?.scrollIntoView()} className="hover:text-brand-500">FAQ</button>
             <button onClick={()=>contactRef.current?.scrollIntoView()} className="hover:text-brand-500">Support</button>
             <button onClick={()=>pricingRef.current?.scrollIntoView()} className="hover:text-brand-500">Pricing</button>
          </div>
          <div className="space-y-4">
             <p className="text-slate-500 font-bold opacity-50 text-sm">{t.made_by}</p>
             <div className="flex justify-center space-x-6 opacity-30"><Mail className="w-5 h-5" /><Phone className="w-5 h-5" /></div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
