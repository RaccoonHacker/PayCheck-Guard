import { useState, useEffect } from "react";
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

// 状态映射与霓虹色彩体系 (Tailwind Classes)
const STATUS_MAP = ["进行中", "已结算", "退款申请中", "仲裁中", "已关闭"];
const STATUS_STYLES = [
  "bg-blue-500/20 text-blue-400 border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.3)]", // 进行中
  "bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.3)]", // 已结算
  "bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.3)]", // 退款中
  "bg-purple-500/20 text-purple-400 border-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.3)]", // 仲裁中
  "bg-slate-600/20 text-slate-400 border-slate-600/50", // 已关闭
];

// --- 倒计时组件 ---
function CountdownTimer({
  deadline,
  onEnd,
}: {
  deadline: bigint;
  onEnd: () => void;
}) {
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

  const isExpired = timeLeft === "已到期";

  return (
    <span
      className={`font-mono font-bold tracking-wider ${isExpired ? "text-rose-500 animate-pulse" : "text-cyan-400"}`}
    >
      {timeLeft}
    </span>
  );
}

// --- 子组件：存证记录 ---
function EvidenceItem({ ev }: { ev: any }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 p-3 rounded-xl mb-3 text-sm shadow-inner backdrop-blur-sm hover:border-blue-500/30 transition-colors">
      <div className="text-slate-500 text-xs mb-2 font-mono flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-blue-500/50 animate-pulse"></span>
        {new Date(Number(ev[2]) * 1000).toLocaleString()}
      </div>
      <div className="text-slate-200 break-words leading-relaxed">
        {ev[1].startsWith("http") ? (
          <img
            src={ev[1]}
            alt="Evidence"
            className="max-w-full rounded-lg mt-2 border border-slate-700"
          />
        ) : (
          ev[1]
        )}
      </div>
    </div>
  );
}

// --- 子组件：项目卡片 ---
function ProjectCard({
  projectId,
  viewType,
}: {
  projectId: number;
  viewType: string;
}) {
  const { address } = useAccount();
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [evidences, setEvidences] = useState<any[]>([]);
  const publicClient = usePublicClient();

  const { data: project, refetch } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: "projects",
    args: [BigInt(projectId)],
  });

  const { data: evidenceCount } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: "getEvidenceCount",
    args: [BigInt(projectId)],
  });

  useEffect(() => {
    async function fetchEvidences() {
      if (!evidenceCount || !publicClient) return;
      const count = Number(evidenceCount);
      const list = [];
      try {
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
      } catch (e) {
        console.error("Fetch evidence failed", e);
      }
    }
    if (isDetailOpen) fetchEvidences();
  }, [isDetailOpen, evidenceCount, projectId, publicClient]);

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess) {
      refetch();
      setInputText("");
    }
  }, [isSuccess, refetch]);

  if (
    !project ||
    (project as any)[0] === "0x0000000000000000000000000000000000000000"
  )
    return null;

  const [
    client,
    contractor,
    totalBudget,
    title,
    requirements,
    deadline,
    status,
  ] = project as any;
  const userAddr = address?.toLowerCase();
  const clientAddr = client.toLowerCase();
  const contractorAddr = contractor.toLowerCase();

  if (viewType === "我发布的项目" && clientAddr !== userAddr) return null;
  if (
    viewType === "我接收的项目" &&
    (contractorAddr !== userAddr || status === 2 || status === 3)
  )
    return null;
  if (
    viewType === "退款/申诉" &&
    (!(clientAddr === userAddr || contractorAddr === userAddr) ||
      (status !== 2 && status !== 3))
  )
    return null;
  if (viewType === "管理员仲裁" && status !== 2 && status !== 3) return null;

  const isExpired = BigInt(Math.floor(Date.now() / 1000)) >= deadline;

  return (
    <div
      onClick={() => setIsDetailOpen(!isDetailOpen)}
      className={`group relative p-6 rounded-2xl backdrop-blur-md transition-all duration-500 cursor-pointer overflow-hidden
        ${isDetailOpen ? "bg-slate-800/80 border-blue-500/50 shadow-[0_8px_30px_rgba(59,130,246,0.15)]" : "bg-slate-900/40 border-slate-700/50 hover:bg-slate-800/60 hover:border-slate-600"} 
        border`}
    >
      {/* 顶部标题与状态 */}
      <div className="flex justify-between items-start md:items-center flex-col md:flex-row gap-4">
        <h4 className="text-xl font-bold tracking-wide text-slate-100 group-hover:text-blue-400 transition-colors flex items-center gap-2">
          <span className="text-2xl">📌</span> {title || "未命名工程"}
        </h4>
        <span
          className={`px-4 py-1.5 rounded-full text-xs font-semibold border tracking-wider ${STATUS_STYLES[status]}`}
        >
          {STATUS_MAP[status]}
        </span>
      </div>

      {/* 预算与时间 */}
      <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-400 bg-slate-950/30 p-3 rounded-lg border border-slate-800/50">
        <div>
          托管资金:{" "}
          <b className="text-blue-400 text-base">
            {formatEther(totalBudget)} DOT
          </b>
        </div>
        <div className="w-[1px] bg-slate-700 hidden md:block"></div>
        <div>
          {status === 0 ? (
            <div className="flex items-center gap-2">
              ⏱️ 剩余时效:{" "}
              <CountdownTimer deadline={deadline} onEnd={refetch} />
            </div>
          ) : (
            <span className="text-slate-500 flex items-center gap-2">
              🔒 智能合约已锁定当前流程
            </span>
          )}
        </div>
      </div>

      {/* 展开详情面板 */}
      <div
        className={`grid transition-all duration-500 ease-in-out ${isDetailOpen ? "grid-rows-[1fr] opacity-100 mt-6" : "grid-rows-[0fr] opacity-0 mt-0"}`}
      >
        <div className="overflow-hidden flex flex-col gap-6">
          {/* 需求区块 */}
          <div className="bg-slate-900/80 border border-slate-700 p-5 rounded-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-400 to-purple-500"></div>
            <p className="text-slate-300 font-semibold mb-2 flex items-center gap-2">
              📋 甲方原始需求定义
            </p>
            <div className="text-slate-400 text-sm leading-relaxed whitespace-pre-wrap">
              {requirements}
            </div>
          </div>

          {/* 存证流双栏 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-slate-900/80 to-blue-950/20 border border-blue-900/30 p-4 rounded-xl">
              <p className="text-xs font-bold text-blue-400 mb-4 flex items-center gap-2 tracking-widest uppercase">
                <span className="p-1.5 rounded-md bg-blue-500/20 text-blue-400">
                  👤
                </span>{" "}
                甲方存证数据流
              </p>
              {evidences
                .filter((e) => e[0].toLowerCase() === clientAddr)
                .map((ev, i) => (
                  <EvidenceItem key={i} ev={ev} />
                ))}
            </div>
            <div className="bg-gradient-to-br from-slate-900/80 to-purple-950/20 border border-purple-900/30 p-4 rounded-xl">
              <p className="text-xs font-bold text-purple-400 mb-4 flex items-center gap-2 tracking-widest uppercase">
                <span className="p-1.5 rounded-md bg-purple-500/20 text-purple-400">
                  🛠️
                </span>{" "}
                乙方存证数据流
              </p>
              {evidences
                .filter((e) => e[0].toLowerCase() === contractorAddr)
                .map((ev, i) => (
                  <EvidenceItem key={i} ev={ev} />
                ))}
            </div>
          </div>

          {/* 存证提交 */}
          {(status === 0 || status === 2 || status === 3) && (
            <div
              className="flex flex-col sm:flex-row gap-3 mt-2"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                placeholder="提交链上工作证明、反驳理由或图片链接..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-slate-600"
              />
              <button
                onClick={() =>
                  writeContract({
                    address: CONTRACT_ADDRESS as `0x${string}`,
                    abi: CONTRACT_ABI,
                    functionName: "addEvidence",
                    args: [BigInt(projectId), inputText],
                  })
                }
                disabled={isPending || !inputText.trim()}
                className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white px-6 py-3 rounded-lg text-sm font-bold transition-colors whitespace-nowrap shadow-lg shadow-blue-500/20"
              >
                {isPending ? "链上确认中..." : "上链存证"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 智能合约操作按钮组 */}
      <div
        className="flex flex-wrap justify-end gap-3 mt-5 pt-5 border-t border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {status === 0 && isExpired && (
          <button
            onClick={() =>
              writeContract({
                address: CONTRACT_ADDRESS as `0x${string}`,
                abi: CONTRACT_ABI,
                functionName: "triggerAutoPay",
                args: [BigInt(projectId)],
              })
            }
            className="action-btn bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white border border-emerald-500/50"
          >
            ⏰ 到期自动强制结算
          </button>
        )}
        {userAddr === clientAddr && status === 0 && (
          <>
            <button
              onClick={() =>
                writeContract({
                  address: CONTRACT_ADDRESS as `0x${string}`,
                  abi: CONTRACT_ABI,
                  functionName: "requestRefund",
                  args: [BigInt(projectId)],
                })
              }
              className="action-btn bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white border border-rose-500/30"
            >
              发起退款申诉
            </button>
            <button
              onClick={() =>
                writeContract({
                  address: CONTRACT_ADDRESS as `0x${string}`,
                  abi: CONTRACT_ABI,
                  functionName: "releaseFunds",
                  args: [BigInt(projectId)],
                })
              }
              className="action-btn bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20"
            >
              ✅ 验收并释放资金
            </button>
          </>
        )}
        {userAddr === contractorAddr && status === 2 && (
          <div className="flex gap-3 items-center bg-rose-950/30 p-2 rounded-lg border border-rose-900/50">
            <span className="text-xs text-rose-400 font-bold px-2 animate-pulse">
              ⚠️ 甲方请求退款拦截
            </span>
            <button
              onClick={() =>
                writeContract({
                  address: CONTRACT_ADDRESS as `0x${string}`,
                  abi: CONTRACT_ABI,
                  functionName: "acceptRefund",
                  args: [BigInt(projectId)],
                })
              }
              className="action-btn bg-slate-700 hover:bg-slate-600 text-white"
            >
              同意退款
            </button>
            <button
              onClick={() =>
                writeContract({
                  address: CONTRACT_ADDRESS as `0x${string}`,
                  abi: CONTRACT_ABI,
                  functionName: "disputeRefund",
                  args: [BigInt(projectId)],
                })
              }
              className="action-btn bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-500/20"
            >
              拒绝并进入仲裁
            </button>
          </div>
        )}
        {viewType === "管理员仲裁" && (status === 2 || status === 3) && (
          <>
            <button
              onClick={() =>
                writeContract({
                  address: CONTRACT_ADDRESS as `0x${string}`,
                  abi: CONTRACT_ABI,
                  functionName: "arbitrate",
                  args: [BigInt(projectId), true],
                })
              }
              className="action-btn bg-rose-600 hover:bg-rose-500 text-white"
            >
              裁决: 资金退回甲方
            </button>
            <button
              onClick={() =>
                writeContract({
                  address: CONTRACT_ADDRESS as `0x${string}`,
                  abi: CONTRACT_ABI,
                  functionName: "arbitrate",
                  args: [BigInt(projectId), false],
                })
              }
              className="action-btn bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              裁决: 资金支付乙方
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// --- 主页面 ---
export default function Home() {
  const { isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState("首页");
  const [form, setForm] = useState({
    title: "",
    contractor: "",
    amount: "",
    reqs: "",
    d: "0",
    h: "0",
    m: "0",
    s: "0",
  });

  const { writeContract, data: createHash, isPending } = useWriteContract();
  const { data: nextProjectId, refetch: refetchNextId } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: "nextProjectId",
  });
  const { isSuccess: isCreateSuccess } = useWaitForTransactionReceipt({
    hash: createHash,
  });

  useEffect(() => {
    if (isCreateSuccess) {
      refetchNextId();
      setForm({
        title: "",
        contractor: "",
        amount: "",
        reqs: "",
        d: "0",
        h: "0",
        m: "0",
        s: "0",
      });
      setActiveTab("我发布的项目"); // 自动跳转以提升体验
    }
  }, [isCreateSuccess, refetchNextId]);

  const handleCreate = () => {
    const duration =
      BigInt(form.d) * 86400n +
      BigInt(form.h) * 3600n +
      BigInt(form.m) * 60n +
      BigInt(form.s);
    writeContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: CONTRACT_ABI,
      functionName: "createProject",
      args: [form.contractor as `0x${string}`, form.title, form.reqs, duration],
      value: parseEther(form.amount || "0"),
    });
  };

  const TABS = [
    "首页",
    "工程发布",
    "我发布的项目",
    "我接收的项目",
    "退款/申诉",
    "管理员仲裁",
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans selection:bg-blue-500/30 relative overflow-hidden">
      <Head>
        <title>PayCheck-Guard | Web3 劳务托管协议</title>
      </Head>

      {/* 动态科技背景元素 */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-blue-900/20 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-purple-900/20 blur-[120px]"></div>
        <div className="absolute top-[40%] left-[60%] w-[20vw] h-[20vw] rounded-full bg-cyan-900/10 blur-[80px]"></div>
      </div>

      {/* 导航栏 (Glassmorphism) */}
      <nav className="sticky top-0 z-50 bg-[#020617]/70 backdrop-blur-xl border-b border-slate-800/80 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => setActiveTab("首页")}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <span className="text-xl">🛡️</span>
          </div>
          <h2 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 tracking-tight">
            PayCheck-Guard
          </h2>
        </div>

        <div className="flex gap-1 md:gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-hide">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 relative
                ${activeTab === t ? "text-white bg-slate-800/80 shadow-inner" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"}`}
            >
              {t}
              {activeTab === t && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[2px] bg-blue-500 rounded-t-full shadow-[0_0_8px_rgba(59,130,246,0.8)]"></span>
              )}
            </button>
          ))}
        </div>
        <div className="shrink-0">
          <ConnectButton />
        </div>
      </nav>

      {/* 主体内容区 */}
      <main className="relative z-10 max-w-5xl mx-auto p-6 md:p-10 min-h-[80vh] flex flex-col mt-4">
        {/* 首页视图 */}
        {activeTab === "首页" && (
          <div className="flex-1 flex flex-col items-center justify-center text-center animate-fade-in-up mt-10">
            <div className="inline-block mb-6 px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-sm font-semibold tracking-widest backdrop-blur-sm">
              DECENTRALIZED ESCROW PROTOCOL
            </div>
            <h1 className="text-5xl md:text-7xl font-black mb-8 tracking-tighter leading-tight">
              让每一分辛劳 <br className="md:hidden" />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 filter drop-shadow-[0_0_30px_rgba(59,130,246,0.3)]">
                都有据可依
              </span>
            </h1>
            <p className="text-lg md:text-xl text-slate-400 max-w-2xl leading-relaxed mb-12">
              通过智能合约实现资金托管、链上存证与自动化防违约机制。消除信任摩擦，保障甲方资产安全，捍卫乙方劳动成果。
            </p>
            {!isConnected && (
              <div className="p-[1px] rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 hover:scale-105 transition-transform duration-300 shadow-[0_0_40px_rgba(59,130,246,0.4)]">
                <div className="bg-[#020617] rounded-xl px-2 py-2">
                  <ConnectButton />
                </div>
              </div>
            )}
          </div>
        )}

        {/* 需连接钱包的视图 */}
        {isConnected ? (
          <>
            {/* 发布工程表单 */}
            {activeTab === "工程发布" && (
              <section className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl w-full max-w-2xl mx-auto animate-fade-in-up">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/50">
                    <span className="text-blue-400 text-xl">📝</span>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-100">
                    部署新工程协议
                  </h3>
                </div>

                <div className="space-y-5">
                  <div className="group">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 group-focus-within:text-blue-400 transition-colors">
                      工程代号 / 标题
                    </label>
                    <input
                      placeholder="例如：前端官网重构"
                      value={form.title}
                      onChange={(e) =>
                        setForm({ ...form, title: e.target.value })
                      }
                      className="form-input"
                    />
                  </div>

                  <div className="group">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 group-focus-within:text-blue-400 transition-colors">
                      详细需求与验收标准
                    </label>
                    <textarea
                      placeholder="请详细描述工程要求..."
                      value={form.reqs}
                      onChange={(e) =>
                        setForm({ ...form, reqs: e.target.value })
                      }
                      className="form-input h-32 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="group">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 group-focus-within:text-purple-400 transition-colors">
                        乙方钱包地址 (0x...)
                      </label>
                      <input
                        placeholder="承接方地址"
                        value={form.contractor}
                        onChange={(e) =>
                          setForm({ ...form, contractor: e.target.value })
                        }
                        className="form-input focus:border-purple-500 focus:ring-purple-500"
                      />
                    </div>
                    <div className="group">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 group-focus-within:text-emerald-400 transition-colors">
                        托管金额 (DOT)
                      </label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={form.amount}
                        onChange={(e) =>
                          setForm({ ...form, amount: e.target.value })
                        }
                        className="form-input focus:border-emerald-500 focus:ring-emerald-500 font-mono text-lg"
                      />
                    </div>
                  </div>

                  <div className="bg-slate-950/50 p-5 rounded-xl border border-slate-800">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                      履约时效设定
                    </label>
                    <div className="flex flex-wrap gap-4 items-center">
                      {["d", "h", "m", "s"].map((unit) => (
                        <div
                          key={unit}
                          className="flex items-center gap-2 bg-slate-900 rounded-lg pr-3 border border-slate-700 focus-within:border-blue-500 transition-colors"
                        >
                          <input
                            type="number"
                            min="0"
                            value={(form as any)[unit]}
                            onChange={(e) =>
                              setForm({ ...form, [unit]: e.target.value })
                            }
                            className="bg-transparent w-16 px-3 py-2 text-center text-slate-200 outline-none font-mono"
                          />
                          <span className="text-slate-500 text-sm font-medium">
                            {unit === "d"
                              ? "天"
                              : unit === "h"
                                ? "时"
                                : unit === "m"
                                  ? "分"
                                  : "秒"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleCreate}
                    disabled={
                      isPending ||
                      !form.title ||
                      !form.contractor ||
                      !form.amount
                    }
                    className="w-full mt-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-slate-700 disabled:to-slate-800 text-white font-bold py-4 rounded-xl shadow-[0_10px_20px_rgba(59,130,246,0.2)] disabled:shadow-none transition-all duration-300 transform active:scale-[0.98]"
                  >
                    {isPending
                      ? "链上交互中 (等待签名)..."
                      : "锁定资金并部署协议"}
                  </button>
                </div>
              </section>
            )}

            {/* 列表渲染 (使用 Grid 瀑布流布局) */}
            {(activeTab.includes("项目") ||
              activeTab === "退款/申诉" ||
              activeTab === "管理员仲裁") && (
              <div className="flex flex-col gap-6 w-full animate-fade-in-up">
                {nextProjectId !== undefined && Number(nextProjectId) > 0 ? (
                  Array.from({ length: Number(nextProjectId as bigint) }).map(
                    (_, i) => {
                      const id = Number(nextProjectId as bigint) - 1 - i;
                      return (
                        <ProjectCard
                          key={`${activeTab}-${id}`}
                          projectId={id}
                          viewType={activeTab}
                        />
                      );
                    },
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                    <div className="text-6xl mb-4 opacity-50">📭</div>
                    <p className="text-lg">暂无匹配的工程协议记录</p>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          activeTab !== "首页" && (
            <div className="flex flex-col items-center justify-center py-32 text-slate-400 animate-fade-in-up">
              <span className="text-4xl mb-4">🔗</span>
              <p className="text-xl font-medium">
                请先连接 Web3 钱包以访问此模块
              </p>
            </div>
          )
        )}
      </main>

      {/* Tailwind 补充全局样式 (直接内联注入) */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .form-input {
          width: 100%;
          background-color: rgba(15, 23, 42, 0.5);
          border: 1px solid rgba(51, 65, 85, 0.8);
          border-radius: 0.75rem;
          padding: 0.75rem 1rem;
          color: #e2e8f0;
          outline: none;
          transition: all 0.3s ease;
        }
        .form-input:focus {
          border-color: #3b82f6;
          background-color: rgba(15, 23, 42, 0.8);
          box-shadow: 0 0 0 1px #3b82f6;
        }
        .form-input::placeholder { color: #475569; }
        
        .action-btn {
          padding: 0.5rem 1.25rem;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          font-weight: 600;
          transition: all 0.2s;
        }
        
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `,
        }}
      />
    </div>
  );
}
