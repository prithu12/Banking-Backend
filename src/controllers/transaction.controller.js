const transactionModel=require("../models/transaction.model");
const ledgerModel=require("../models/ledger.model");
const emailService=require("../services/email.services");
const usermodel=require("../models/user.model");
const mongoose=require("mongoose");
const accountmodel=require("../models/account.model");
/**
 * Create a new transaction
 * The 10 steps to create a transaction are as follows:
 * 1. Validate request
 * 2. Validate idempotent key
 * 3. Create account status
 * 4. Derive sender balaance from ledge
 * 5. Check if sender has sufficient balance
 * 6. Create transaction{Pending}
 * 7. Create ledger entries for sender and receiver
 * 8.Mark transaction as completed
 * 9. commit mongodb session
 * 10. send email
 
 */
async function createTransaction(req,res){
    try{
        const {fromAccount,toAccount,amount,idempotentKey}=req.body;

        if(!fromAccount || !toAccount || !amount || !idempotentKey){
            return res.status(400).json({
                message:"From Account, To Account, Amount and idempotentKey are required"
            });
        }

        const parsedAmount=Number(amount);
        if(Number.isNaN(parsedAmount) || parsedAmount<=0){
            return res.status(400).json({
                message:"Amount must be a number greater than 0"
            });
        }

        if(String(fromAccount)===String(toAccount)){
            return res.status(400).json({
                message:"fromAccount and toAccount must be different"
            });
        }

        const fromUserAccount=await accountmodel.findOne({
            _id:fromAccount,
            user:req.user._id,
            status:"active"
        });
        if(!fromUserAccount){
            return res.status(400).json({
                message:"Invalid fromAccount or you do not have access"
            });
        }

        const toUserAccount=await accountmodel.findOne({
            _id:toAccount,
            status:"active"
        });
        if(!toUserAccount){
            return res.status(400).json({
                message:"Invalid or inactive toAccount"
            });
        }

        const existing=await transactionModel.findOne({idempotencyKey:idempotentKey});
        if(existing){
            if(existing.status==="completed"){
                return res.status(200).json({
                    message:"Transaction already processed",
                    transactionId:existing._id
                });
            }
            if(existing.status==="pending"){
                return res.status(202).json({
                    message:"Transaction is still pending"
                });
            }
            return res.status(409).json({
                message:"A transaction already exists for this idempotency key",
                status:existing.status,
                transactionId:existing._id
            });
        }

        const balance=await fromUserAccount.getBalance();
        if(balance<parsedAmount){
            return res.status(400).json({
                message:`Insufficient balance in the sender account. Current balance is ${balance}`
            });
        }

        const session=await mongoose.startSession();
        let createdTransaction;
        try{
            session.startTransaction();

            createdTransaction=new transactionModel({
                fromaccount:fromUserAccount._id,
                toaccount:toUserAccount._id,
                amount:parsedAmount,
                idempotencyKey:idempotentKey,
                status:"pending"
            });
            await createdTransaction.save({session});

            await ledgerModel.insertMany([
                {
                    account:fromUserAccount._id,
                    amount:parsedAmount,
                    type:"debit",
                    transaction:createdTransaction._id
                },
                {
                    account:toUserAccount._id,
                    amount:parsedAmount,
                    type:"credit",
                    transaction:createdTransaction._id
                }
            ], {session});

            createdTransaction.status="completed";
            await createdTransaction.save({session});

            await session.commitTransaction();
        }catch(error){
            await session.abortTransaction();
            throw error;
        }finally{
            session.endSession();
        }

        const [fromUser,toUser]=await Promise.all([
            usermodel.findById(fromUserAccount.user),
            usermodel.findById(toUserAccount.user)
        ]);

        if(fromUser?.email){
            await emailService.sendTransactionEmail(fromUser.email,fromUser.name,parsedAmount);
        }
        if(toUser?.email){
            await emailService.sendTransactionEmail(toUser.email,toUser.name,parsedAmount);
        }

        return res.status(201).json({
            message:"Transaction created successfully",
            transactionId:createdTransaction._id
        });
    }catch(error){
        return res.status(500).json({
            message:"Failed to create transaction",
            error:error.message
        });
    }
}
async function createInitialFundsTransaction(req,res){
    try{
        const {toAccount,amount,idempotentKey}=req.body;
        if(!toAccount || !amount || !idempotentKey){
            return res.status(400).json({
                message:"To Account, Amount and idempotentKey are required"
            });
        }

        const parsedAmount=Number(amount);
        if(Number.isNaN(parsedAmount) || parsedAmount<=0){
            return res.status(400).json({
                message:"Amount must be a number greater than 0"
            });
        }

        const toUserAccount=await accountmodel.findOne({
            _id:toAccount,
            status:"active"
        });
        if(!toUserAccount){
            return res.status(400).json({
                message:"Invalid or inactive toAccount"
            });
        }

        const systemUser=await usermodel.findById(req.user._id).select("+systemUser");
        if(!systemUser || !systemUser.systemUser){
            return res.status(403).json({
                message:"From user must be a system user"
            });
        }

        const fromUserAccount=await accountmodel.findOne({
            user:systemUser._id,
            status:"active"
        });
        if(!fromUserAccount){
            return res.status(400).json({
                message:"System user account not found for the user",
                _id:systemUser._id
            });
        }

        const duplicate=await transactionModel.findOne({idempotencyKey:idempotentKey});
        if(duplicate){
            return res.status(409).json({
                message:"Duplicate idempotency key",
                transactionId:duplicate._id
            });
        }

        const session=await mongoose.startSession();
        let transaction;
        try{
            session.startTransaction();

            transaction=new transactionModel({
                fromaccount:fromUserAccount._id,
                toaccount:toUserAccount._id,
                amount:parsedAmount,
                idempotencyKey:idempotentKey,
                status:"pending"
            });
            await transaction.save({session});

            await ledgerModel.insertMany([
                {
                    account:fromUserAccount._id,
                    transaction:transaction._id,
                    amount:parsedAmount,
                    type:"debit"
                },
                {
                    account:toUserAccount._id,
                    transaction:transaction._id,
                    amount:parsedAmount,
                    type:"credit"
                }
            ],{session});

            transaction.status="completed";
            await transaction.save({session});

            await session.commitTransaction();
        }catch(error){
            await session.abortTransaction();
            throw error;
        }finally{
            session.endSession();
        }

        const toUser=await usermodel.findById(toUserAccount.user);
        if(toUser?.email){
            await emailService.sendTransactionEmail(toUser.email,toUser.name,parsedAmount);
        }

        return res.status(201).json({
            message:"Initial funds transaction created successfully",
            transactionId:transaction._id
        });
    }catch(error){
        return res.status(500).json({
            message:"Failed to create initial funds transaction",
            error:error.message
        });
    }
}

async function getUserTransactions(req,res){
    try{
        const userAccounts=await accountmodel.find({user:req.user._id}).select("_id");
        const accountIds=userAccounts.map((account)=>account._id);

        const transactions=await transactionModel.find({
            $or:[
                {fromaccount:{$in:accountIds}},
                {toaccount:{$in:accountIds}}
            ]
        })
        .sort({createdAt:-1})
        .populate("fromaccount", "user currency status")
        .populate("toaccount", "user currency status");

        return res.status(200).json({
            message:"Transactions retrieved successfully",
            count:transactions.length,
            transactions
        });
    }catch(error){
        return res.status(500).json({
            message:"Failed to retrieve transactions",
            error:error.message
        });
    }
}

async function getTransactionById(req,res){
    try{
        const {transactionId}=req.params;
        const userAccounts=await accountmodel.find({user:req.user._id}).select("_id");
        const accountIds=userAccounts.map((account)=>String(account._id));

        const transaction=await transactionModel.findById(transactionId)
            .populate("fromaccount", "user currency status")
            .populate("toaccount", "user currency status");

        if(!transaction){
            return res.status(404).json({
                message:"Transaction not found"
            });
        }

        const isOwner=
            accountIds.includes(String(transaction.fromaccount?._id || transaction.fromaccount)) ||
            accountIds.includes(String(transaction.toaccount?._id || transaction.toaccount));

        if(!isOwner){
            return res.status(403).json({
                message:"You do not have access to this transaction"
            });
        }

        return res.status(200).json({
            message:"Transaction retrieved successfully",
            transaction
        });
    }catch(error){
        return res.status(500).json({
            message:"Failed to retrieve transaction",
            error:error.message
        });
    }
}

 module.exports={createTransaction,createInitialFundsTransaction,getUserTransactions,getTransactionById};