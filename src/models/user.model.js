const mongoose=require('mongoose');
const bcrypt=require('bcryptjs');
const userSchema=new mongoose.Schema({
    email:{
        type:String,
        required:[true,"Email is required"],
        trim:true,
        lowercase:true,
        match:[/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/,"Please enter a valid email address"],
        unique:[true,"Email already exists"]
    },
    name:{
        type:String,
        required:[true,"Name is required for the user"],
    },
    password:{
        required:[true,"Password is required for the user"],
        type:String,
        minlength:[6,"Password must be at least 6 characters long"],
        select:false
    }

},{
    timestamps:true
});
userSchema.pre("save",async function(){
    if(!this.isModified("password")){
        return
    }
    const hashedPassword=await bcrypt.hash(this.password,10 );
    this.password=hashedPassword;
    return
});

userSchema.methods.comparePassword=async function(password){
    return await bcrypt.compare(password,this.password);
}

const usermodel=mongoose.model('User',userSchema);
module.exports=usermodel;