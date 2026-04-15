const usermodel=require('../models/user.model');

const jwt=require('jsonwebtoken');

async function authMiddleware(req,res,next){
    const token=req.cookies.token || req.headers.authorization?.split(' ')[1]
    if(!token){
        return res.status(401).json({
            message:'Unauthorized'
        })
    }
    try{
        const decode=jwt.verify(token,process.env.JWT_SECRET);
        const user=await usermodel.findById(decode.userId);
        req.user=user;
        return next();
    }catch(err){
        return res.status(401).json({
            message:'Unauthorized'
        })
    }
}
async function authSystemUserMiddleware(req,res,next){
    const token=req.cookies.token || req.headers.authorization?.split(' ')[1]
    if(!token){
        return res.status(401).json({
            message:'Unauthorized'
        })
    }
    try{
        const decode=jwt.verify(token,process.env.JWT_SECRET);
        const user=await usermodel.findById(decode.userId).select("+systemUser");
        if(!user.systemUser){
            return res.status(403).json({
                message:'Forbidden: System user access required'
            })
        }
        req.user=user;
        return next();
    }catch(err){
        return res.status(401).json({
            message:'Unauthorized'
        })

    }
}
module.exports={authMiddleware, authSystemUserMiddleware};