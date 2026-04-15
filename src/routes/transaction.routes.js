const {Router}=require("express");
const  authMiddleware  = require("../middleware/auth.middleware");
const transactioncontroller=require("../controllers/transaction.controller");
const transactionRoutes=Router();
 /**
  * - Post /api/transactions
  */
transactionRoutes.post("/",authMiddleware.authMiddleware,transactioncontroller.createTransaction);
transactionRoutes.post("/system/initial-funds",authMiddleware.authSystemUserMiddleware,transactioncontroller.createInitialFundsTransaction);

module.exports=transactionRoutes;