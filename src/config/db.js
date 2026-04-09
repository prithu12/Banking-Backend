const mongoose=require('mongoose');
require('dotenv').config();
function connectDB(){
    mongoose.connect(process.env.MongoDBUrl).then(()=>{
        console.log('Connected to MongoDB');
    }).catch((err)=>{
        console.log('Error connecting to MongoDB',err);
        process.exit(1);
    });
}

module.exports=connectDB;