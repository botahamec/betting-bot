import {readFileSync, writeFile} from "fs";

import {Guild, GuildMember} from "discord.js";

export enum Result {
	Ok,
	Err,
}

class EAMemberJson {
	public readonly points: number;
	public readonly name: string;

	public constructor(points: number, name: string) {
		this.points = points;
		this.name = name;
	}
}

class EAMember {
	private points: number;
	private id: string;

	private constructor(id: string, points: number) {
		this.points = points;
		this.id = id;
	}

	public static newMember(member: GuildMember): EAMember {
		return new EAMember(member.user.id, 1_000);
	}

	public static fromJson(json: EAMemberJson, server: Guild): EAMember | null {
		return new EAMember(json.name, json.points);
	}

	public getPoints(): number {
		return this.points;
	}

	public getId(): string {
		return this.id;
	}

	public removePoints(points: number) {
		this.points -= points;
	}

	public addPoints(points: number) {
		this.points += points;
	}
}

export class MemberDatabase {
	private members: Map<string, EAMember>;

	private constructor(members: Map<string, EAMember>) {
		this.members = members;
	}

	private static fromJson(json: string, server: Guild): MemberDatabase {
		const membersJson: EAMemberJson[] = JSON.parse(json);
		const members = membersJson.map(member => EAMember.fromJson(member, server));

		const memberList = <EAMember[]>members.filter(member => member !== null);
		const memberMap = new Map<string, EAMember>();
		memberList.forEach(member => memberMap.set(member.getId(), member));

		return new MemberDatabase(memberMap);
	}

	private toJson(): string {
		let memberList: EAMember[] = [];
		this.members.forEach(member => memberList.push(member));
		const membersJson: EAMemberJson[] = memberList.map(
			member => new EAMemberJson(member.getPoints(), member.getId())
		);
		return JSON.stringify(membersJson);
	}

	private toFile(): void {
		writeFile(".member-data.json", this.toJson(), () => {});
	}

	public static fromFileSync(filename: string, server: Guild): MemberDatabase {
		const data = readFileSync(filename).toString();
		const database = MemberDatabase.fromJson(data, server);
		console.log(database);
		return database;
	}

	public newMember(member: GuildMember): Result {
		if (!this.members.has(member.user.id)) {
			this.members.set(member.user.id, EAMember.newMember(member));
			this.toFile();
			return Result.Ok;
		} else {
			return Result.Err;
		}
	}

	public getPoints(name: string): number | null {
		const member = this.members.get(name);
		if (member !== null && member !== undefined) {
			return member.getPoints();
		} else {
			return null;
		}
	}

	public addPoints(name: string, points: number): Result {
		const member = this.members.get(name);
		if (member !== null && member !== undefined) {
			member.addPoints(points);
			this.toFile();
			return Result.Ok;
		} else {
			return Result.Err;
		}
	}

	public removePoints(name: string, points: number): Result {
		const member = this.members.get(name);
		if (member !== null && member !== undefined) {
			member.removePoints(points);
			this.toFile();
			return Result.Ok;
		} else {
			return Result.Err;
		}
	}

	public hasMember(id: string): boolean {
		return this.members.has(id);
	}

	public forEach(func: (name: string) => void): void {
		this.members.forEach((_, key) => func(key));
	}
}
