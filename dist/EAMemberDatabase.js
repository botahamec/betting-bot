"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
var Result;
(function (Result) {
    Result[Result["Ok"] = 0] = "Ok";
    Result[Result["Err"] = 1] = "Err";
})(Result = exports.Result || (exports.Result = {}));
class EAMemberJson {
    constructor(points, name) {
        this.points = points;
        this.name = name;
    }
}
class EAMember {
    constructor(id, points) {
        this.points = points;
        this.id = id;
    }
    static newMember(member) {
        return new EAMember(member.user.id, 1000);
    }
    static fromJson(json, server) {
        return new EAMember(json.name, json.points);
    }
    getPoints() {
        return this.points;
    }
    getId() {
        return this.id;
    }
    removePoints(points) {
        this.points -= points;
    }
    addPoints(points) {
        this.points += points;
    }
}
class MemberDatabase {
    constructor(members) {
        this.members = members;
    }
    static fromJson(json, server) {
        const membersJson = JSON.parse(json);
        const members = membersJson.map(member => EAMember.fromJson(member, server));
        const memberList = members.filter(member => member !== null);
        const memberMap = new Map();
        memberList.forEach(member => memberMap.set(member.getId(), member));
        return new MemberDatabase(memberMap);
    }
    toJson() {
        let memberList = [];
        this.members.forEach(member => memberList.push(member));
        const membersJson = memberList.map(member => new EAMemberJson(member.getPoints(), member.getId()));
        return JSON.stringify(membersJson);
    }
    toFile() {
        fs_1.writeFile(".member-data.json", this.toJson(), () => { });
    }
    static fromFileSync(filename, server) {
        const data = fs_1.readFileSync(filename).toString();
        const database = MemberDatabase.fromJson(data, server);
        console.log(database);
        return database;
    }
    newMember(member) {
        if (!this.members.has(member.user.id)) {
            this.members.set(member.user.id, EAMember.newMember(member));
            this.toFile();
            return Result.Ok;
        }
        else {
            return Result.Err;
        }
    }
    getPoints(name) {
        const member = this.members.get(name);
        if (member !== null && member !== undefined) {
            return member.getPoints();
        }
        else {
            return null;
        }
    }
    addPoints(name, points) {
        const member = this.members.get(name);
        if (member !== null && member !== undefined) {
            member.addPoints(points);
            this.toFile();
            return Result.Ok;
        }
        else {
            return Result.Err;
        }
    }
    removePoints(name, points) {
        const member = this.members.get(name);
        if (member !== null && member !== undefined) {
            member.removePoints(points);
            this.toFile();
            return Result.Ok;
        }
        else {
            return Result.Err;
        }
    }
    hasMember(id) {
        return this.members.has(id);
    }
    forEach(func) {
        this.members.forEach((_, key) => func(key));
    }
}
exports.MemberDatabase = MemberDatabase;
//# sourceMappingURL=EAMemberDatabase.js.map