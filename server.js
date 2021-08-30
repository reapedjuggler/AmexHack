const express = require("express");
require("./database/db");
require("dotenv").config();

const app = express();

const userRouter = require("./routes/userRoute").router;

const PORT = process.env.PORT || 8000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/user", userRouter);

app.listen(PORT, () => {
	console.log("Server is running on port " + PORT);
});
