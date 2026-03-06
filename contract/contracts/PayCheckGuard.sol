// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PayCheckGuard is ReentrancyGuard, Ownable {
    enum Status {
        Active,
        Paid,
        RefundRequested,
        Disputed,
        Closed
    }

    // 新增：证据结构体体，支持多媒体链接和时间戳
    struct Evidence {
        address submitter;
        string content; // 存储文本、图片URL或IPFS哈希
        uint256 timestamp;
    }

    struct Project {
        address client;
        address contractor;
        uint256 totalBudget;
        string title; // 1. 工程标题
        string requirements; // 1. 工程要求
        uint256 deadline; // 1. 自动支付截止时间戳
        Status status;
        Evidence[] evidenceFlow; // 2. 存证流：记录甲乙双方多次提交的理由
    }

    mapping(uint256 => Project) public projects;
    uint256 public nextProjectId;

    constructor() Ownable(msg.sender) {}

    // 1. 发布工程：新增标题、要求和周期（秒）
    function createProject(
        address _contractor,
        string memory _title,
        string memory _requirements,
        uint256 _durationSeconds
    ) external payable {
        require(msg.value > 0, "Amount must > 0");

        uint256 projectId = nextProjectId++;
        Project storage p = projects[projectId];
        p.client = msg.sender;
        p.contractor = _contractor;
        p.totalBudget = msg.value;
        p.title = _title;
        p.requirements = _requirements;
        p.deadline = block.timestamp + _durationSeconds; // 设置倒计时终点
        p.status = Status.Active;
    }

    // 2. 提交理由/证明：甲乙双方均可多次提交，按时间戳排序
    function addEvidence(uint256 _projectId, string memory _content) external {
        Project storage p = projects[_projectId];
        require(
            msg.sender == p.client || msg.sender == p.contractor,
            "No permission"
        );
        require(
            p.status != Status.Paid && p.status != Status.Closed,
            "Project closed"
        );

        p.evidenceFlow.push(
            Evidence({
                submitter: msg.sender,
                content: _content,
                timestamp: block.timestamp
            })
        );
    }

    // 3. 自动结算触发：时间一到，任何人可调用此函数将钱转给乙方
    function triggerAutoPay(uint256 _projectId) external nonReentrant {
        Project storage p = projects[_projectId];
        require(p.status == Status.Active, "Status not Active");
        require(block.timestamp >= p.deadline, "Deadline not reached yet");

        uint256 amount = p.totalBudget;
        p.totalBudget = 0;
        p.status = Status.Paid;
        payable(p.contractor).transfer(amount);
    }

    // 4. 甲方手动验收（提前结算）
    function releaseFunds(uint256 _projectId) external nonReentrant {
        Project storage p = projects[_projectId];
        require(msg.sender == p.client, "Only client");
        require(p.status == Status.Active, "Status must be Active");

        uint256 amount = p.totalBudget;
        p.totalBudget = 0;
        p.status = Status.Paid;
        payable(p.contractor).transfer(amount);
    }

    // 5. 甲方申请退款（会冻结自动支付计时逻辑，进入争议流程）
    function requestRefund(uint256 _projectId) external {
        Project storage p = projects[_projectId];
        require(msg.sender == p.client, "Only client");
        require(p.status == Status.Active, "Status must be Active");
        p.status = Status.RefundRequested;
    }

    // 6. 乙方拒绝退款
    function disputeRefund(uint256 _projectId) external {
        Project storage p = projects[_projectId];
        require(msg.sender == p.contractor, "Only contractor");
        require(p.status == Status.RefundRequested, "No refund requested");
        p.status = Status.Disputed;
    }

    // 7. 管理员仲裁
    function arbitrate(
        uint256 _projectId,
        bool _refundToClient
    ) external onlyOwner nonReentrant {
        Project storage p = projects[_projectId];
        require(p.status == Status.Disputed, "Not in dispute");

        uint256 amount = p.totalBudget;
        p.totalBudget = 0;
        p.status = Status.Closed;

        if (_refundToClient) {
            payable(p.client).transfer(amount);
        } else {
            payable(p.contractor).transfer(amount);
        }
    }

    // 辅助函数：前端获取证据流数量
    function getEvidenceCount(
        uint256 _projectId
    ) external view returns (uint256) {
        return projects[_projectId].evidenceFlow.length;
    }

    // 辅助函数：获取特定索引的证据内容
    function getEvidence(
        uint256 _projectId,
        uint256 _index
    ) external view returns (address, string memory, uint256) {
        Evidence storage e = projects[_projectId].evidenceFlow[_index];
        return (e.submitter, e.content, e.timestamp);
    }
}
