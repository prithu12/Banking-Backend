const moongose=require('mongoose');

const transactionSchema=new moongose.Schema({
    fromaccount:{
        type:moongose.Schema.Types.ObjectId,
        ref:"Account",
        required:[true,"Transaction must have a source account"],   
        index:true
    },
    toaccount:{
        type:moongose.Schema.Types.ObjectId,
        ref:"Account",
        required:[true,"Transaction must have a destination account"],
        index:true
    },
    status:{
        type:String,
        enum:{
            values:["pending","completed","failed","reversed"],
            message:"Status must be either pending, reversed,completed, or failed",
        },
        default:"pending"
    },
    amount:{
        type:Number,
        required:[true,"Transaction amount is required"],
        min:[0,"Transaction amount must be at greater 0"]
    },
    idempotencyKey:{
        type:String,
        required:[true,"Idempotency key is required for the transaction"],
        index:true,
        unique:true
    }
},{
    timestamps:true
})
module.exports=moongose.model('Transaction',transactionSchema);