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
    const {fromAccount,toAccount,amount,idempotentKey}=req.body;
    if(!fromAccount || !toAccount || !amount || !idempotentKey){
        return res.status(400).json({
            message:"From Account, To Account, Amount and idempotentKey are required"
        });
    }
    const fromUserAccount=await accountmodel.findOne({
        _id:fromAccount,
        status:"active"
    });
    if(!fromUserAccount){
        return res.status(400).json({
            message:"Invalid or inactive fromAccount"
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
    //validate idempotent key
    const isTransactionExist=await transactionModel.findOne({idempotencyKey:idempotentKey});
    if(isTransactionExist){
        if(isTransactionExist.status==="completed"){
            return res.status(200).json({
                message:"Transaction already processed",
                transactionId:isTransactionExist._id
            });
        }
        if(isTransactionExist.status==="pending"){
            return res.status(202).json({
                message:"Transaction is still pending",
            });
        }
        if(isTransactionExist.status==="failed"){
            return res.status(500).json({
                message:"Previous transaction attempt failed with the same idempotent key",
            });
        }
        if(isTransactionExist.status==="reversed"){
            return res.status(409).json({
                message:"A transaction with the same idempotent key was reversed. Please use a new idempotent key for a new transaction.",
            });
        }
        
    }
    //derive sender balance from ledger
    const balancem=await fromUserAccount.getBalance();
    if(balancem<amount){
        return res.status(400).json({
            message:`Insufficient balance in the sender account, Current Balance is ${balancem}`
        });
    }
    const session =await mongoose.startSession();
    session.startTransaction();
    const transaction= await transactionModel.create({
        fromAccount,
        toAccount,
        amount,
        idempotentKey,
        status:"pending"
    },{session});
    const debitLedgerEntry=await ledgerModel.create({
        account:fromAccount,
        amount:amount,
        type:"debit",
        transaction:transaction._id
    },{session});
    const creditLedgerEntry=await ledgerModel.create({ 
        account:toAccount,
        amount:amount,
        type:"credit",
        transaction:transaction._id
    },{session});
    transaction.status="completed";
    await transaction.save({session});
    await session.commitTransaction();
    session.endSession();
    //send email to sender and receiver
    const fromUser=await usermodel.findOne({_id:fromUserAccount.user});
    const toUser=await usermodel.findOne({_id:toUserAccount.user});
    await emailService.sendTransactionEmail(fromUser.email,fromUser.name,toUser.name,amount);
    await emailService.sendTransactionEmail(toUser.email,toUser.name,fromUser.name,amount);
    return res.status(201).json({
        message:"Transaction created successfully",
        transactionId:transaction._id
    });
}
async function createInitialFundsTransaction(req,res){
    const {toAccount,amount,idempotentKey}=req.body;
    if(!toAccount || !amount || !idempotentKey){
        return res.status(400).json({
            message:"To Account,Amount and idempotentkey are required"
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
    try{
        session.startTransaction();

        const transaction=new transactionModel({
            fromaccount:fromUserAccount._id,
            toaccount:toUserAccount._id,
            amount,
            idempotencyKey:idempotentKey,
            status:"pending"
        });
        await transaction.save({session});

        await ledgerModel.insertMany([
            {
                account:fromUserAccount._id,
                transaction:transaction._id,
                amount,
                type:"debit"
            },
            {
                account:toUserAccount._id,
                transaction:transaction._id,
                amount,
                type:"credit"
            }
        ],{session});

        transaction.status="completed";
        await transaction.save({session});

        await session.commitTransaction();

        return res.status(201).json({
            message:"Initial funds transaction created successfully",
            transactionId:transaction._id
        });
    }catch(error){
        await session.abortTransaction();
        return res.status(500).json({
            message:"Failed to create initial funds transaction",
            error:error.message
        });
    }finally{
        session.endSession();
    }
}
 module.exports={createTransaction,createInitialFundsTransaction};