const mongoose=require('mongoose');
const ledgerModel=require('./ledger.model');

const accountSchema=new mongoose.Schema({
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:[true, "Account must be associated with a user"],
        index:true
    },
    status:{
        type:String,
        enum:{
            values:["active","inactive","closed"],
            message:"Status must be either active, inactive, or closed",
        },
        default:"active"

    },
    currency:{
        type:String,
        required:[true,"Currency is required for the account"],
        default:"INR"
    }
},{
    timestamps:true
});

accountSchema.index({user:1,status:1});

accountSchema.methods.getBalance = async function () {

    const balanceData = await ledgerModel.aggregate([
        { $match: { account: this._id } },
        {
            $group: {
                _id: null,
                totalDebit: {
                    $sum: {
                        $cond: [
                            { $eq: [ "$type", "debit" ] },
                            "$amount",
                            0
                        ]
                    }
                },
                totalCredit: {
                    $sum: {
                        $cond: [
                            { $eq: [ "$type", "credit" ] },
                            "$amount",
                            0
                        ]
                    }
                }
            }
        },
        {
            $project: {
                _id: 0,
                balance: { $subtract: [ "$totalCredit", "$totalDebit" ] }
            }
        }
    ])

    if (balanceData.length === 0) {
        return 0
    }

    return balanceData[ 0 ].balance

}



const accountmodel=mongoose.model('Account',accountSchema);

module.exports=accountmodel;