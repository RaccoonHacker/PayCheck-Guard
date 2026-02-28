import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useWriteContract } from 'wagmi';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../constants/contract';
import { parseEther } from 'viem';
import { useState } from 'react';

export default function Home() {
  const { isConnected } = useAccount();
  const { writeContract, isPending } = useWriteContract();

  // 表单状态
  const [contractor, setContractor] = useState('');
  const [amount, setAmount] = useState('');

  const handleCreate = () => {
    writeContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: CONTRACT_ABI,
      functionName: 'createProject',
      args: [
        contractor, // 乙方地址
        ['阶段一：地基工程'], // 里程碑描述
        [parseEther(amount)], // 每个里程碑的金额
        [20n] // 工资占比 20%
      ],
      value: parseEther(amount), // 托管的总金额
    });
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>PayCheck-Guard</h2>
        <ConnectButton />
      </header>

      {isConnected ? (
        <section style={{ marginTop: '40px', border: '1px solid #eee', padding: '20px', borderRadius: '10px' }}>
          <h3>发布新工程项目</h3>
          <div style={{ marginBottom: '15px' }}>
            <label>乙方地址 (Contractor):</label>
            <input 
              style={{ width: '100%', padding: '8px', marginTop: '5px' }} 
              placeholder="0x..." 
              onChange={(e) => setContractor(e.target.value)}
            />
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label>托管金额 (DOT):</label>
            <input 
              style={{ width: '100%', padding: '8px', marginTop: '5px' }} 
              type="number" 
              placeholder="1.0"
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <button 
            disabled={isPending}
            onClick={handleCreate}
            style={{ width: '100%', padding: '12px', backgroundColor: '#0070f3', color: '#white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
          >
            {isPending ? '交易确认中...' : '托管资金并发布'}
          </button>
        </section>
      ) : (
        <div style={{ textAlign: 'center', marginTop: '100px' }}>请先连接钱包以使用 PayCheck-Guard</div>
      )}
    </div>
  );
}