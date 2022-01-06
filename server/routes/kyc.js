const router = require("express").Router();
const axios = require("axios");

require("dotenv").config();

// Models
const userModel = require("../models/userModel");

// Services
const userService = require("../service/userServices");
const bankService = require("../service/bankService");
const tokenService = require("../service/tokenService");
const r3Corda = require("../r3corda");
//Middlewares
const middleware = require("../middlewares/checkRoles");
//Only for testing puprose ///////////////********* Make sure to remove this *////////////////////////////
const fileData1 = require("../data3.json");


// Route for applying for KYC 
router.post("/apply", async (req, res, next) => {
	try {
		// whether this email already exists in corda
		// your email exists so you need to authorize only

		const { bank, email, aadhar, pan } = req.body;
		if (!bank || !email || !aadhar || !pan) {
			console.log("Error from front-end in fetching body details");
		}
		// whether this email exists or not in mongo

		let resp = await userModel.findOne({ email: email });
		//console.log(resp)
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
					bank == r3Corda.bankFromBlockchain
						? 50006 || process.env.bankFirst
						: 50033 || process.env.bankSec,
				partyName: "",
				approval: "false",
				port: resp.name == r3Corda.bankFromBlockchain ? 50011 : 50071,
			};

			let partyName = await bankService.getPartyNameFromCorda(bank);
			//console.log(cordaData,"cordaData",partyName)
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


// Route for checking status for a user's KYC 
router.post("/status", async (req, res) => {
	try {
		let email = req.body.email;

		if (!email) {
			console.log("Error in Front-end");
		}

		//find user A or B from mongo
		let dataMongo = await userModel.findOne({ email: email });
		dataMongo = dataMongo.name;
		//console.log(dataMongo)
		let data =
			dataMongo == r3Corda.bankFromBlockchain
				? 50011 || process.env.userPort1
				: 50071 || process.env.userPort2;
		//console.log(data)
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
			//console.log(temp);
			resp = await userService.checkKycStatus2(temp, email);

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

// Route for approving a user's KYC 
router.post("/approve", async (req, res) => {
	try {
		let data =
			req.body.bank == r3Corda.bankFromBlockchain
				? process.env.bankFirst || 50006
				: process.env.bankSec || 50033;

		let email = req.body.email;
		if (!email || !req.body.bank) {
			console.log("Error in Front-end");
		}
		let resp = await bankService.getUserDatafromCorda(data);
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
				let userDetails = await userModel.findOne({ email: email });

				let partyName = await userService.getPartyNameFromCorda(
					userDetails.name
				);

				const cordaData = {
					aadhar: getLatestTransaction[0].aadhar,
					pan: getLatestTransaction[0].pan,
					email: email,
					bank: data,
					partyName: partyName.message.me,
					approval: "true",
				};

				let respFromCorda = await bankService.sendBankDataToCorda(cordaData);
				//console.log("respformmgagcor",respFromCorda)
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


// Route for getting a user's consent 
router.post("/consent", async (req, res) => {
	// making approval attribute as "request" for consent form
	try {
		let data =
			req.body.bank == r3Corda.bankFromBlockchain
				? process.env.bankFirst || 50006
				: process.env.bankSec || 50033;

		let email = req.body.email;
		if (!req.body.bank || !email) {
			console.log("Error in Front-end");
		}
		let resp = await bankService.getUserDatafromCorda(data);
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
				let userDetails = await userModel.findOne({ email: email });

				let partyName = await userService.getPartyNameFromCorda(
					userDetails.name
				);
				//console.log("getlatedst",getLatestTransaction)
				const cordaData = {
					aadhar: getLatestTransaction[0].aadhar,
					pan: getLatestTransaction[0].pan,
					email: email,
					bank: data,
					partyName: partyName.message.me,
					approval: "request",
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

					res.send({ success: true, message: "Consent requested by Auditor" });
				}
			}
		}
	} catch (err) {
		res.send({ success: false, message: err.message });
	}
});


// Route for getting a user's details 
router.post("/getdetails", async (req, res) => {
	try {
		let email = req.body.email;
		let data =
			req.body.bank === r3Corda.bankFromBlockchain
				? process.env.bankFirst || 50006
				: process.env.bankSec || 50033;

		if (!req.body.bank || !email) {
			console.log("Front-end Error ");
		}

		let resp = await bankService.getUserDatafromCorda(data);

		if (resp.message.length === 0) {
			res.send({
				success: false,
				message: [],
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

				// console.log(getLatestTransaction, "latest");
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

// Getting user details from other bank
router.post("/getdetails2", async (req, res) => {
	try {
		// y tab hit hota hai jab user already apply kar chuka hai atleast ek bank mai or dobara apply karne ja raha hai dusre
		// bank mai to ab uski details already applied waale bank se laani padege to port swap karne padege

		let email = req.body.email;
		let data =
			req.body.bank == r3Corda.bankFromBlockchain
				? process.env.bankFirst || 50033
				: process.env.bankSec || 50006;
		if (!req.body.bank || !email) {
			console.log("Front-end error");
		}
		let resp = await bankService.getUserDatafromCorda(data);

		if (resp.message.length == 0) {
			res.send({
				success: true,
				message: [],
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

				// console.log(getLatestTransaction, "latest");
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

// Getting user's KYC details for a Bank
router.post("/getapprovals", async (req, res) => {
	try {
		let data =
			req.body.bank == r3Corda.bankFromBlockchain
				? process.env.bankFirst || 50006
				: process.env.bankSec || 50033;

		let respFromCorda = await bankService.getUserDatafromCorda(data);
		if (!req.body.bank) {
			console.log("Front-end error");
		}
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
					message: { approved: [], pending: [] },
				});
			} else {
				respFromCorda = respFromCorda.message; // Bank's data

				let temp = [];

				for (let i = 0; i < respFromCorda.length; i++) {
					temp.push(respFromCorda[i].state.data);
				}

				let finalApproval = [],
					finalPending = [];

				for (let i = 0; i < r3Corda.portEmitterFromCorda.length; i++) {
					let respFromCordaFromUser = await userService.getUserDatafromCorda(
						r3Corda.portEmitterFromCorda[i]
					);

					let userEmail = r3Corda.emailFromCorda[i];

					respFromCordaFromUser = respFromCordaFromUser.message;

					if (
						respFromCordaFromUser != undefined &&
						respFromCordaFromUser.length == 0
					)
						continue;

					let temp1 = [];

					for (let j = 0; j < respFromCordaFromUser.length; j++) {
						temp1.push(respFromCordaFromUser[j].state.data);
					}

					if (temp1 == []) continue;

					let respData = await bankService.getApprovalLists(
						temp,
						temp1,
						userEmail
					);

					if (respData.success == false) {
						throw new Error({
							success: false,
							message: "Error in getApprovalLists service",
						});
					} else {
						finalApproval = [...finalApproval, ...respData.message.approved];
						finalPending = [...finalPending, ...respData.message.pending];

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

// Rejecting a users KYC
router.post("/reject", async (req, res) => {
	try {
		// whether this email already exists in corda
		// your email exists so you need to authorize only

		// Sent by the bank
		const { bank, email, aadhar, pan } = req.body;
		if (!bank || !email || !aadhar || !pan) {
			console.log("Pranav ke side se error");
		}
		let cordaData = {
			aadhar: aadhar,
			pan: pan,
			email: email,
			bank:
				bank == r3Corda.bankFromBlockchain
					? 50006 || process.env.bankFirst
					: 50033 || process.env.bankSec,
			partyName: "",
			approval: "reject",
		};

		let dataMongo = await userModel.findOne({ email: email });

		dataMongo = dataMongo.name;

		let partyName = await userService.getPartyNameFromCorda(dataMongo);
		if (partyName.success == false) {
			res.send({
				success: false,
				message: "Error in /reject route and partyName service",
			});
		} else {
			cordaData.partyName = partyName.message.me;


			let respFromCord = await bankService.sendBankDataToCorda(cordaData);

			if (respFromCord.success == false) {
				res.send({
					success: false,
					message: "Error in /kyc/reject and sendUserDataToCorda Service",
				});
			} else {
				res.send({ success: true, message: "Rejected for Kyc" });
			}
		}
	} catch (err) {
		res.send({ success: false, message: "Error in /reject" });
	}
});

// Creating the details for monitoring transactions
router.post("/createtrackingdetails", async (req, res) => {
	try {
		let { bank, typeOfTransaction, email } = req.body;

		let cordaData = {
			bank: bank, // Bank here is email
			typeOfTransaction: typeOfTransaction,
			email: email, // email
			port: process.env.tokenPort || 50073,
			partyName: "",
		};

		let partyName = await tokenService.getPartyNameFromCorda(cordaData);

		if (partyName.success == true) {
			cordaData.partyName = partyName.message.me;

			let resp = await tokenService.trackAndTrace(cordaData);

			if (resp.success == true) {
				res.send({ success: true, message: "Token Created successfully." });
			} else {
				res.send({ success: false, message: resp.message });
			}
		} else {
			res.send({ success: false, message: "Error in /createtokenroute" });
		}
	} catch (err) {
		res.send({ success: false, message: "Error in /trackandtrace" });
	}
});

// Getting the details for monitoring transactions
router.post("/getalltrackingdetails", async (req, res) => {
	try {
		let port = process.env.tokenPort || 50073;
		if (!req.body.email) {
			console.log("Front-end error");
		}
		let data = { port: port, bank: req.body.email };

		// let respForTracking = await tokenService.getAllTrackingDetails(data);
		let respForTracking = { success: true, message: fileData1 };
		if (respForTracking.success == true) {
			res.send({ success: true, message: respForTracking });
		} else {
			return {
				success: false,
				message: "Error in /util/getalltrackingdetails",
			};
		}
	} catch (err) {
		res.send({ success: false, message: "Error in /kyc/trackandtrace" });
	}
});

// Tracking a particular details
router.post("/trackandtrace", async (req, res) => {
	try {
		let data = {
			port: process.env.tokenPort || 50073,
			bankEmail: req.body.bankEmail,
			userEmail: req.body.userEmail,
		};
		if (!req.body.bankEmail || !req.body.userEmail) {
			console.log("Front-end error");
		}

		let totalResp = await tokenService.getAllTrackingDetails(data);
		let resp = await tokenService.getTrackingDetails(totalResp.message, data);

		if (resp.success == true) {
			res.send({ success: true, message: resp.message });
		} else {
			res.send({
				success: false,
				message: "Error in /trackandtrace om trackamdtrace service",
			});
		}
	} catch (err) {
		res.send({ success: false, message: "Error in /trackandtrace route" });
	}
});

module.exports = exports = {
	router,
};
