const express=require("express");
const cookieParser=require("cookie-parser");
const router=require("./routes/auth.routes");
const transactionRoutes=require("./routes/transaction.routes");
const accountRouter=require("./routes/account.routes");
const app=express();

app.use(express.json());
app.use(cookieParser());

app.use('/api/accounts', accountRouter);
app.use('/api/auth',router);
app.use('/api/transactions',transactionRoutes);



module.exports=app;