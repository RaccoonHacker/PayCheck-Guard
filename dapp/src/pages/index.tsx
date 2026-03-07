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

const STATUS_MAP = ["进行中", "已结算", "退款申请中", "仲裁中", "已关闭"];
const STATUS_COLOR = ["#2196f3", "#4caf50", "#ff9800", "#9c27b0", "#607d8b"];

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

  return (
    <span style={{ color: "#f44336", fontWeight: "bold" }}>{timeLeft}</span>
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

  const { writeContract, data: hash } = useWriteContract();
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
  if (viewType === "我接收的项目") {
    if (contractorAddr !== userAddr) return null;
    if (status === 2 || status === 3) return null;
  }
  if (viewType === "退款/申诉") {
    const isRelated = clientAddr === userAddr || contractorAddr === userAddr;
    if (!isRelated || (status !== 2 && status !== 3)) return null;
  }
  if (viewType === "管理员仲裁" && status !== 2 && status !== 3) return null;

  const isExpired = BigInt(Math.floor(Date.now() / 1000)) >= deadline;

  return (
    <div
      onClick={() => setIsDetailOpen(!isDetailOpen)}
      style={cardStyle(isDetailOpen)}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h4 style={{ margin: 0 }}>📌 {title || "未命名工程"}</h4>
        <span
          style={{
            backgroundColor: STATUS_COLOR[status],
            color: "#fff",
            padding: "4px 12px",
            borderRadius: "20px",
            fontSize: "12px",
            fontWeight: "bold",
          }}
        >
          {STATUS_MAP[status]}
        </span>
      </div>
      <div style={{ marginTop: "12px", fontSize: "13px", color: "#666" }}>
        预算: <b style={{ color: "#0070f3" }}>{formatEther(totalBudget)} DOT</b>{" "}
        |{" "}
        {status === 0 ? (
          <>
            {" "}
            剩余计时: <CountdownTimer deadline={deadline} onEnd={refetch} />
          </>
        ) : (
          " 流程已锁定"
        )}
      </div>

      {isDetailOpen && (
        <div
          style={{
            marginTop: "15px",
            borderTop: "1px solid #eee",
            paddingTop: "15px",
          }}
        >
          <div
            style={{
              backgroundColor: "#f8fafc",
              padding: "12px",
              borderRadius: "10px",
              marginBottom: "15px",
            }}
          >
            <p
              style={{
                margin: "0 0 5px 0",
                fontWeight: "bold",
                color: "#334155",
              }}
            >
              📋 甲方原始需求：
            </p>
            <div style={{ fontSize: "14px", color: "#475569" }}>
              {requirements}
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "15px",
            }}
          >
            <div
              style={{
                background: "#f0f7ff",
                padding: "10px",
                borderRadius: "10px",
              }}
            >
              <p
                style={{
                  fontSize: "12px",
                  fontWeight: "bold",
                  color: "#0070f3",
                  marginBottom: "10px",
                }}
              >
                👤 甲方存证流
              </p>
              {evidences
                .filter((e) => e[0].toLowerCase() === clientAddr)
                .map((ev, i) => (
                  <EvidenceItem key={i} ev={ev} />
                ))}
            </div>
            <div
              style={{
                background: "#fdf2ff",
                padding: "10px",
                borderRadius: "10px",
              }}
            >
              <p
                style={{
                  fontSize: "12px",
                  fontWeight: "bold",
                  color: "#9c27b0",
                  marginBottom: "10px",
                }}
              >
                🛠️ 乙方存证流
              </p>
              {evidences
                .filter((e) => e[0].toLowerCase() === contractorAddr)
                .map((ev, i) => (
                  <EvidenceItem key={i} ev={ev} />
                ))}
            </div>
          </div>
          {(status === 0 || status === 2 || status === 3) && (
            <div
              style={{ display: "flex", gap: "10px", marginTop: "15px" }}
              onClick={(e) => e.stopPropagation()}
            >
              <input
                placeholder="提交工作证明、反驳理由或补充材料..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                style={{ ...inputStyle, flex: 1 }}
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
                style={btnStyle("#0070f3", true)}
              >
                提交存证
              </button>
            </div>
          )}
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "10px",
          marginTop: "15px",
        }}
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
            style={btnStyle("#4CAF50", true)}
          >
            ⏰ 到期自动结算
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
              style={btnStyle("#f44336", false)}
            >
              申请退款
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
              style={btnStyle("#4CAF50", true)}
            >
              验收支付
            </button>
          </>
        )}
        {userAddr === contractorAddr && status === 2 && (
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <span style={{ fontSize: "12px", color: "#ff9800" }}>
              甲方申请退款中:
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
              style={btnStyle("#4caf50", false)}
            >
              ✅ 同意退款
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
              style={btnStyle("#f44336", true)}
            >
              ❌ 拒绝并申诉
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
              style={btnStyle("#f44336", true)}
            >
              判定给甲方
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
              style={btnStyle("#4CAF50", true)}
            >
              判定给乙方
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function EvidenceItem({ ev }: { ev: any }) {
  return (
    <div
      style={{
        backgroundColor: "#fff",
        padding: "8px",
        borderRadius: "8px",
        marginBottom: "8px",
        fontSize: "12px",
        boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
      }}
    >
      <div style={{ color: "#999", fontSize: "10px" }}>
        {new Date(Number(ev[2]) * 1000).toLocaleString()}
      </div>
      <div style={{ marginTop: "4px", wordBreak: "break-all" }}>
        {ev[1].startsWith("http") ? (
          <img
            src={ev[1]}
            style={{ maxWidth: "100%", borderRadius: "4px", marginTop: "5px" }}
          />
        ) : (
          ev[1]
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

  // 1. 获取创建交易的 Hash
  const { writeContract, data: createHash, isPending } = useWriteContract();

  // 2. 获取 nextProjectId 及其刷新函数
  const { data: nextProjectId, refetch: refetchNextId } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: "nextProjectId",
  });

  // 3. 核心：监听交易确认状态
  const { isSuccess: isCreateSuccess } = useWaitForTransactionReceipt({
    hash: createHash,
  });

  // 4. 交易确认后自动刷新 ID 并重置表单
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
      value: parseEther(form.amount),
    });
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f1f5f9" }}>
      <Head>
        <title>PayCheck-Guard | 链上劳务保障</title>
      </Head>
      <nav style={navStyle}>
        <h2
          style={{
            color: "#0070f3",
            margin: 0,
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          🛡️ PayCheck-Guard
        </h2>
        <div style={{ display: "flex", gap: "10px" }}>
          {[
            "首页",
            "工程发布",
            "我发布的项目",
            "我接收的项目",
            "退款/申诉",
            "管理员仲裁",
          ].map((t) => (
            <div
              key={t}
              onClick={() => setActiveTab(t)}
              style={tabStyle(activeTab === t)}
            >
              {t}
            </div>
          ))}
        </div>
        <ConnectButton />
      </nav>

      <main style={{ padding: "30px", maxWidth: "1000px", margin: "0 auto" }}>
        {activeTab === "首页" && (
          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
              background: "white",
              borderRadius: "30px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.05)",
            }}
          >
            <h1 style={{ fontSize: "36px", color: "#1e293b" }}>
              去中心化劳务结算协议
            </h1>
            <p style={{ color: "#64748b", fontSize: "18px" }}>
              资金托管 + 存证流展示 + 自动到期支付
            </p>
          </div>
        )}

        {isConnected ? (
          <>
            {activeTab === "工程发布" && (
              <section style={formCardStyle}>
                <h3 style={{ marginTop: 0 }}>📝 发布新工程任务</h3>
                <input
                  placeholder="工程标题"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  style={inputStyle}
                />
                <textarea
                  placeholder="详细工程要求"
                  value={form.reqs}
                  onChange={(e) => setForm({ ...form, reqs: e.target.value })}
                  style={{ ...inputStyle, height: "100px", resize: "none" }}
                />
                <input
                  placeholder="乙方钱包地址"
                  value={form.contractor}
                  onChange={(e) =>
                    setForm({ ...form, contractor: e.target.value })
                  }
                  style={inputStyle}
                />
                <input
                  type="number"
                  placeholder="托管金额 (DOT)"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  style={inputStyle}
                />
                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    alignItems: "center",
                    backgroundColor: "#f8fafc",
                    padding: "15px",
                    borderRadius: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ fontSize: "14px", fontWeight: "bold" }}>
                    周期:
                  </span>
                  {["d", "h", "m", "s"].map((unit) => (
                    <div
                      key={unit}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                      }}
                    >
                      <input
                        type="number"
                        value={(form as any)[unit]}
                        onChange={(e) =>
                          setForm({ ...form, [unit]: e.target.value })
                        }
                        style={{ ...inputStyle, width: "55px", padding: "8px" }}
                      />{" "}
                      {unit === "d"
                        ? "天"
                        : unit === "h"
                          ? "时"
                          : unit === "m"
                            ? "分"
                            : "秒"}
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleCreate}
                  disabled={isPending}
                  style={btnStyle("#0070f3", true)}
                >
                  {isPending ? "提交交易中..." : "存入资金并发布"}
                </button>
              </section>
            )}

            {(activeTab.includes("项目") ||
              activeTab === "退款/申诉" ||
              activeTab === "管理员仲裁") && (
              <div style={{ display: "grid", gap: "20px" }}>
                {nextProjectId !== undefined &&
                  Array.from({ length: Number(nextProjectId as bigint) }).map(
                    (_, i) => {
                      const id = Number(nextProjectId as bigint) - 1 - i;
                      // 使用 activeTab + id 作为 key，确保切换标签时列表强制刷新
                      return (
                        <ProjectCard
                          key={`${activeTab}-${id}`}
                          projectId={id}
                          viewType={activeTab}
                        />
                      );
                    },
                  )}
                {Number(nextProjectId || 0) === 0 && (
                  <div
                    style={{
                      textAlign: "center",
                      color: "#94a3b8",
                      marginTop: "40px",
                    }}
                  >
                    暂无工程记录
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          activeTab !== "首页" && (
            <div
              style={{
                textAlign: "center",
                marginTop: "60px",
                color: "#64748b",
              }}
            >
              请先连接钱包
            </div>
          )
        )}
      </main>
    </div>
  );
}

// 样式定义
const navStyle: any = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "0 40px",
  height: "80px",
  backgroundColor: "#fff",
  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
  position: "sticky",
  top: 0,
  zIndex: 100,
};
const tabStyle = (active: boolean): any => ({
  padding: "10px 16px",
  cursor: "pointer",
  color: active ? "#0070f3" : "#64748b",
  borderBottom: active ? "3px solid #0070f3" : "3px solid transparent",
  fontWeight: active ? "600" : "400",
  transition: "0.2s",
});
const cardStyle = (open: boolean): any => ({
  border: open ? "2px solid #0070f3" : "1px solid #e2e8f0",
  padding: "24px",
  borderRadius: "20px",
  backgroundColor: "#fff",
  transition: "0.3s",
  cursor: "pointer",
  boxShadow: open ? "0 10px 15px -3px rgba(0,0,0,0.1)" : "none",
});
const formCardStyle: any = {
  display: "grid",
  gap: "20px",
  backgroundColor: "#fff",
  padding: "40px",
  borderRadius: "24px",
  boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
};
const btnStyle = (color: string, primary: boolean): any => ({
  padding: "10px 20px",
  borderRadius: "10px",
  backgroundColor: primary ? color : "white",
  color: primary ? "#fff" : color,
  border: primary ? "none" : `1px solid ${color}`,
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: "14px",
});
const inputStyle: any = {
  padding: "12px",
  borderRadius: "10px",
  border: "1px solid #e2e8f0",
  outline: "none",
  fontSize: "14px",
};
