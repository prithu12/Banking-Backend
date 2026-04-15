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