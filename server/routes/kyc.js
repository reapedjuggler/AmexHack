const router = require("express").Router();

// Models
const userModel = require("../models/userModel");

// Services
const userService = require("../service/userServices");
const bankService = require("../service/bankService");

const fileData = require("../data.json");

router.post("/apply", async (req, res, next) => {
	try {
		// whether this email already exists in corda
		// your email exists so you need to authorize only

		const { bank, email, aadhar, pan } = req.body;

		// whether this email exists or not in mongo

		let resp = await userModel.find({ email: email });

		if (Object.keys(resp).length == 0) {
			res.send({ success: false, message: "Already applied for KYC" });
		}

		const cordaData = {
			aadhar: aadhar,
			pan: pan,
			email: email,
			bank: bank == "A" ? 50006 : 50033,
			partyName: "",
		};

		console.log(req.body);

		let partyName = await userService.getPartyNameFromCorda(bank);
		console.info(partyName);

		cordaData.partyName = partyName.message.me;

		let respFromCord = await userService.sendUserDataToCorda(cordaData);

		if (respFromCord.success == false)
			throw new Error({ success: false, message: respFromCord.message });

		// console.log(respFromCord, "Iam the corda data\n");

		res.send({ success: true, message: "Requested for Kyc" });
	} catch (err) {
		res.send({ success: false, message: err.message });
	}
});

router.post("/getapprovals", async (req, res) => {
	try {
		// let data = bank == "A" ? 50006 : 50033;

		// let respFromCorda = await bankService.getUserDatafromCorda(data);
		// respFromCorda = respFromCorda.message;

		let respFromCorda = fileData;

		for (let i = 0; i < respFromCorda.length; i++) {
			respFromCorda[i] = respFromCorda[i].state.data;
		}

		// console.log(respFromCorda);

		let respData = await bankService.getApprovalLists(respFromCorda);

		if (respData.success == false) throw new Error("No Data Found");

		res.send({ success: true, message: respData });
	} catch (err) {
		console.log(err);
		res.send({ success: false, message: err });
	}
});
module.exports = exports = {
	router,
};
