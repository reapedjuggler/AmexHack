const router = require("express").Router();
const axios = require("axios");

require("dotenv").config();

// Models
const userModel = require("../models/userModel");

// Services
const userService = require("../service/userServices");
const bankService = require("../service/bankService");

// const fileData = require("../data.json");

router.post("/apply", async (req, res, next) => {
	try {
		// whether this email already exists in corda
		// your email exists so you need to authorize only

		const { bank, email, aadhar, pan } = req.body;

		// whether this email exists or not in mongo

		let resp = await userModel.find({ email: email });

		if (Object.keys(resp).length == 0) {
			res.send({
				success: false,
				message: "Please signup before proceeding for KYC",
			});
		} else {
			const cordaData = {
				aadhar: aadhar,
				pan: pan,
				email: email,
				bank:
					bank == "A"
						? 50006 || process.env.bankFirst
						: 50033 || process.env.bankSe,
				partyName: "",
				approval: "false",
			};

			let partyName = await userService.getPartyNameFromCorda(bank);

			if (partyName.success == false) {
				res.send({
					success: false,
					message: "Error in apply route and partyName service",
				});
			} else {
				cordaData.partyName = partyName.message.me;

				let respFromCord = await userService.sendUserDataToCorda(cordaData);

				if (respFromCord.success == false) {
					res.send({
						success: false,
						message: "Error in /kyc/apply and sendUserDataToCorda Service",
					});
				} else {
					res.send({ success: true, message: "Requested for Kyc" });
				}
			}
		}
	} catch (err) {
		res.send({ success: false, message: err.message });
	}
});

router.post("/status", async (req, res) => {
	try {
		let email = req.body.email;

		let data = 50011 || process.env.userPort;

		let resp = await userService.getUserDatafromCorda(data);
		if (resp.success == false) {
			res.send({
				success: false,
				message: "Error in /kyc/status and getUserDataFromCorda Service",
			});
		} else {
			resp = resp.message;
			// let resp = fileData;
			let temp = [];

			for (let i = 0; i < resp.length; i++) {
				temp.push(resp[i].state.data);
			}

			let respo = await userService.checkKycStatus(temp, email);
			console.log("er",respo)

			if (respo.success == true) {
				res.send({ success: true, message: respo });
			} else {
				res.send({
					success: false,
					message: "Error in /kyc/status and checkKycStatus Service",
				});
			}
		}
	} catch (err) {
		res.send({ success: false, message: err });

	}
});

router.post("/approve", async (req, res) => {
	//if false then approve

	try {
		let data =
			req.body.bank == "A"
				? process.env.bankFirst || 50006
				: process.env.bankSec || 50033;

		let email = req.body.email;

		let resp = await userService.getUserDatafromCorda(data);
		resp = resp.message;
		// let resp = fileData;
		let temp = [];

		for (let i = 0; i < resp.length; i++) {
			temp.push(resp[i].state.data);
		}
		// console.log("sfhsfhsfhshsh\n", temp);
		let getLatestTransaction = await userService.getLatestTransaction(
			temp,
			email
		);

		if (getLatestTransaction.success == false) {
			res.send({
				success: false,
				message: "Error in /kyc/approve and getLatestTransaction Service",
			});
		} else {
			// console.log(getLatestTransaction, "  sad\n\n");
			getLatestTransaction = getLatestTransaction.message;

			if (getLatestTransaction == []) {
				res.send({ success: false, message: "not applied for kyc" });
			} else {
				let partyName = process.env.userPort || 50011;

				const cordaData = {
					aadhar: getLatestTransaction[0].aadhar,
					pan: getLatestTransaction[0].pan,
					email: email,
					bank: data,
					partyName: partyName,
					approval: "true",
				};

				let respFromCorda = await bankService.sendBankDataToCorda(cordaData);

				// Service did not approved the user
				if (respFromCorda.success == false) {
					res.send({
						success: false,
						message:
							"Error in api of getting latest transaction in /kyc/approve in service sendBankDataToCorda",
					});
				} else {
					//approve call approveUsertoCorda etc
					res.send({ success: true, message: "User approved by Bank" });
				}
			}
		}
	} catch (err) {
		res.send({ success: false, message: err.message });
	}
});

router.post("/getdetails", async (req, res) => {
	try {
		let email = req.body.email;

		let resp = await userService.getUserDatafromCorda(data);

		if (resp.success == false) {
			res.send({
				success: false,
				message: "Error in /kyc/getdetails and getUserDataFromCorda Service",
			});
		} else {
			resp = resp.message;
			// let resp = fileData;
			let temp = [];

			for (let i = 0; i < resp.length; i++) {
				temp.push(resp[i].state.data);
			}
			// console.log("sfhsfhsfhshsh\n", temp);
			let getLatestTransaction = await userService.getLatestTransaction(
				temp,
				email
			);

			if (getLatestTransaction.success == false) {
				res.send({
					success: false,
					message: "Error in /kyc/getdetails and getLatestTransaction service",
				});
			} else {
				res.send({ success: true, message: getLatestTransaction.message });
			}
		}
	} catch (err) {
		res.send({ success: false, message: err.message });
	}
});

router.post("/getapprovals", async (req, res) => {
	try {
		let data =
			req.body.bank == "A"
				? process.env.bankFirst || 50006
				: process.env.bankSec || 50033;

		let respFromCorda = await userService.getUserDatafromCorda(data);
		if (respFromCorda.success == false) {
			res.send({
				success: false,
				message: "Error in /kyc/getdetails and getUserDataFromCorda Service",
			});
		} else {
			respFromCorda = respFromCorda.message;

			let temp = [];

			for (let i = 0; i < respFromCorda.length; i++) {
				temp.push(respFromCorda[i].state.data);
			}

			let respData = await bankService.getApprovalLists(temp);

			if (respData.success == false) {
				res.send({
					success: false,
					message:
						"Error in /kyc/getapprovals route and getApprovalList service",
				});
			} else {
				res.send({ success: true, message: respData.message });
			}
		}
	} catch (err) {
		console.log(err);
		res.send({ success: false, message: err });
	}
});
module.exports = exports = {
	router,
};
