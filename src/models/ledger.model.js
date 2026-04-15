const mongoose=require('mongoose');

const ledgerSchema=new mongoose.Schema({
    account:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Account",
        required:[true,"Ledger entry must be associated with an account"],
        index:true,
        immutable:true
    },
    amount:{
        type:Number,
        required:[true,"Ledger entry amount is required"],
        immutable:true,
    },
    transaction:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Transaction",
        required:[true,"Ledger entry must be associated with a transaction"],
        index:true,
        immutable:true
    },
    type:{
        type:String,
        enum:{
            values:["debit","credit"],
        },
        required:[true,"Ledger entry type is required"],
        immutable:true
    }
})
function preventledgerModification(){
    throw new Error("Ledger entries cannot be modified or deleted");
}
ledgerSchema.pre("findOneAndUpdate",preventledgerModification);
ledgerSchema.pre("updateOne",preventledgerModification);
ledgerSchema.pre("deleteOne",preventledgerModification);
ledgerSchema.pre("deleteMany",preventledgerModification);
ledgerSchema.pre("remove",preventledgerModification);


module.exports=mongoose.model('Ledger',ledgerSchema);