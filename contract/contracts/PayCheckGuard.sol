// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PayCheckGuard is ReentrancyGuard, Ownable {
    enum Status {
        Active, // 0: 进行中
        Paid, // 1: 已结算（乙方拿钱）
        RefundRequested, // 2: 甲方申请退款中
        Disputed, // 3: 乙方已反驳，仲裁中
        Closed // 4: 已关闭（退款给甲方）
    }

    struct Evidence {
        address submitter;
        string content;
        uint256 timestamp;
    }

    struct Project {
        address client;
        address contractor;
        uint256 totalBudget;
        string title;
        string requirements;
        uint256 deadline;
        Status status;
        Evidence[] evidenceFlow;
    }

    mapping(uint256 => Project) public projects;
    uint256 public nextProjectId;

    constructor() Ownable(msg.sender) {}

    // 1. 发布工程
    function createProject(
        address _contractor,
        string memory _title,
        string memory _requirements,
        uint256 _durationSeconds
    ) external payable {
        require(msg.value > 0, "Amount must > 0");
        require(_contractor != address(0), "Invalid contractor address");

        uint256 projectId = nextProjectId++;
        Project storage p = projects[projectId];
        p.client = msg.sender;
        p.contractor = _contractor;
        p.totalBudget = msg.value;
        p.title = _title;
        p.requirements = _requirements;
        p.deadline = block.timestamp + _durationSeconds;
        p.status = Status.Active;
    }

    // 2. 提交存证材料
    function addEvidence(uint256 _projectId, string memory _content) external {
        Project storage p = projects[_projectId];
        require(
            msg.sender == p.client || msg.sender == p.contractor,
            "No permission"
        );
        require(
            p.status != Status.Paid && p.status != Status.Closed,
            "Project already finalized"
        );

        p.evidenceFlow.push(
            Evidence({
                submitter: msg.sender,
                content: _content,
                timestamp: block.timestamp
            })
        );
    }

    // 3. 自动结算逻辑 (到期后任何人可触发)
    function triggerAutoPay(uint256 _projectId) external nonReentrant {
        Project storage p = projects[_projectId];
        require(p.status == Status.Active, "Project not in Active status");
        require(block.timestamp >= p.deadline, "Deadline not reached yet");

        uint256 amount = p.totalBudget;
        require(amount > 0, "No funds");

        p.totalBudget = 0;
        p.status = Status.Paid;

        (bool success, ) = payable(p.contractor).call{value: amount}("");
        require(success, "Transfer failed");
    }

    // 4. 甲方手动验收结算
    function releaseFunds(uint256 _projectId) external nonReentrant {
        Project storage p = projects[_projectId];
        require(msg.sender == p.client, "Only client");
        require(
            p.status == Status.Active || p.status == Status.RefundRequested,
            "Invalid status"
        );

        uint256 amount = p.totalBudget;
        require(amount > 0, "No funds");

        p.totalBudget = 0;
        p.status = Status.Paid;

        (bool success, ) = payable(p.contractor).call{value: amount}("");
        require(success, "Transfer failed");
    }

    // 5. 甲方发起退款申请
    function requestRefund(uint256 _projectId) external {
        Project storage p = projects[_projectId];
        require(msg.sender == p.client, "Only client");
        require(p.status == Status.Active, "Can only request from Active");

        p.status = Status.RefundRequested;
    }

    // --- 新增/修改的核心逻辑 ---

    // 6. 乙方拒绝退款并申诉 (进入仲裁中状态)
    function disputeRefund(uint256 _projectId) external {
        Project storage p = projects[_projectId];
        require(msg.sender == p.contractor, "Only contractor");
        require(
            p.status == Status.RefundRequested,
            "No refund requested to dispute"
        );

        p.status = Status.Disputed; // 变为 3 (仲裁中)
    }

    // 7. 乙方同意退款 (主动认输，资金退回甲方)
    function acceptRefund(uint256 _projectId) external nonReentrant {
        Project storage p = projects[_projectId];
        require(msg.sender == p.contractor, "Only contractor");
        require(
            p.status == Status.RefundRequested || p.status == Status.Disputed,
            "Invalid status"
        );

        uint256 amount = p.totalBudget;
        require(amount > 0, "No funds");

        p.totalBudget = 0;
        p.status = Status.Closed; // 变为 4 (已关闭/已退款)

        (bool success, ) = payable(p.client).call{value: amount}("");
        require(success, "Refund failed");
    }

    // 8. 管理员仲裁
    function arbitrate(
        uint256 _projectId,
        bool _refundToClient
    ) external onlyOwner nonReentrant {
        Project storage p = projects[_projectId];
        require(
            p.status == Status.RefundRequested || p.status == Status.Disputed,
            "Not in a state for arbitration"
        );

        uint256 amount = p.totalBudget;
        require(amount > 0, "No funds");

        p.totalBudget = 0;

        if (_refundToClient) {
            p.status = Status.Closed;
            (bool success, ) = payable(p.client).call{value: amount}("");
            require(success, "Refund failed");
        } else {
            p.status = Status.Paid;
            (bool success, ) = payable(p.contractor).call{value: amount}("");
            require(success, "Payment failed");
        }
    }

    // --- 视图辅助函数 ---

    function getEvidenceCount(
        uint256 _projectId
    ) external view returns (uint256) {
        return projects[_projectId].evidenceFlow.length;
    }

    function getEvidence(
        uint256 _projectId,
        uint256 _index
    )
        external
        view
        returns (address submitter, string memory content, uint256 timestamp)
    {
        Evidence storage e = projects[_projectId].evidenceFlow[_index];
        return (e.submitter, e.content, e.timestamp);
    }
}
