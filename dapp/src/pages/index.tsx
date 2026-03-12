import { useState, useEffect, useRef } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  useAccount,
  useWriteContract,
  useReadContract,
  useWaitForTransactionReceipt,
  usePublicClient,
} from "wagmi";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../constants/contract";
import { parseEther, formatEther } from "viem";
import Head from "next/head";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldCheck, 
  UserX, 
  Scale, 
  ArrowDown, 
  PlusCircle, 
  Briefcase, 
  AlertCircle, 
  History,
  LayoutDashboard,
  CheckCircle2,
  XCircle,
  Gavel
} from "lucide-react";

// --- 状态与样式映射 ---
const STATUS_MAP = ["进行中", "已结算", "退款申请中", "仲裁中", "已关闭"];
const STATUS_STYLES = [
  "bg-blue-500/10 text-blue-400 border-blue-500/30",
  "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  "bg-amber-500/10 text-amber-400 border-amber-500/30",
  "bg-purple-500/10 text-purple-400 border-purple-500/30",
  "bg-slate-600/10 text-slate-400 border-slate-600/30",
];

// --- 倒计时组件 ---
function CountdownTimer({ deadline, onEnd }: { deadline: bigint; onEnd: () => void }) {
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    const timer = setInterval(() => {
      const now = BigInt(Math.floor(Date.now() / 1000));
      const diff = deadline - now;
      if (diff <= 0n) {
        setTimeLeft("已到期");
        onEnd();
        clearInterval(timer);
      } else {
        const d = diff / 86400n;
        const h = (diff % 86400n) / 3600n;
        const m = (diff % 3600n) / 60n;
        const s = diff % 60n;
        setTimeLeft(`${d}天 ${h}时 ${m}分 ${s}秒`);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [deadline, onEnd]);
  return <span className={timeLeft === "已到期" ? "text-rose-500 animate-pulse" : "text-cyan-400 font-mono font-bold"}>{timeLeft}</span>;
}

// --- 存证记录子组件 ---
function EvidenceItem({ ev }: { ev: any }) {
  return (
    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="bg-white/5 border border-white/10 p-4 rounded-xl mb-3 backdrop-blur-sm hover:bg-white/10 transition-all">
      <div className="text-slate-500 text-[10px] mb-2 font-mono flex items-center gap-2 tracking-widest uppercase">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]"></span>
        {new Date(Number(ev[2]) * 1000).toLocaleString()}
      </div>
      <div className="text-slate-200 text-sm leading-relaxed">
        {ev[1].startsWith("http") ? <img src={ev[1]} alt="Evidence" className="max-w-full rounded-lg mt-2 border border-white/10" /> : ev[1]}
      </div>
    </motion.div>
  );
}

// --- 项目卡片子组件 ---
function ProjectCard({ projectId, viewType }: { projectId: number; viewType: string }) {
  const { address } = useAccount();
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [evidences, setEvidences] = useState<any[]>([]);
  const publicClient = usePublicClient();

  const { data: project, refetch: refetchProject } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: "projects",
    args: [BigInt(projectId)],
  });

  const { data: evidenceCount, refetch: refetchEvidencesCount } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: "getEvidenceCount",
    args: [BigInt(projectId)],
  });

  const { data: contractOwner } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: "owner",
  });

  const { writeContract, data: hash, isPending: isWalletPending } = useWriteContract();
  const { isLoading: isTxConfirming, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isTxSuccess) {
      refetchProject();
      refetchEvidencesCount();
      setInputText("");
    }
  }, [isTxSuccess, refetchProject, refetchEvidencesCount]);

  useEffect(() => {
    async function fetchEvidences() {
      if (!evidenceCount || !publicClient || !isDetailOpen) return;
      const count = Number(evidenceCount);
      const list = [];
      for (let i = 0; i < count; i++) {
        const data = await publicClient.readContract({
          address: CONTRACT_ADDRESS as `0x${string}`,
          abi: CONTRACT_ABI,
          functionName: "getEvidence",
          args: [BigInt(projectId), BigInt(i)],
        });
        list.push(data);
      }
      setEvidences(list);
    }
    fetchEvidences();
  }, [isDetailOpen, evidenceCount, projectId, publicClient, isTxSuccess]);

  if (!project || (project as any)[0] === "0x0000000000000000000000000000000000000000") return null;

  const [client, contractor, totalBudget, title, requirements, deadline, status] = project as any;
  const userAddr = address?.toLowerCase();
  const clientAddr = client.toLowerCase();
  const contractorAddr = contractor.toLowerCase();
  const isOwner = userAddr === (contractOwner as string)?.toLowerCase();

  if (viewType === "我发布的项目" && clientAddr !== userAddr) return null;
  if (viewType === "我接收的项目" && contractorAddr !== userAddr) return null;
  if (viewType === "退款/申诉" && status !== 2 && status !== 3) return null;
  if (viewType === "管理员仲裁" && status !== 2 && status !== 3) return null;

  const isExpired = BigInt(Math.floor(Date.now() / 1000)) >= deadline;
  const isPending = isWalletPending || isTxConfirming;

  return (
    <motion.div layout className={`glass-card overflow-hidden mb-6 transition-all duration-500 ${isDetailOpen ? 'ring-1 ring-blue-500/50 shadow-2xl shadow-blue-500/10' : ''}`}>
      <div className="p-6 cursor-pointer" onClick={() => setIsDetailOpen(!isDetailOpen)}>
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-xl font-bold text-white flex items-center gap-2">
            <Briefcase className={`${isPending ? 'animate-pulse text-blue-500' : 'text-blue-400'}`} size={20} /> 
            {title || "未命名协议"}
          </h4>
          <div className="flex items-center gap-3">
            {isPending && <span className="text-[10px] text-blue-400 font-bold animate-pulse">链上同步中...</span>}
            <span className={`px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-widest ${STATUS_STYLES[status]}`}>
              {STATUS_MAP[status]}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-black/20 p-3 rounded-xl border border-white/5">
            <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">托管金额</p>
            <p className="text-blue-400 font-bold">{formatEther(totalBudget)} DOT</p>
          </div>
          <div className="bg-black/20 p-3 rounded-xl border border-white/5">
            <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">时效状态</p>
            <div className="text-slate-200 text-sm">
              {status === 0 ? <CountdownTimer deadline={deadline} onEnd={refetchProject} /> : "协议已阶段性锁定"}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isDetailOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-6 pb-6 border-t border-white/5">
            <div className="pt-6 space-y-6">
              <div className="bg-blue-500/5 border border-blue-500/10 p-4 rounded-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                <p className="text-xs font-bold text-blue-400 mb-2 uppercase tracking-widest">📋 需求定义</p>
                <p className="text-slate-300 text-sm leading-relaxed">{requirements}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><LayoutDashboard size={12}/> 甲方存证流</p>
                  {evidences.filter(e => e[0].toLowerCase() === clientAddr).map((ev, i) => <EvidenceItem key={i} ev={ev} />)}
                </div>
                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><LayoutDashboard size={12}/> 乙方存证流</p>
                  {evidences.filter(e => e[0].toLowerCase() === contractorAddr).map((ev, i) => <EvidenceItem key={i} ev={ev} />)}
                </div>
              </div>

              <div className="flex gap-2">
                <input 
                  placeholder="输入存证或申诉详情..." 
                  className="form-input flex-1 disabled:opacity-50" 
                  value={inputText} 
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={isPending}
                />
                <motion.button 
                  whileHover={{ scale: 1.05 }} 
                  whileTap={{ scale: 0.95 }}
                  onClick={() => writeContract({ address: CONTRACT_ADDRESS as `0x${string}`, abi: CONTRACT_ABI, functionName: "addEvidence", args: [BigInt(projectId), inputText] })} 
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 disabled:opacity-50"
                  disabled={isPending || !inputText}
                >
                  上链
                </motion.button>
              </div>

              <div className="flex flex-wrap justify-end gap-3 pt-4 border-t border-white/5">
                
                {/* 1. 进行中 (0) */}
                {status === 0 && (
                  <>
                    {isExpired && (
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => writeContract({ address: CONTRACT_ADDRESS as `0x${string}`, abi: CONTRACT_ABI, functionName: "triggerAutoPay", args: [BigInt(projectId)] })} className="btn-emerald">⏰ 到期结算</motion.button>
                    )}
                    {userAddr === clientAddr && (
                      <>
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => writeContract({ address: CONTRACT_ADDRESS as `0x${string}`, abi: CONTRACT_ABI, functionName: "requestRefund", args: [BigInt(projectId)] })} className="btn-rose flex items-center gap-2"><XCircle size={14}/> 申请退款</motion.button>
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => writeContract({ address: CONTRACT_ADDRESS as `0x${string}`, abi: CONTRACT_ABI, functionName: "releaseFunds", args: [BigInt(projectId)] })} className="btn-primary flex items-center gap-2"><CheckCircle2 size={14}/> 验收结款</motion.button>
                      </>
                    )}
                  </>
                )}

                {/* 2. 乙方控制 - 核心修复：申诉后不可退款 */}
                {userAddr === contractorAddr && (status === 2 || status === 3) && (
                  <div className="flex gap-3 bg-amber-500/5 p-3 rounded-2xl border border-amber-500/10">
                    <span className="text-xs font-bold text-amber-500 self-center px-2">乙方响应:</span>
                    {status === 2 ? (
                      <>
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => writeContract({ address: CONTRACT_ADDRESS as `0x${string}`, abi: CONTRACT_ABI, functionName: "acceptRefund", args: [BigInt(projectId)] })} className="btn-emerald">同意退款</motion.button>
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => writeContract({ address: CONTRACT_ADDRESS as `0x${string}`, abi: CONTRACT_ABI, functionName: "disputeRefund", args: [BigInt(projectId)] })} className="btn-rose">拒绝并申诉</motion.button>
                      </>
                    ) : (
                      <span className="text-xs text-rose-400 italic px-2 flex items-center gap-2"><AlertCircle size={12}/> 已进入申诉仲裁，等待处理</span>
                    )}
                  </div>
                )}

                {/* 3. 管理员仲裁 - 修复点击不响应 */}
                {isOwner && (status === 2 || status === 3) && (
                  <div className="flex gap-3 bg-purple-500/5 p-3 rounded-2xl border border-purple-500/10 shadow-[0_0_15px_rgba(168,85,247,0.1)]">
                    <span className="text-xs font-bold text-purple-400 self-center px-2 flex items-center gap-1"><Gavel size={14}/> 仲裁介入:</span>
                    <motion.button 
                      whileHover={{ scale: 1.05 }} 
                      whileTap={{ scale: 0.95 }} 
                      onClick={() => writeContract({ address: CONTRACT_ADDRESS as `0x${string}`, abi: CONTRACT_ABI, functionName: "arbitrate", args: [BigInt(projectId), true] })} 
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all shadow-md"
                    >
                      判给甲方
                    </motion.button>
                    <motion.button 
                      whileHover={{ scale: 1.05 }} 
                      whileTap={{ scale: 0.95 }} 
                      onClick={() => writeContract({ address: CONTRACT_ADDRESS as `0x${string}`, abi: CONTRACT_ABI, functionName: "arbitrate", args: [BigInt(projectId), false] })} 
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-md"
                    >
                      判给乙方
                    </motion.button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// --- 英雄区卡片组件 ---
const HeroFeature = ({ icon: Icon, title, desc, delay }: any) => (
  <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay }} className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 transition-all group">
    <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-blue-500/10"><Icon size={24} /></div>
    <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
    <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
  </motion.div>
);

// --- 主页面 ---
export default function Home() {
  const { address } = useAccount();
  const [activeTab, setActiveTab] = useState("首页");
  const [form, setForm] = useState({ title: "", contractor: "", amount: "", reqs: "", d: "0", h: "0", m: "0", s: "0" });

  const { writeContract, data: createHash } = useWriteContract();
  const { isLoading: isCreateConfirming, isSuccess: isCreateSuccess } = useWaitForTransactionReceipt({ hash: createHash });

  // 核心修复：添加轮询机制 refetchInterval
  const { data: nextProjectId, refetch: refetchProjectCount } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: "nextProjectId",
    query: {
      refetchInterval: 5000, // 每5秒自动同步一次，确保乙方能看到新工程
    }
  });

  useEffect(() => {
    if (isCreateSuccess) {
      setForm({ title: "", contractor: "", amount: "", reqs: "", d: "0", h: "0", m: "0", s: "0" });
      refetchProjectCount();
    }
  }, [isCreateSuccess, refetchProjectCount]);

  const TABS = ["首页", "工程发布", "我发布的项目", "我接收的项目", "退款/申诉", "管理员仲裁"];

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setActiveTab(id);
  };

  const handleCreate = () => {
    const duration = BigInt(form.d) * 86400n + BigInt(form.h) * 3600n + BigInt(form.m) * 60n + BigInt(form.s);
    writeContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: CONTRACT_ABI,
      functionName: "createProject",
      args: [form.contractor as `0x${string}`, form.title, form.reqs, duration],
      value: parseEther(form.amount || "0"),
    });
  };

  return (
    <div className="h-screen bg-[#020617] text-slate-200 overflow-hidden relative selection:bg-blue-500/30 font-sans">
      <Head><title>PayCheck-Guard | Web3 劳务托管协议</title></Head>

      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-indigo-600/10 blur-[140px] rounded-full animate-pulse delay-700" />
      </div>

      <nav className="fixed top-0 w-full z-50 bg-[#020617]/40 backdrop-blur-xl border-b border-white/5 px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => scrollTo("首页")}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:rotate-12 transition-transform">
            <ShieldCheck className="text-white" size={24} />
          </div>
          <h2 className="text-xl font-black tracking-tighter text-white">PayCheck-Guard</h2>
        </div>

        <div className="hidden lg:flex gap-1">
          {TABS.map((t) => (
            <button key={t} onClick={() => scrollTo(t)} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${activeTab === t ? 'bg-white/10 text-white shadow-inner' : 'text-slate-500 hover:text-slate-300'}`}>
              {t}
            </button>
          ))}
        </div>

        <ConnectButton />
      </nav>

      <main className="h-screen overflow-y-auto snap-y snap-mandatory scrollbar-hide relative z-10">
        <section id="首页" className="snap-start h-screen flex flex-col items-center justify-center px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl">
            <span className="px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-[10px] font-bold tracking-[0.3em] uppercase mb-8 inline-block">DECENTRALIZED ESCROW PROTOCOL</span>
            <h1 className="text-6xl md:text-8xl font-black mb-8 tracking-tighter leading-none text-white">让每一分辛劳 <br /><span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 filter drop-shadow-[0_0_30px_rgba(59,130,246,0.2)]">都有据可依</span></h1>
            <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-16">通过智能合约实现资金托管、链上存证与自动化防违约机制。消除信任摩擦，保障甲方资产安全，捍卫乙方劳动成果。</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
              <HeroFeature icon={UserX} title="杜绝恶意欠薪" desc="资金预存在智能合约，代码自动执行发放。" delay={0.1} />
              <HeroFeature icon={ShieldCheck} title="拒绝结算违约" desc="验收即触发转账，拒绝任何人为拖延理由。" delay={0.2} />
              <HeroFeature icon={Scale} title="打破信任高成本" desc="去中心化仲裁机制，低成本解决劳务纠纷。" delay={0.3} />
            </div>
            <motion.div animate={{ y: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 2 }} className="text-slate-600 cursor-pointer" onClick={() => scrollTo("工程发布")}><ArrowDown className="mx-auto" size={32} /></motion.div>
          </motion.div>
        </section>

        <section id="工程发布" className="snap-start h-screen flex items-center justify-center px-6">
          <div className="w-full max-w-2xl glass-card p-8 md:p-12">
            <h2 className="text-3xl font-black mb-8 flex items-center gap-3"><PlusCircle className="text-blue-500" /> 部署新工程协议</h2>
            <div className="space-y-5">
              <input placeholder="工程标题" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="form-input" />
              <textarea placeholder="描述详细需求..." value={form.reqs} onChange={e => setForm({...form, reqs: e.target.value})} className="form-input h-32 resize-none" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input placeholder="乙方钱包地址" value={form.contractor} onChange={e => setForm({...form, contractor: e.target.value})} className="form-input" />
                <input type="number" placeholder="金额 (DOT)" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="form-input" />
              </div>
              <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">履约时效设定</p>
                <div className="flex gap-4">
                  {["d", "h", "m", "s"].map(u => (
                    <div key={u} className="flex-1 bg-black/40 rounded-lg p-2 border border-white/5">
                      <input type="number" value={(form as any)[u]} onChange={e => setForm({...form, [u]: e.target.value})} className="bg-transparent w-full text-center text-white outline-none font-mono" />
                      <p className="text-[10px] text-center text-slate-600 uppercase mt-1">{u}</p>
                    </div>
                  ))}
                </div>
              </div>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleCreate} disabled={isCreateConfirming} className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 disabled:opacity-50">
                {isCreateConfirming ? "协议部署中..." : "锁定资金并部署协议"}
              </motion.button>
            </div>
          </div>
        </section>

        {TABS.slice(2).map((tab) => (
          <section id={tab} key={tab} className="snap-start h-screen pt-32 px-6 overflow-y-auto">
            <div className="max-w-4xl mx-auto pb-24">
              <h2 className="text-3xl font-black text-white mb-8">{tab}</h2>
              <div className="space-y-6">
                {nextProjectId !== undefined && Number(nextProjectId) > 0 ? (
                  Array.from({ length: Number(nextProjectId) }).map((_, i) => (
                    <ProjectCard key={`${tab}-${i}`} projectId={Number(nextProjectId) - 1 - i} viewType={tab} />
                  ))
                ) : (
                  <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10 text-slate-600">
                    <AlertCircle className="mx-auto mb-4" size={48} /><p>暂无相关协议记录</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        ))}
      </main>

      <style jsx global>{`
        .glass-card { background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(24px); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 2rem; }
        .form-input { width: 100%; background: rgba(0, 0, 0, 0.2); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 1rem; padding: 1rem; color: white; outline: none; transition: all 0.3s ease; }
        .form-input:focus { border-color: #3b82f6; box-shadow: 0 0 20px rgba(59, 130, 246, 0.1); }
        .btn-primary { @apply px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all; }
        .btn-rose { @apply px-5 py-2 bg-rose-600/20 text-rose-500 border border-rose-600/30 hover:bg-rose-600 hover:text-white rounded-xl text-xs font-bold transition-all; }
        .btn-emerald { @apply px-5 py-2 bg-emerald-600/20 text-emerald-500 border border-emerald-600/30 hover:bg-emerald-600 hover:text-white rounded-xl text-xs font-bold transition-all; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}