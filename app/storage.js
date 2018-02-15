const cl = require("./client");
const dto = require("./dto");

function Storage() {
    var that = this;
    this.clients = [];
    this.games = [];

    this.addClient = function (connection, id) {
        var client = that.getClientById(id)
        if (!client) {
            console.log("Got new connected: " + connection.key + ". Player: " + id);
            client = new cl.Client(connection, id);
            that.clients.push(client);
        } else {
            console.log("Got re-connected: " + connection.key + ". Player: " + id);
            client.connection = connection;
        }


        return client;
    };

    this.getFreeClient = function (id) {
        var result = null;
        that.clients.forEach(client => {
            if (client.id != id && client.oponentId == "")
                result = client;
        });
        return result;
    };

    this.getClientById = function (id) {
        var result;
        that.clients.forEach(client => {
            if (client.id == id) {
                result = client;
                return;
            }
        })
        return result
    }

    this.removeClientById = function (id) {
        var toRemove = undefined
        for (const client in that.clients)
            if (client.id == id)
                toRemove = client;
        if (toRemove != undefined)
            that.clients.splice(that.clients.indexOf(toRemove), 1);
    }

    this.addGame = function (client) {
        var oponent = that.getClientById(client.oponentId);
        if (oponent == null) return false;
        var game = new dto.Game(client, oponent);
        that.games.push(game);
        return game;
    }

    this.getGame = function (clientId) {
        var result;
        that.games.forEach(game => { if (game.inGame(clientId)) result = game })
        return result;
    }

    this.startGame = function (client) {
        if (!client)
            return;
        var oponent;
        var game;
        if (client.oponentId == "") {
            oponent = that.getFreeClient(client.id)
            if (!oponent)
                return client;
            client.gotOponent(oponent.id);
            oponent.gotOponent(client.id);
            game = that.addGame(client);
        } else {
            oponent = that.getClientById(client.oponentId);
            if (!oponent) return;
        }
        client.sendReady(true);
        if (oponent == null)
            return;
        oponent.sendOpReady(true);
        if (!oponent.isReady)
            return;
        game = that.getGame(client.id);
        if (!game)
            return;
        game.clientOne.startGame();
        game.clientTwo.startGame();
        game.clientOne.canFire(game.clientOne.myTurn);
        game.clientTwo.canFire(!game.clientOne.myTurn);
    }

    this.finishGame = function (winner, loser) {
        var game = that.getGame(winner.id);
        if (!game)
            return;
        if (loser == undefined)
            loser = that.getClientById(winner.oponentId);
        winner.finish(true);
        loser.finish(false);
        that.removeGame(game);
    }

    this.removeGame = function (game) {
        that.games.splice(that.clients.indexOf(game), 1);
    }

    this.makeFire = function (from, to, cell) {
        if (!from || !from.myTurn || !to || !cell)
            return;
        var fromHistory = new dto.FireHistory(cell, true, true, false);
        var toHistory = new dto.FireHistory(cell, true, false, false);
        if (to.isMissed(cell)) {
            from.missedOponent(cell);
            from.canFire(false);
            to.missedMe(cell);
            to.canFire(true)
        } else {
            fromHistory.missed = false;
            toHistory.missed = false;
            to.hitMe(cell);
            from.hitOponent(cell);
        }
        to.addHistory(toHistory);
        from.addHistory(fromHistory);
    }
};

module.exports.Storage = Storage;