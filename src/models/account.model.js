const mongoose=require('mongoose');

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



const accountmodel=mongoose.model('Account',accountSchema);

module.exports=accountmodel;