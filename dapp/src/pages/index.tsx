import { useState, useEffect } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  useAccount,
  useWriteContract,
  useReadContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../constants/contract";
import { parseEther, formatEther } from "viem";
import Head from "next/head";

// --- 状态枚举映射 ---
const STATUS_MAP = ["待验收", "已释放", "退款申请中", "申诉仲裁中", "已关闭"];
const STATUS_COLOR = ["#ff9800", "#4caf50", "#f44336", "#9c27b0", "#607d8b"];

// --- 子组件：通用项目卡片 ---
function ProjectCard({
  projectId,
  viewType,
}: {
  projectId: number;
  viewType: string;
}) {
  const { address } = useAccount();
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const { data: project, refetch } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: "projects",
    args: [BigInt(projectId)],
  });

  // 关键改动：添加 isPending 状态
  const {
    writeContract,
    data: hash,
    isPending: isWriting,
    error: writeError,
  } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // 监控错误并在控制台打印
  useEffect(() => {
    if (writeError) {
      console.error("合约调用失败:", writeError);
      alert(
        "交易取消或失败: " + (writeError as any).shortMessage || "未知错误",
      );
    }
  }, [writeError]);

  useEffect(() => {
    if (isSuccess) {
      refetch();
      alert("操作成功！");
    }
  }, [isSuccess, refetch]);

  if (
    !project ||
    (project as any)[0] === "0x0000000000000000000000000000000000000000"
  )
    return null;
  const [client, contractor, totalBudget, metadata, proof, status] =
    project as any;

  if (viewType === "我发布的项目" && client !== address) return null;
  if (viewType === "我接收的项目" && contractor !== address) return null;
  if (viewType === "退款/申诉" && status !== 2 && status !== 3) return null;
  if (viewType === "管理员仲裁" && status !== 3) return null;

  return (
    <div
      onClick={() => setIsDetailOpen(!isDetailOpen)}
      style={{
        border: isDetailOpen ? "1px solid #0070f3" : "1px solid #eee",
        padding: "24px",
        borderRadius: "20px",
        marginBottom: "16px",
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        boxShadow: isDetailOpen
          ? "0 10px 25px rgba(0,0,0,0.1)"
          : "0 4px 6px rgba(0,0,0,0.02)",
        transition: "0.3s",
        cursor: "pointer",
      }}
    >
      {/* 顶部标题区域保持不变... */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
        }}
      >
        <h4 style={{ margin: 0, fontSize: "18px" }}>
          {metadata || "工程项目"}
        </h4>
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

      <div style={{ fontSize: "14px", color: "#666" }}>
        <span>ID: #{projectId}</span> | 托管金额:{" "}
        <b style={{ color: "#0070f3" }}>{formatEther(totalBudget)} DOT</b>
      </div>

      {isDetailOpen && (
        <div
          style={{
            marginTop: "15px",
            paddingTop: "15px",
            borderTop: "1px solid #eee",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              color: "#888",
              display: "grid",
              gap: "8px",
            }}
          >
            <p>
              <b>甲方:</b> {client}
            </p>
            <p>
              <b>乙方:</b> {contractor}
            </p>
            {proof && (
              <p>
                <b>证明:</b>{" "}
                <a
                  href={proof}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#0070f3" }}
                >
                  查看存证链接
                </a>
              </p>
            )}
          </div>
        </div>
      )}

      {/* 按钮区域：修复点击反应问题 */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "10px",
          marginTop: "15px",
        }}
      >
        {viewType === "我发布的项目" && status === 0 && (
          <>
            <button
              disabled={isWriting || isConfirming}
              onClick={() => {
                console.log("准备申请退款, ID:", projectId);
                writeContract({
                  address: CONTRACT_ADDRESS as `0x${string}`,
                  abi: CONTRACT_ABI,
                  functionName: "requestRefund",
                  args: [BigInt(projectId)],
                });
              }}
              style={btnStyle("#f44336", false)}
            >
              {isWriting ? "请在钱包确认..." : "申请退款"}
            </button>
            <button
              disabled={isWriting || isConfirming}
              onClick={() => {
                console.log("准备验收支付, ID:", projectId);
                writeContract({
                  address: CONTRACT_ADDRESS as `0x${string}`,
                  abi: CONTRACT_ABI,
                  functionName: "releaseFunds",
                  args: [BigInt(projectId)],
                });
              }}
              style={btnStyle("#4CAF50", true)}
            >
              {isWriting ? "处理中..." : "验收支付"}
            </button>
          </>
        )}

        {/* 乙方和管理员操作参考上述逻辑增加 disabled 状态 */}
        {viewType === "我接收的项目" && status === 2 && (
          <button
            disabled={isWriting || isConfirming}
            onClick={() =>
              writeContract({
                address: CONTRACT_ADDRESS as `0x${string}`,
                abi: CONTRACT_ABI,
                functionName: "disputeRefund",
                args: [BigInt(projectId)],
              })
            }
            style={btnStyle("#9c27b0", true)}
          >
            {isWriting ? "申诉中..." : "拒绝退款并申诉"}
          </button>
        )}
      </div>
    </div>
  );
}

// --- 主页面 ---
export default function Home() {
  const { isConnected, address } = useAccount();
  const [activeTab, setActiveTab] = useState("首页");
  const [contractor, setContractor] = useState("");
  const [amount, setAmount] = useState("");
  const [title, setTitle] = useState("");

  // 读取管理员地址
  const { data: owner } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: "owner",
  });
  const isOwner =
    address &&
    owner &&
    address.toLowerCase() === (owner as string).toLowerCase();

  const { writeContract, isPending, data: createHash } = useWriteContract();
  const { data: nextProjectId, refetch: refetchCount } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: "nextProjectId",
  });

  const { isSuccess: isCreateSuccess } = useWaitForTransactionReceipt({
    hash: createHash,
  });
  useEffect(() => {
    if (isCreateSuccess) refetchCount();
  }, [isCreateSuccess, refetchCount]);

  const menuItems = [
    "首页",
    "工程发布",
    "我发布的项目",
    "我接收的项目",
    "退款/申诉",
  ];
  if (isOwner) menuItems.push("管理员仲裁");

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc" }}>
      <Head>
        <title>PayCheck-Guard</title>
      </Head>

      <nav
        style={{
          display: "flex",
          alignItems: "center",
          padding: "0 40px",
          height: "70px",
          backgroundColor: "#fff",
          boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <h2 style={{ color: "#0070f3", marginRight: "40px" }}>
          🛡️ PayCheck-Guard
        </h2>
        <div style={{ display: "flex", flex: 1, gap: "10px" }}>
          {menuItems.map((item) => (
            <div
              key={item}
              onClick={() => setActiveTab(item)}
              style={{
                padding: "8px 15px",
                cursor: "pointer",
                color: activeTab === item ? "#0070f3" : "#666",
                borderBottom:
                  activeTab === item
                    ? "3px solid #0070f3"
                    : "3px solid transparent",
                fontWeight: activeTab === item ? "600" : "400",
              }}
            >
              {item}
            </div>
          ))}
        </div>
        <ConnectButton />
      </nav>

      <main style={{ padding: "40px", maxWidth: "900px", margin: "0 auto" }}>
        {activeTab === "首页" && (
          <div
            style={{
              textAlign: "center",
              padding: "100px 40px",
              background: "linear-gradient(135deg, #0070f3 0%, #00a3ff 100%)",
              borderRadius: "32px",
              color: "#fff",
            }}
          >
            <h1 style={{ fontSize: "42px", marginBottom: "10px" }}>
              让每一份辛劳都有据可依
            </h1>
            <p>基于智能合约的去中心化劳务结算与争议保护系统</p>
          </div>
        )}

        {isConnected ? (
          <>
            {activeTab === "工程发布" && (
              <section
                style={{
                  backgroundColor: "#fff",
                  padding: "30px",
                  borderRadius: "20px",
                  boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
                }}
              >
                <h3>📝 发布新工程任务</h3>
                <div
                  style={{ display: "grid", gap: "15px", marginTop: "20px" }}
                >
                  <input
                    placeholder="工程标题"
                    onChange={(e) => setTitle(e.target.value)}
                    style={inputStyle}
                  />
                  <input
                    placeholder="乙方地址 (0x...)"
                    onChange={(e) => setContractor(e.target.value)}
                    style={inputStyle}
                  />
                  <input
                    type="number"
                    placeholder="金额 (DOT)"
                    onChange={(e) => setAmount(e.target.value)}
                    style={inputStyle}
                  />
                  <button
                    disabled={isPending}
                    onClick={() =>
                      writeContract({
                        address: CONTRACT_ADDRESS as `0x${string}`,
                        abi: CONTRACT_ABI,
                        functionName: "createProject",
                        args: [
                          contractor as `0x${string}`,
                          title,
                          parseEther(amount),
                        ],
                        value: parseEther(amount),
                      })
                    }
                    style={btnStyle("#0070f3", true)}
                  >
                    {isPending ? "交易处理中..." : "存入资金并发布"}
                  </button>
                </div>
              </section>
            )}

            {(activeTab.includes("项目") ||
              activeTab === "退款/申诉" ||
              activeTab === "管理员仲裁") && (
              <div>
                <h3 style={{ marginBottom: "20px" }}>{activeTab} 列表</h3>
                {nextProjectId && Number(nextProjectId) > 0 ? (
                  Array.from({ length: Number(nextProjectId) }).map((_, i) => (
                    <ProjectCard
                      key={i}
                      projectId={Number(nextProjectId) - 1 - i}
                      viewType={activeTab}
                    />
                  ))
                ) : (
                  <p
                    style={{
                      textAlign: "center",
                      color: "#999",
                      marginTop: "50px",
                    }}
                  >
                    暂无记录
                  </p>
                )}
              </div>
            )}
          </>
        ) : (
          activeTab !== "首页" && (
            <div style={{ textAlign: "center", marginTop: "100px" }}>
              请先连接钱包
            </div>
          )
        )}
      </main>
    </div>
  );
}

// 样式定义
const btnStyle = (color: string, primary: boolean) => ({
  padding: "8px 16px",
  borderRadius: "10px",
  backgroundColor: primary ? color : "transparent",
  color: primary ? "#fff" : color,
  border: primary ? "none" : `1px solid ${color}`,
  cursor: "pointer",
  fontWeight: "bold" as const,
  fontSize: "13px",
});
const inputStyle = {
  padding: "12px",
  borderRadius: "10px",
  border: "1px solid #ddd",
  outline: "none",
};
