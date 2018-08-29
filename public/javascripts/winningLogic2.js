var winningLogic = {
	winLogic: {
    '3': {
      // value: 'ローソン',
      value: ['ローソン', 'セブン・イレブン', 'ファミリーマート'],
      priority: [2, 2, 2]
    }
/*    '6': {
      value: ['セブン-イレブン', 'ローソン'],
      priority: [2, 3] // smaller number means higher priority.
    }*/
		/*'5': {
			value: ['ほぼ毎日', '週４〜５回', '週２〜３回'],
			priority: [2, 3, 4] 
		},*/
	},
	loseLogic: {
		/*'6': {
			value: '月１回未満',
			priority: 1
		}*/
	},
  processed: false,
  eligibility: [], // store eligible win
	process: function(questions, considerGroup) {
		var winPrio = 20;
		var losePrio = 10;
    for (var w in this.winLogic) {
    	var no = parseInt(w);
    	if (typeof this.winLogic[w].value === 'string') {
				if (questions[no].selectedAnswer.indexOf(this.winLogic[w].value) > -1) {
					winPrio = winPrio > this.winLogic[w].priority ? this.winLogic[w].priority : winPrio;
          this.eligibility.push(this.winLogic[w].priority);
				}
    	}
    	else {
    		for (var v = 0; v < this.winLogic[w].value.length; v++) {
    			if (questions[no].selectedAnswer.indexOf(this.winLogic[w].value[v]) > -1) {
            winPrio = winPrio > this.winLogic[w].priority[v] ? this.winLogic[w].priority[v] : winPrio;
            this.eligibility.push(this.winLogic[w].priority[v]);
    			}
    		}
    	}
    }

    for (var l in this.loseLogic) {
    	var n = parseInt(l);
    	if (typeof this.loseLogic[l].value === 'string') {
    		if (questions[n].selectedAnswer.indexOf(this.loseLogic[l].value) > -1) {
    			losePrio = losePrio > this.loseLogic[l].priority ? this.loseLogic[l].priority : losePrio;
    		}
    	}
    	else {
    		for (var u = 0; u < this.loseLogic[l].value.length; u++) {
    			if (questions[n].selectedAnswer.indexOf(this.loseLogic[l].value[u]) > -1) {
    				losePrio = losePrio > this.loseLogic[l].priority[u] ? this.loseLogic[l].priority[u] : losePrio;
    			}
    		}
    	}
    }
    return new Promise((resolve, reject) => {
      var groups = ['','','A']; // array index follow priority. e.g. for win priority 2, the corresponding group has to be groups[2]
      var group = 'NA';
      var actualResult = 'lose' // result to be stored to db via /mark_user, also shown in result page
      var couponInfo = {};

      if (winPrio < losePrio) {
        actualResult = 'win';

        if (!considerGroup) {
          resolve({
            actualResult: actualResult,
            group: group
          });
        }
        else {
            group = groups[winPrio];
            var eGroup = [];

            /* eligible group that still has coupons will be in eGroup */
            for (var e = 0; e < this.eligibility.length; e++) {
              eGroup.push(groups[this.eligibility[e]]);
            }

            if (eGroup.length > 0) {
              eGroup.sort((a, b) => a - b) // For ascending sort
              group = groups[eGroup[0]]; // pick the first priority
            }
            else { // mark as lose if got error
              console.log('grouping logic error')
              actualResult = "lose";
            }

            resolve({
              actualResult: actualResult,
              group: eGroup,
            });
        }
      }
      else { // user lose
        resolve({
          actualResult: actualResult,
          group: group,
        });
      }
    });
  }
}

export default winningLogic