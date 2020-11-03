"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const process_1 = require("process");
const fs_1 = require("fs");
const discord_js_1 = require("discord.js");
const fuse_js_1 = __importDefault(require("../node_modules/fuse.js/dist/fuse.js"));
const EAMemberDatabase_1 = require("./EAMemberDatabase");
const Bet_1 = require("./Bet");
const options = {
    findAllMatches: true,
    ignoreLocation: true,
    ignoreFieldNorm: true,
};
const client = new discord_js_1.Client(); // create bot
let commands = new Map();
let memberData;
let betData;
// Show that the bot is ready
client.on("ready", () => {
    if (client.user !== null) {
        console.log(`Logged in as ${client.user.tag}!`);
        const server = client.guilds.cache.array()[0];
        memberData = EAMemberDatabase_1.MemberDatabase.fromFileSync(".member-data.json", server);
        betData = Bet_1.BetDatabase.fromFileSync(".bet-data.json");
    }
    else {
        console.error("something went wrong");
        process_1.exit(1);
    }
});
// read for commands
client.on("message", (msg) => {
    if (msg.content[0] === "$") {
        const msgSplit = msg.content.split(" ");
        const command = msgSplit[0].split("$")[1];
        const args = msg.content.split(" ").slice(1, msgSplit.length);
        const action = commands.get(command);
        if (action != null) {
            action(msg, args, client);
        }
    }
});
// read token file and login
fs_1.readFile(".token", (err, data) => {
    if (err === null) {
        client.login(data.toString());
    }
    else {
        console.error("Failed to read token file");
        process_1.exit(1);
    }
});
// COMMANDS
function ping(msg, args) {
    const time = new Date(msg.createdTimestamp).getMilliseconds() - new Date().getMilliseconds();
    msg.channel.send(time + " ms");
}
function register(msg, args) {
    if (msg.member !== null) {
        const result = memberData.newMember(msg.member);
        if (result === EAMemberDatabase_1.Result.Ok) {
            msg.reply("You're now in my Altruist database. You've started off with " +
                memberData.getPoints(msg.member.user.id) +
                " Effectiveness Points");
        }
        else {
            msg.reply("You're already in my Altruist database.");
        }
    }
}
function balance(msg, args) {
    let memberName = msg.author.id;
    let points = memberData.getPoints(memberName);
    if (points !== null) {
        msg.reply("You have " + points + " Effectiveness Points");
    }
    else {
        msg.reply("You're not in my Altruist Database");
    }
}
function bets(msg, args) {
    const bets = betData.betNames();
    let betListString;
    let embed = new discord_js_1.MessageEmbed().setColor("BLUE");
    if (args.length === 0) {
        betListString = bets.join("\n");
        embed.setTitle("All Bets");
    }
    else {
        const fuse = new fuse_js_1.default(bets, options);
        betListString = fuse
            .search(args.join(" "))
            .map(element => element.item)
            .join("\n");
        embed.setTitle("Search Results - " + args.join(" "));
    }
    msg.reply(embed.setDescription(betListString));
}
function wager(msg, args) {
    if (args.length === 3) {
        try {
            const wager = Number.parseInt(args[1]);
            const bet = args[0];
            const candidate = args[2];
            const user = msg.author.id;
            if (memberData.hasMember(user)) {
                const prevWager = betData.getWagerAmount(bet, user);
                const wagerResult = betData.setWager(bet, user, wager, candidate);
                switch (wagerResult) {
                    case Bet_1.WagerResult.Ok:
                        console.log(memberData.getPoints(user));
                        console.log(betData.getWagerAmount(bet, user));
                        console.log(wager);
                        memberData.addPoints(user, prevWager - wager);
                        console.log(memberData.getPoints(user));
                        msg.reply("You have wagered " + wager + " Effectiveness Points on " + bet);
                        break;
                    case Bet_1.WagerResult.BetMissingError:
                        try {
                            Number.parseInt(bet);
                            msg.reply("usage: $wager bet_name wager_amount candidate");
                        }
                        catch (e) {
                            msg.reply("That bet does not exist");
                        }
                        break;
                    case Bet_1.WagerResult.CandidateMissingError:
                        try {
                            Number.parseInt(candidate);
                            msg.reply("usage: $wager bet_name wager_amount candidate");
                        }
                        catch (e) {
                            msg.reply("That candidate does not exist");
                        }
                        break;
                    case Bet_1.WagerResult.BetLockedError:
                        msg.reply("This bet is locked");
                        break;
                }
            }
            else {
                msg.reply("You're not in my Altruist database");
            }
        }
        catch (error) {
            msg.reply("Invalid wager amount");
        }
    }
    else {
        msg.reply("usage: $wager bet_name wager_amount candidate");
    }
}
function create_bet(msg, args) {
    if (msg.channel.id === "769312371549929502") {
        if (args.length > 1) {
            let addResult = betData.addBet(args[0], args.slice(1));
            if (addResult === EAMemberDatabase_1.Result.Ok) {
                msg.reply("The " + args[0] + " bet has been added");
            }
            else {
                msg.reply("That bet already exists");
            }
        }
        else {
            msg.reply("usage: $create_bet bet_name candidates");
        }
    }
    else {
        msg.reply("You can't do that");
    }
}
function lock_bet(msg, args) {
    if (msg.channel.id === "769312371549929502") {
        if (args.length === 1) {
            let lockResult = betData.lockBet(args[0]);
            if (lockResult === EAMemberDatabase_1.Result.Ok) {
                msg.reply("The " + args[0] + " bet has been locked");
            }
            else {
                msg.reply("That bet doesn't exists");
            }
        }
        else {
            msg.reply("usage: $create_bet bet_name candidates");
        }
    }
    else {
        msg.reply("You can't do that");
    }
}
function end_bet(msg, args) {
    if (msg.channel.id === "769312371549929502") {
        if (args.length === 2) {
            let endResult = betData.endBet(args[0], args[1], memberData);
            if (endResult === EAMemberDatabase_1.Result.Ok) {
                msg.reply("The " + args[0] + " bet has been ended. " + args[1] + " is the winner");
            }
            else {
                msg.reply("That bet doesn't exists");
            }
        }
        else {
            msg.reply("usage: $end_bet bet_name winner");
        }
    }
    else {
        msg.reply("You can't do that");
    }
}
function delete_bet(msg, args) {
    if (msg.channel.id === "769312371549929502") {
        if (args.length === 1) {
            let addResult = betData.removeBet(args[0]);
            if (addResult === EAMemberDatabase_1.Result.Ok) {
                msg.reply("The " + args[0] + " bet has been removed");
            }
            else {
                msg.reply("That bet doesn't exist");
            }
        }
        else {
            msg.reply("usage: $remove_bet bet_name");
        }
    }
    else {
        msg.reply("You can't do that");
    }
}
// ADD COMMANDS TO BOT
function addCommands(funcs) {
    function addCommand(func) {
        commands.set(func.name, func);
    }
    funcs.forEach(element => {
        addCommand(element);
    });
}
addCommands([ping, balance, register, create_bet, delete_bet, bets, wager, end_bet, lock_bet]);
//# sourceMappingURL=index.js.map