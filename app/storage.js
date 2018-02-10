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

        if (client.oponentId == "") {
            var oponent = that.getFreeClient(client.id)
            if (!oponent)
                return client;
            client.oponentId = oponent.id;
            oponent.oponentId = client.id;
            that.addGame(client);
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
    }

    this.getGame = function (clientId) {
        var result;
        that.games.forEach(game => { if (game.inGame(clientId)) result = game })
        return result;
    }

    this.startGame = function (game) {
        game.clientOne.startGame();
        game.clientTwo.startGame();
        game.clientOne.canFire(game.clientOne.myTurn);
        game.clientTwo.canFire(!game.clientOne.myTurn);
    }

    this.finishGame = function (winner, loser) {
        var game = that.getGame(winner.id);
        if (!game) return;
        winner.finish(true);
        winner.canFire = false;
        winner.isReady = false;
        if (loser == undefined)
            loser = that.getClientById(winner.oponentId);
        loser.finish(false);
        loser.canFire = false;
        loser.isReady = false;
        that.removeGame(game);
    }

    this.removeGame = function (game) {
        that.games.splice(that.clients.indexOf(game), 1);
    }
};

module.exports.Storage = Storage;