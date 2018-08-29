import axios from 'axios';
import * as firebase from 'firebase/app';
import 'firebase/auth';
import firebaseConfig from './firebaseConfig';
firebase.initializeApp(firebaseConfig);

var domain = 'https://www.mobileads.com';
var apiDomain = 'https://api.mobileads.com';
// var domain = 'http://192.168.99.100';
var userCollection = 'FamilyMartUsers';
var couponCollection = 'FamilyMartCoupons';
var functionsDomain = 'https://us-central1-familymarto2o.cloudfunctions.net/twitter';

var campaignId = 'e32e385370b2e04d225d2dfa5497483b';
var adUserId = '4831';
var rmaId = '2';
var generalUrl = 'https://track.richmediaads.com/a/analytic.htm?rmaId={{rmaId}}&domainId=0&pageLoadId={{cb}}&userId={{adUserId}}&pubUserId=0&campaignId={{campaignId}}&callback=trackSuccess&type={{type}}&value={{value}}&uniqueId={{userId}}';

var trackingUrl = generalUrl.replace('{{rmaId}}', rmaId).replace('{{campaignId}}', campaignId).replace('{{adUserId}}', adUserId).replace('{{cb}}', Date.now().toString());

var user = {
	isWanderer: false,
	source: '',
	twitter: {
		token: '',
		secret: ''
	},
	info: {
		Answers: '',
		couponCode: '',
		id: '',
		noQuestionAnswered: 0,
		state: '-'
	},
	get: function(userId) {
		/* this is using the old mysql database. Not using Now */
	    return axios.get(apiDomain + '/coupons/user_info', {
	      params: {
	        id: userId
	      }
	    });
	},
	register: function(userId) {
		return axios.post(apiDomain + '/coupons/user_register?id=' + userId);
	},
	trackRegister: function(userId) {
    // track as impression
	    if (window.location.hostname.indexOf('localhost') < 0) {
		    var type = 'page_view';
			var url = trackingUrl.replace('{{type}}', type).replace('{{value}}', '').replace('{{userId}}', userId);
			return axios.get(url);
	    }
	},
	sendEmail: function(email, subjectTitle, content) {
	  	var formData = new FormData();
	    formData.append('sender', 'Couponcampaign.ienomistyle.com');
	    formData.append('subject', subjectTitle);
	    formData.append('recipient', email);
	    formData.append('content', content);
	    axios.post(domain + '/mail/send', formData, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }).then(function(resp) {
	      console.log(resp);
	    }).catch(function(error) {
	      console.log(error);
	    });
	},
	registerTwitter: function() {
		console.log('registerTwitter');
		var provider = new firebase.auth.TwitterAuthProvider();
		return firebase.auth().signInWithPopup(provider);
	},
	isFollowingTwitter: function() {
		return axios.post(functionsDomain + '/checkFriendship', {
	        token: this.twitter.token,
	        tokenSecret: this.twitter.secret,
	        id: this.info.id
	    });
	},
	followTwitter: function() {
		return axios.post(functionsDomain + '/followUs', {
	        token: this.twitter.token,
	        tokenSecret: this.twitter.secret
	    });
	},
	messageTwitter: function(message) {
		return axios.post(functionsDomain + '/sendMessage', {
		    token: this.twitter.token,
		    tokenSecret: this.twitter.secret,
		    recipientId: this.info.id,
		    text: message
		});
	},
	saveAnswer: function(userId, answer) {
		/* this is using the old mysql database. Not using Now */
		/*var ansForm = new FormData();
    ansForm.append('id', userId);
    ansForm.append('questionNo', questionNo);
    ansForm.append('answer', answer)
    return axios.post(domain + '/api/coupon/softbank/user_answer_save', ansForm, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });*/

    /* mongoDB */
    var userQuery = JSON.stringify({
			id: userId
		});

		var updateAnswer = JSON.stringify({
			Answers: answer,
			noQuestionAnswered: answer.length - 1
		});
    axios.post('https://api.mobileads.com/mgd/updOne?col=' + userCollection + '&qobj=' + encodeURIComponent(userQuery) + '&uobj=' + encodeURIComponent(updateAnswer))
    .then((response) => {
			if (response.data.status == 'success') {
				console.log('answers saved to database');
			}
    }).catch((error) => {
			console.error(error);
    });
	},
	trackAnswer: function(userId, questionNo, answer) {
		if (window.location.hostname.indexOf('localhost') < 0) {
			var type = 'q_a';
			var value = 'q' + questionNo.toString() + '_' + encodeURIComponent(answer);
			var url = trackingUrl.replace('{{type}}', type).replace('{{value}}', value).replace('{{userId}}', userId);
			return axios.get(url);
	  }
	},
	mark: function(userId, state, groups) {
		var groupJSON = JSON.stringify(groups);
		console.log(groupJSON);
		return axios.post(apiDomain + '/coupons/mark_user?id=' + userId + '&state=' + state + '&groups=' + groupJSON);
	},
	win: function(userId, couponInfo) {
		return new Promise(function(resolve, reject) {
			// redeem coupon
			var uQuery = JSON.stringify({
				_id: couponInfo._id
			});
			var updateCoupon = JSON.stringify({
				redeemed: true,
				owner: userId
			});

			axios.post('https://api.mobileads.com/mgd/updOne?col=FamilyMartCoupons&qobj=' + encodeURIComponent(uQuery) + '&uobj=' + encodeURIComponent(updateCoupon))
			.then((resp) => {
				if (resp.data.status == 'success') { //coupon redeemed, update user as winner
					var userQuery = JSON.stringify({
						id: userId
					});

					var updateState = JSON.stringify({
						state: 'win',
						couponCode: couponInfo.couponCode
					});

				    axios.post('https://api.mobileads.com/mgd/updOne?col=testCol2&qobj=' + encodeURIComponent(userQuery) + '&uobj=' + encodeURIComponent(updateState))
				    .then((res) => {
						if (resp.data.status == 'success') {
							resolve({
								data: {
									couponCode: couponInfo.couponCode,
									message: "marked.",
									status:true
								}
							});
						}
				    }).catch((err) => {
						console.error(err);
						reject({
							data: {
								message: 'error',
								status: false
							}
						});
				    });
							
				}
				else {
					reject({
						data: {
							message: 'error',
							status: false
						}
					});
				}
			}).catch((err) => {
				console.error(error);
				reject({
					data: {
						message: 'error',
						status: false
					}
				});
		    });
		});
	},
	trackWin: function(userId, value) {
		if (window.location.hostname.indexOf('localhost') < 0) {
			var type = 'win';
			if (value) {
				var url = trackingUrl.replace('{{type}}', type).replace('{{value}}', value).replace('{{userId}}', userId);
			}
			else {
				var url = trackingUrl.replace('{{type}}', type).replace('{{value}}', '').replace('{{userId}}', userId);
			}
			url += '&tt=E&ty=E';
			return axios.get(url);
		}
	},
	trackLose: function(userId) {
		if (window.location.hostname.indexOf('localhost') < 0) {
			var type = 'lose';
			var url = trackingUrl.replace('{{type}}', type).replace('{{value}}', '').replace('{{userId}}', userId);
			url += '&tt=E&ty=E';
			return axios.get(url);
		}
	},
	lose: function(userId, source) {
		var userQuery = JSON.stringify({
			id: userId
		});
		var updateState = JSON.stringify({
			state: 'lose',
		});
		return new Promise(function(resolve, reject) {
			axios.post('https://api.mobileads.com/mgd/updOne?col=testCol2&qobj=' + encodeURIComponent(userQuery) + '&uobj=' + encodeURIComponent(updateState))
	    .then((response) => {
				if (response.data.status == 'success') {
					resolve({
						data: {
							message: "marked.",
							status:true
						}
					});
				}
				else {
					reject({
						data: {
							message: "error during mark",
							status:true
						}
					});
				}
	    }).catch((error) => {
				console.error(error);
				reject({
					data: {
						message: "error during mark",
						status:true
					}
				});
	    });
	  });
	},
	passResult: function(userId, flag, source, couponLink) { // flag: 1 = win, 0 = lose
		var psForm = new FormData();
		psForm.append('user_id', userId);
		psForm.append('flag', flag);
	    psForm.append('campaign_id', 'ca8ca8c34a363fa07b2d38d007ca55c6');
		psForm.append('source', source);
		if (couponLink) {
			psForm.append('coupon_url', encodeURIComponent(couponLink));
		}
		return axios.post(domain + '/api/coupon/softbank/api_call', psForm, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
	},
	saveLocal: function(userId, couponCode, state) {
		window.localStorage.setItem('localUser', userId);
		window.localStorage.setItem('localCoupon', couponCode);
		window.localStorage.setItem('localState', state);
	},
	loadLocal: function() {
		if (window.localStorage.getItem('localUser')) {
			user.info.id = window.localStorage.getItem('localUser');
			user.info.couponCode = window.localStorage.getItem('localCoupon');
			user.info.state = window.localStorage.getItem('localState');
		}
	},
	clearLocal: function() {
		window.localStorage.removeItem('localUser');
		window.localStorage.removeItem('localCoupon');
		window.localStorage.removeItem('localState');	
		window.localStorage.removeItem('localAnswers');	
	}
};

export default user;