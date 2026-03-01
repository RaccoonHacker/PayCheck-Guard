// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PayCheckGuard is ReentrancyGuard, Ownable {
    // 定义项目状态
    enum Status { Active, Paid, RefundRequested, Disputed, Closed }

    struct Project {
        address client;
        address contractor;
        uint256 totalBudget;
        string metadata;     // 存储：项目名称、任务详情 (可以是 JSON 字符串)
        string proof;        // 存储：乙方提交的工作证明 (图片/视频链接)
        Status status;       // 项目状态标签
    }

    mapping(uint256 => Project) public projects;
    uint256 public nextProjectId;

    constructor() Ownable(msg.sender) {}

    // 1. 发布工程：增加 metadata 参数
    function createProject(
        address _contractor,
        string memory _metadata, 
        uint256 _amount
    ) external payable {
        require(msg.value == _amount && _amount > 0, "Amount mismatch");
        
        uint256 projectId = nextProjectId++;
        Project storage p = projects[projectId];
        p.client = msg.sender;
        p.contractor = _contractor;
        p.totalBudget = msg.value;
        p.metadata = _metadata; 
        p.status = Status.Active;
    }

    // 2. 乙方提交证明
    function submitProof(uint256 _projectId, string memory _proof) external {
        Project storage p = projects[_projectId];
        require(msg.sender == p.contractor, "Only contractor can submit proof");
        require(p.status == Status.Active, "Project not active");
        
        p.proof = _proof;
    }

    // 3. 甲方验收并释放
    function releaseFunds(uint256 _projectId) external nonReentrant {
        Project storage p = projects[_projectId];
        require(msg.sender == p.client, "Only client can release");
        require(p.status == Status.Active, "Status must be Active");

        p.status = Status.Paid;
        payable(p.contractor).transfer(p.totalBudget);
    }

    // 4. 申请退款 (甲方发起)
    function requestRefund(uint256 _projectId) external {
        Project storage p = projects[_projectId];
        require(msg.sender == p.client, "Only client can request");
        p.status = Status.RefundRequested;
    }

    // 5. 主动取消 (乙方发起)
    function cancelByContractor(uint256 _projectId) external nonReentrant {
        Project storage p = projects[_projectId];
        require(msg.sender == p.contractor, "Only contractor can cancel");
        require(p.status != Status.Paid, "Already paid");

        p.status = Status.Closed;
        payable(p.client).transfer(p.totalBudget); // 钱退给甲方
    }
}