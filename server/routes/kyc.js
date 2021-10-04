const router = require("express").Router();
const axios = require("axios");

require("dotenv").config();

// Models
const userModel = require("../models/userModel");

// Services
const userService = require("../service/userServices");
const bankService = require("../service/bankService");

//Middlewares
const middleware = require("../middlewares/checkRoles");

// const fileData = require("../data.json");
let arr = [process.env.userPort1 || 50011]; // User ports array

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
		//find user A or B from mongo
		let data = 50011 || process.env.userPort1;
		//req.body.user == "A"
		//	? 50011 || process.env.userPort1
		//	: 50044 || process.env.userPort2;

		// Now resp will be a 2d Array
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
			resp = await userService.checkKycStatus(temp, email);

			if (resp.success == true) {
				res.send({ success: true, message: resp.message });
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
		let data =
			req.body.bank == "A"
				? process.env.bankFirst || 50006
				: process.env.bankSec || 50033;

		let resp = await bankService.getUserDatafromCorda(data);

		if (resp.message.length == 0) {
			res.send({
				success: true,
				message: `No transactions in ${req.body.bank} `,
			});
		} else {
			// console.log("Iam resp in /getdetails", resp);
			if (resp.success == false) {
				res.send({
					success: false,
					message: "Error in /kyc/getdetails and getUserDataFromCorda Service",
				});
			} else {
				resp = resp.message;

				let temp = [];

				for (let i = 0; i < resp.length; i++) {
					temp.push(resp[i].state.data);
				}
				// console.log("Iam temp in /getdetails\n", temp);
				let getLatestTransaction = await userService.getLatestTransaction(
					temp,
					email
				);

				// console.log(getLatestTransaction);
				if (getLatestTransaction.success == false) {
					res.send({
						success: false,
						message:
							"Error in /kyc/getdetails and getLatestTransaction service",
					});
				} else {
					res.send({ success: true, message: getLatestTransaction.message });
				}
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

		let respFromCorda = await bankService.getUserDatafromCorda(data);

		// let respFromCorda = []; // To test locally, **** Comment this****

		if (respFromCorda.success == false) {
			res.send({
				success: false,
				message: "Error in /kyc/getdetails and getUserDataFromCorda Service",
			});
		} else {
			// Now resp will be a 2d Array jab 2 user hai
			// ek nested loop ke andar kar dena y waal loop kind of for (let ele = 0; ele < resp.length; ele++)
			// fir resp[i] ki jagah resp[ele] ek array ban jaege isko modify karna padega
			// for (let j = 0; j < resp.length; j++) {

			// 	let arr = [];

			// 	for (let i = 0; i < resp[j].length; i++) {
			// 		arr[i].push(resp[j][i].state.data);
			// 	}

			// 	temp.push(arr);
			// }

			// respFromCorda = fileData;			// Uncomment when testing locally *****IMP****

			if (respFromCorda.message.length == 0) {
				res.send({
					success: true,
					message: `No transactions in ${req.body.bank} `,
				});
			} else {
				
				respFromCorda = respFromCorda.message;

				let temp = [];

				for (let i = 0; i < respFromCorda.length; i++) {
					temp.push(respFromCorda[i].state.data);
				}

				console.log(temp);

				let finalApproval = [],
					finalPending = [];

				for (let i = 0; i < arr.length; i++) {
					
					let respFromCordaFromUser = await userService.getUserDatafromCorda(
						arr[i]
					);

					respFromCordaFromUser = respFromCordaFromUser.message;

					// console.log(
					// 	respFromCordaFromUser,
					// 	" \nUser\n",
					// 	respFromCorda,
					// 	"\nFrom Corda\n"
					// );

					let temp1 = [];

					for (let i = 0; i < respFromCordaFromUser.length; i++) {
						temp1.push(respFromCordaFromUser[i].state.data);
					}

					let respData = await bankService.getApprovalLists(temp, temp1);

					// console.log("Iam temp in /getapprovals", respData.message.pending);

					if (respData.success == false) {
						throw new Error({
							success: false,
							message: "Error in getApprovalLists service",
						});
					} else {
						finalApproval = [...finalApproval, ...respData.message.approved];
						finalPending = [...finalPending, ...respData.message.pending];
						// console.log("Arrays\n\n");

						// for (let i = 0; i < respData.message.pending.length; i++)
						// 	console.log(respData.message.pending[i].approved_by, "\n");

						// for (let i = 0; i < respData.message.approved.length; i++)
						// 	console.log(respData.message.approved[i].approved_by, "\n");
					}
				}

				// Maybe will need a for loop here for like processing every user and then we will
				// send the final list

				res.send({
					success: true,
					message: { approved: finalApproval, pending: finalPending },
				});
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
