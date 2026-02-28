// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PayCheckGuard is ReentrancyGuard, Ownable {
    struct Milestone {
        string description;
        uint256 amount;
        uint256 laborPercentage; // 1-100
        bool isPaid;
    }

    struct Project {
        address client;
        address contractor;
        uint256 totalBudget;
        bool exists;
        Milestone[] milestones;
    }

    mapping(uint256 => Project) public projects;
    uint256 public nextProjectId;

    // 项目ID => 工人地址列表
    mapping(uint256 => address[]) public projectWorkers;
    // 项目ID => (工人地址 => 比例/10000)
    mapping(uint256 => mapping(address => uint256)) public workerShares;

    constructor() Ownable(msg.sender) {}

    function createProject(
        address _contractor,
        string[] memory _descriptions,
        uint256[] memory _amounts,
        uint256[] memory _laborPercentages
    ) external payable {
        require(msg.value > 0, "Budget must be > 0");
        
        uint256 projectId = nextProjectId++;
        Project storage p = projects[projectId];
        p.client = msg.sender;
        p.contractor = _contractor;
        p.totalBudget = msg.value;
        p.exists = true;

        for (uint i = 0; i < _descriptions.length; i++) {
            p.milestones.push(Milestone(_descriptions[i], _amounts[i], _laborPercentages[i], false));
        }
    }

    // 分配工人比例
    function setWorkers(uint256 _projectId, address[] memory _workers, uint256[] memory _shares) external {
        require(msg.sender == projects[_projectId].contractor, "Only contractor can set workers");
        projectWorkers[_projectId] = _workers;
        for (uint i = 0; i < _workers.length; i++) {
            workerShares[_projectId][_workers[i]] = _shares[i];
        }
    }

    // 释放资金 (甲方验收)
    function releaseMilestone(uint256 _projectId, uint256 _mIndex) external nonReentrant {
        Project storage p = projects[_projectId];
        require(msg.sender == p.client, "Only client can release");
        Milestone storage m = p.milestones[_mIndex];
        require(!m.isPaid, "Already paid");

        m.isPaid = true;
        uint256 laborAmount = (m.amount * m.laborPercentage) / 100;
        uint256 contractorAmount = m.amount - laborAmount;

        // 发给乙方
        (bool s1, ) = p.contractor.call{value: contractorAmount}("");
        require(s1, "Transfer to contractor failed");

        // 直接发给工人
        address[] memory workers = projectWorkers[_projectId];
        for (uint i = 0; i < workers.length; i++) {
            uint256 share = (laborAmount * workerShares[_projectId][workers[i]]) / 10000;
            if (share > 0) {
                (bool s2, ) = workers[i].call{value: share}("");
                require(s2, "Transfer to worker failed");
            }
        }
    }
}