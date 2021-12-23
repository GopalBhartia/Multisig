const { assertion } = require("@openzeppelin/test-helpers/src/expectRevert");
const { web3 } = require("@openzeppelin/test-helpers/src/setup");
const { expectRevert } = require('@openzeppelin/test-helpers');

const Wallet = artifacts.require('Wallet');

contract('Wallet', (accounts) => {
    let wallet;
    beforeEach(async () => {
        wallet = await Wallet.new([accounts[0], accounts[1], accounts[2], accounts[3]], 3);
        await web3.eth.sendTransaction({ from: accounts[0], to: wallet.address, value: 1000 });
    });


    it('Testcase 1: should have correct approvers and quorum', async () => {
        const approvers = await wallet.getApprovers();
        const quorum = await wallet.quorum();

        assert(approvers.length == 4);
        assert(approvers[0] == accounts[0]);
        assert(approvers[1] == accounts[1]);
        assert(approvers[2] == accounts[2]);
        assert(approvers[3] == accounts[3]);
        assert(quorum.toNumber() == 3)

    });

    it('Testcase 2: should be able to create transfers', async () => {
        await wallet.createTransfer(100, accounts[4], { from: accounts[0] });
        const transfers = await wallet.getTransfers();
        assert(transfers.length == 1);
        assert(transfers[0].id == '0');
        assert(transfers[0].amount == '100');
        assert(transfers[0].approvals == '0');
        assert(transfers[0].sent == false);
    });

    it('Testcase 3: should NOT create transfers if sender is not approved', async () => {
        await expectRevert(
            wallet.createTransfer(100, accounts[5], { from: accounts[4] }),
            'Only Approvers allowed!!'
        );
    });

    it('Testcase 4: should increment approval', async () => {
        await wallet.createTransfer(100, accounts[5], { from: accounts[0] });
        await wallet.approveTransfer(0, { from: accounts[0] });
        const transfers = await wallet.getTransfers();
        const balance = await web3.eth.getBalance(wallet.address);
        assert(transfers[0].approvals == '1');
        assert(transfers[0].sent == false);
        assert(balance == '1000');
    });

    it('Testcase 5: should send transfer if quorum reached', async () => {
        const balanceBefore = web3.utils.toBN(await web3.eth.getBalance(accounts[6]));
        await wallet.createTransfer(100, accounts[6], { from: accounts[0] });
        await wallet.approveTransfer(0, { from: accounts[0] });
        await wallet.approveTransfer(0, { from: accounts[1] });
        await wallet.approveTransfer(0, { from: accounts[2] });
        const balanceAfter = web3.utils.toBN(await web3.eth.getBalance(accounts[6]));
        assert(balanceAfter.sub(balanceBefore).toNumber() == 100);
    });

    it('Testcase 6: should NOT approve transfer if sender is not approved', async () => {
        await wallet.createTransfer(100, accounts[5], { from: accounts[0] });
        await expectRevert(
            wallet.approveTransfer(0, { from: accounts[4] }),
            'Only Approvers allowed!!'
        );
    });

    it('Testcase 7: should NOT approve transfer if transfer is already sent', async () => {
        await wallet.createTransfer(100, accounts[6], { from: accounts[0] });
        await wallet.approveTransfer(0, { from: accounts[0] });
        await wallet.approveTransfer(0, { from: accounts[1] });
        await wallet.approveTransfer(0, { from: accounts[2] });
        await expectRevert(
            wallet.approveTransfer(0, { from: accounts[3] }),
            'Transaction has already been sent.'
        );
    });

    it('Testcase 8: should NOT approve transfer twice', async () => {
        await wallet.createTransfer(100, accounts[7], { from: accounts[0] });
        await wallet.approveTransfer(0, { from: accounts[0] });
        await expectRevert(
            wallet.approveTransfer(0, { from: accounts[0] }),
            'Transaction cannot be approved twice.'
        );
    });
});