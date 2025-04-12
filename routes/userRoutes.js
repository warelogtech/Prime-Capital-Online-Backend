// routes/userRoutes.js
import express from "express";
import { registerUser, getUsers, updateUser, deleteUser, saveCustomerIdentification } from "../controllers/userController.js";

const router = express.Router();

router.post("/register", registerUser);
router.get("/users", getUsers);
router.delete("/users/:cust_id", deleteUser);
router.put('/users/:cust_id', updateUser);
router.post('/customeridentity', saveCustomerIdentification);


export default router;
