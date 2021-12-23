pragma solidity 0.6.0;
pragma experimental ABIEncoderV2;

contract Wallet {
    struct Transaction {
        uint256 id;
        uint256 amount;
        address payable to;
        uint256 approvals;
        bool sent;
    }
    Transaction[] public transactions;

    address[] public approvers;
    uint256 public quorum;
    mapping(address => mapping(uint256 => bool)) public approvals;

    constructor(address[] memory _approvers, uint256 _quorum) public {
        approvers = _approvers;
        quorum = _quorum;
    }

    function getApprovers() external view returns (address[] memory) {
        return approvers;
    }

    function getTransfers() public view returns (Transaction[] memory) {
        return transactions;
    }

    function createTransfer(uint256 amount, address payable to)
        external
        onlyApprover
    {
        transactions.push(
            Transaction(transactions.length, amount, to, 0, false)
        );
    }

    function approveTransfer(uint256 id) external onlyApprover {
        require(
            transactions[id].sent == false,
            "Transaction has already been sent."
        );
        require(
            approvals[msg.sender][id] == false,
            "Transaction cannot be approved twice."
        );
        approvals[msg.sender][id] = true;
        transactions[id].approvals++;
        if (transactions[id].approvals >= quorum) {
            transactions[id].sent = true;
            address payable to = transactions[id].to;
            uint256 amount = transactions[id].amount;
            to.transfer(amount);
        }
    }

    receive() external payable {}

    modifier onlyApprover() {
        bool allowed = false;
        for (uint256 i = 0; i < approvers.length; i++) {
            if (approvers[i] == msg.sender) {
                allowed = true;
            }
        }
        require(allowed == true, "Only Approvers allowed!!");
        _;
    }
}
