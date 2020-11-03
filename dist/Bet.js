"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const EAMemberDatabase_1 = require("./EAMemberDatabase");
var WagerResult;
(function (WagerResult) {
    WagerResult[WagerResult["Ok"] = 0] = "Ok";
    WagerResult[WagerResult["BetMissingError"] = 1] = "BetMissingError";
    WagerResult[WagerResult["CandidateMissingError"] = 2] = "CandidateMissingError";
    WagerResult[WagerResult["BetLockedError"] = 3] = "BetLockedError";
})(WagerResult = exports.WagerResult || (exports.WagerResult = {}));
class Bet {
    constructor(wagers, candidates) {
        this.wagers = wagers;
        this.candiates = candidates;
        this.locked = false;
    }
    static new(candiates) {
        let candidateSet = new Set();
        candiates.forEach(candidate => candidateSet.add(candidate));
        return new Bet(new Map(), candidateSet);
    }
    toJson(name) {
        let wagerList = [];
        this.wagers.forEach((wager, userid, _) => wagerList.push(new WagerJson(userid, wager.getAmount(), wager.getCandidate())));
        let candidateList = [];
        this.candiates.forEach(candidate => candidateList.push(candidate));
        return new BetJson(name, wagerList, candidateList);
    }
    setWager(username, amount, candidate) {
        if (this.candiates.has(candidate)) {
            this.wagers.set(username, new Wager(candidate, amount));
            return EAMemberDatabase_1.Result.Ok;
        }
        else {
            return EAMemberDatabase_1.Result.Err;
        }
    }
    getWagerAmount(username) {
        const bet = this.wagers.get(username);
        if (bet === undefined) {
            return null;
        }
        else {
            return bet.getAmount();
        }
    }
    getWagerCandidate(username) {
        const bet = this.wagers.get(username);
        if (bet === undefined) {
            return null;
        }
        else {
            return bet.getCandidate();
        }
    }
    hasCandidate(candidate) {
        return this.candiates.has(candidate);
    }
    hasWagerFromUser(username) {
        return this.wagers.has(username);
    }
    lock() {
        this.locked = true;
    }
    isLocked() {
        return this.locked;
    }
}
class Wager {
    constructor(candidate, amount) {
        this.candidate = candidate;
        this.amount = amount;
    }
    getCandidate() {
        return this.candidate;
    }
    getAmount() {
        return this.amount;
    }
}
class WagerJson {
    constructor(username, amount, candidate) {
        this.username = username;
        this.amount = amount;
        this.candidate = candidate;
    }
}
class BetJson {
    constructor(name, wagers, candidates) {
        this.name = name;
        this.wagers = wagers;
        this.candidates = candidates;
    }
}
function getWagersMap(bet) {
    let wagerMap = new Map();
    bet.wagers.map(wager => wagerMap.set(wager.username, new Wager(wager.candidate, wager.amount)));
    return wagerMap;
}
function listToSet(list) {
    let set = new Set();
    list.map(element => set.add(element));
    return set;
}
function setToList(set) {
    let list = [];
    set.forEach(element => list.push(element));
    return list;
}
class BetDatabase {
    constructor(bets) {
        this.bets = bets;
    }
    static fromJson(json) {
        const object = JSON.parse(json);
        const bets = new Map();
        let candidateList = [];
        object.map(bet => bets.set(bet.name, new Bet(getWagersMap(bet), listToSet(bet.candidates))));
        return new BetDatabase(bets);
    }
    static fromFileSync(filename) {
        const data = fs_1.readFileSync(filename).toString();
        return BetDatabase.fromJson(data);
    }
    toJson() {
        let betList = [];
        this.bets.forEach((bet, name) => betList.push(bet.toJson(name)));
        return JSON.stringify(betList);
    }
    toFile() {
        fs_1.writeFile(".bet-data.json", this.toJson(), () => { });
    }
    betNames() {
        let names = [];
        this.bets.forEach((_, name) => names.push(name));
        return names;
    }
    addBet(name, candidates) {
        if (!this.bets.has(name)) {
            this.bets.set(name, Bet.new(candidates));
            this.toFile();
            return EAMemberDatabase_1.Result.Ok;
        }
        else {
            return EAMemberDatabase_1.Result.Err;
        }
    }
    removeBet(name) {
        if (this.bets.has(name)) {
            this.bets.delete(name);
            this.toFile();
            return EAMemberDatabase_1.Result.Ok;
        }
        else {
            return EAMemberDatabase_1.Result.Err;
        }
    }
    lockBet(name) {
        let bet = this.bets.get(name);
        if (bet !== null) {
            bet === null || bet === void 0 ? void 0 : bet.lock();
            return EAMemberDatabase_1.Result.Ok;
        }
        else {
            return EAMemberDatabase_1.Result.Err;
        }
    }
    endBet(bet, winner, members) {
        if (this.bets.has(bet)) {
            let totalBets = 0;
            let betsForCandidate = 0;
            members.forEach(name => {
                const wager = this.getWagerAmount(bet, name);
                const wagerCand = this.getWagerCandidate(bet, name);
                if (wager !== null) {
                    totalBets += wager;
                    if (wagerCand === winner) {
                        betsForCandidate += wager;
                    }
                }
            });
            members.forEach(name => {
                const candidate = this.getWagerCandidate(bet, name);
                if (candidate !== null) {
                    members.addPoints(name, (this.getWagerAmount(bet, name) / betsForCandidate) * totalBets);
                }
            });
            this.bets.delete(bet);
            this.toFile();
            return EAMemberDatabase_1.Result.Ok;
        }
        else {
            return EAMemberDatabase_1.Result.Err;
        }
    }
    setWager(bet, user, amount, candidate) {
        const betObj = this.bets.get(bet);
        if (betObj !== undefined) {
            if (betObj.hasCandidate(candidate)) {
                if (!betObj.isLocked()) {
                    betObj.setWager(user, amount, candidate);
                    this.toFile();
                    return WagerResult.Ok;
                }
                else {
                    return WagerResult.BetLockedError;
                }
            }
            else {
                return WagerResult.CandidateMissingError;
            }
        }
        else {
            return WagerResult.BetMissingError;
        }
    }
    getWagerAmount(bet, user) {
        const betObj = this.bets.get(bet);
        if (betObj !== undefined) {
            const wager = betObj.getWagerAmount(user);
            if (wager === null) {
                return 0;
            }
            else {
                return wager;
            }
        }
        else {
            return null;
        }
    }
    getWagerCandidate(bet, user) {
        const betObj = this.bets.get(bet);
        if (betObj !== undefined) {
            return betObj.getWagerCandidate(user);
        }
        else {
            return null;
        }
    }
    hasBet(bet) {
        return this.bets.has(bet);
    }
}
exports.BetDatabase = BetDatabase;
//# sourceMappingURL=Bet.js.map