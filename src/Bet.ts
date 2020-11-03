import {readFileSync, writeFile} from "fs";

import {MemberDatabase, Result} from "./EAMemberDatabase";

export enum WagerResult {
	Ok,
	BetMissingError,
	CandidateMissingError,
	BetLockedError,
}

class Bet {
	private wagers: Map<string, Wager>;
	private candiates: Set<string>;
	private locked: boolean;

	public constructor(wagers: Map<string, Wager>, candidates: Set<string>) {
		this.wagers = wagers;
		this.candiates = candidates;
		this.locked = false;
	}

	public static new(candiates: string[]): Bet {
		let candidateSet = new Set<string>();
		candiates.forEach(candidate => candidateSet.add(candidate));
		return new Bet(new Map(), candidateSet);
	}

	public toJson(name: string): BetJson {
		let wagerList: WagerJson[] = [];
		this.wagers.forEach((wager, userid, _) =>
			wagerList.push(new WagerJson(userid, wager.getAmount(), wager.getCandidate()))
		);
		let candidateList: string[] = [];
		this.candiates.forEach(candidate => candidateList.push(candidate));
		return new BetJson(name, wagerList, candidateList);
	}

	public setWager(username: string, amount: number, candidate: string): Result {
		if (this.candiates.has(candidate)) {
			this.wagers.set(username, new Wager(candidate, amount));
			return Result.Ok;
		} else {
			return Result.Err;
		}
	}

	public getWagerAmount(username: string): number | null {
		const bet = this.wagers.get(username);
		if (bet === undefined) {
			return null;
		} else {
			return bet.getAmount();
		}
	}

	public getWagerCandidate(username: string): string | null {
		const bet = this.wagers.get(username);
		if (bet === undefined) {
			return null;
		} else {
			return bet.getCandidate();
		}
	}

	public hasCandidate(candidate: string): boolean {
		return this.candiates.has(candidate);
	}

	public hasWagerFromUser(username: string): boolean {
		return this.wagers.has(username);
	}

	public lock() {
		this.locked = true;
	}

	public isLocked() {
		return this.locked;
	}
}

class Wager {
	private candidate: string;
	private amount: number;

	public constructor(candidate: string, amount: number) {
		this.candidate = candidate;
		this.amount = amount;
	}

	public getCandidate(): string {
		return this.candidate;
	}

	public getAmount(): number {
		return this.amount;
	}
}

class WagerJson {
	public readonly username: string;
	public readonly amount: number;
	public readonly candidate: string;

	public constructor(username: string, amount: number, candidate: string) {
		this.username = username;
		this.amount = amount;
		this.candidate = candidate;
	}
}

class BetJson {
	public readonly name: string;
	public readonly wagers: WagerJson[];
	public readonly candidates: string[];

	public constructor(name: string, wagers: WagerJson[], candidates: string[]) {
		this.name = name;
		this.wagers = wagers;
		this.candidates = candidates;
	}
}

function getWagersMap(bet: BetJson): Map<string, Wager> {
	let wagerMap = new Map<string, Wager>();
	bet.wagers.map(wager => wagerMap.set(wager.username, new Wager(wager.candidate, wager.amount)));
	return wagerMap;
}

function listToSet<T>(list: T[]): Set<T> {
	let set: Set<T> = new Set();
	list.map(element => set.add(element));
	return set;
}

function setToList<T>(set: Set<T>): T[] {
	let list: T[] = [];
	set.forEach(element => list.push(element));
	return list;
}

export class BetDatabase {
	private bets: Map<string, Bet>;

	private constructor(bets: Map<string, Bet>) {
		this.bets = bets;
	}

	private static fromJson(json: string) {
		const object: BetJson[] = JSON.parse(json);
		const bets: Map<string, Bet> = new Map();
		let candidateList: string[] = [];
		object.map(bet => bets.set(bet.name, new Bet(getWagersMap(bet), listToSet(<string[]>bet.candidates))));
		return new BetDatabase(bets);
	}

	public static fromFileSync(filename: string): BetDatabase {
		const data = readFileSync(filename).toString();
		return BetDatabase.fromJson(data);
	}

	private toJson(): string {
		let betList: BetJson[] = [];
		this.bets.forEach((bet, name) => betList.push(bet.toJson(name)));
		return JSON.stringify(betList);
	}

	private toFile(): void {
		writeFile(".bet-data.json", this.toJson(), () => {});
	}

	public betNames(): string[] {
		let names: string[] = [];
		this.bets.forEach((_, name) => names.push(name));
		return names;
	}

	public addBet(name: string, candidates: string[]): Result {
		if (!this.bets.has(name)) {
			this.bets.set(name, Bet.new(candidates));
			this.toFile();
			return Result.Ok;
		} else {
			return Result.Err;
		}
	}

	public removeBet(name: string): Result {
		if (this.bets.has(name)) {
			this.bets.delete(name);
			this.toFile();
			return Result.Ok;
		} else {
			return Result.Err;
		}
	}

	public lockBet(name: string): Result {
		let bet = this.bets.get(name);
		if (bet !== null) {
			bet?.lock();
			return Result.Ok;
		} else {
			return Result.Err;
		}
	}

	public endBet(bet: string, winner: string, members: MemberDatabase): Result {
		if (this.bets.has(bet)) {
			let totalBets = 0;
			let betsForCandidate = 0;
			members.forEach(name => {
				const wager = this.getWagerAmount(bet, name);
				const wagerCand = this.getWagerCandidate(bet, name);
				if (wager !== null) {
					totalBets += wager;
					if (wagerCand === winner) {
						betsForCandidate += <number>wager;
					}
				}
			});
			members.forEach(name => {
				const candidate = this.getWagerCandidate(bet, name);
				if (candidate !== null) {
					members.addPoints(
						name,
						(<number>this.getWagerAmount(bet, name) / betsForCandidate) * totalBets
					);
				}
			});
			this.bets.delete(bet);
			this.toFile();
			return Result.Ok;
		} else {
			return Result.Err;
		}
	}

	public setWager(bet: string, user: string, amount: number, candidate: string): WagerResult {
		const betObj = this.bets.get(bet);
		if (betObj !== undefined) {
			if (betObj.hasCandidate(candidate)) {
				if (!betObj.isLocked()) {
					betObj.setWager(user, amount, candidate);
					this.toFile();
					return WagerResult.Ok;
				} else {
					return WagerResult.BetLockedError;
				}
			} else {
				return WagerResult.CandidateMissingError;
			}
		} else {
			return WagerResult.BetMissingError;
		}
	}

	public getWagerAmount(bet: string, user: string): number | null {
		const betObj = this.bets.get(bet);
		if (betObj !== undefined) {
			const wager = betObj.getWagerAmount(user);
			if (wager === null) {
				return 0;
			} else {
				return wager;
			}
		} else {
			return null;
		}
	}

	public getWagerCandidate(bet: string, user: string): string | null {
		const betObj = this.bets.get(bet);
		if (betObj !== undefined) {
			return betObj.getWagerCandidate(user);
		} else {
			return null;
		}
	}

	public hasBet(bet: string): boolean {
		return this.bets.has(bet);
	}
}
