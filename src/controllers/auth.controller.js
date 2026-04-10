const usermodel=require('../models/user.model');
const jwt=require('jsonwebtoken');
const emailservice=require("../services/email.services");

async function registerUser(req,res){
    try{
        const {email,name,password}=req.body;
        const isExists=await usermodel.findOne({email:email})
        if(isExists){
            return res.status(422).json({Message:"User already exists",Status:"Failed"});
        }
        const user=await usermodel.create({email,name,password});
        const token=jwt.sign({userId:user._id},process.env.JWT_SECRET,{expiresIn:'3d'});

        res.cookie("token",token)
        res.status(201).json({user:{
            _id:user._id,
            email:user.email,
            name:user.name
        },token})
        await emailservice.sendregistrationEmail(user.email,user.name);
    }catch(error){
        console.error("Error in registerUser:",error);
        res.status(500).json({Message:"Internal Server Error",Status:"Failed",error:error.message});
    }
}
async function loginUser(req,res){
    try{
        const {email,password}=req.body;
        const user=await usermodel.findOne({email:email}).select("+password");
        if(!user){
            return res.status(404).json({Message:"User not found",Status:"Failed"});
        }
        const isMatch=await user.comparePassword(password);
        if(!isMatch){
            return res.status(401).json({Message:"Invalid credentials",Status:"Failed"});
        }
        const token=jwt.sign({userId:user._id},process.env.JWT_SECRET,{expiresIn:'3d'});
        res.cookie("token",token);
        res.status(200).json({user:{
            _id:user._id,
            email:user.email,
            name:user.name
        },token})
    }catch(error){
        console.error("Error in loginUser:",error);
        res.status(500).json({Message:"Internal Server Error",Status:"Failed",error:error.message});

    }
}

module.exports={registerUser,loginUser};