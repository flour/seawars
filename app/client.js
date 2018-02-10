const dto = require("./dto");

function getRnd(max) {
    return Math.floor(Math.random() * (max + 1));
}

function Client(connection, id) {
    var that = this;
    this.id = id;
    this.connection = connection;
    this.oponentId = "";
    this.isReady = false;
    this.myTurn = false;
    this.fireHistory = [];
    this.freeCells = [];
    this.shipMap = [];

    this.setConnection = function (connection) { that.connection = connection }
    this.fire = function (x, y) { if (that.myTurn) connection.sendText(new dto.DTO("fire", 0, new dto.Cell(x, y), "fire in the hotel!").toString()); };
    this.sendReady = function (ready) { that.isReady = ready; that.connection.sendText(new dto.DTO("ready", ready, null, "ready state").toString()); };
    this.sendOpReady = function (ready) { that.connection.sendText(new dto.DTO("op_ready", ready, null, "ready state").toString()); };
    this.gotOponent = function (oponent) { that.connection.sendText(new dto.DTO("oponent", oponent).toString()) }
    this.oponentDisconnected = function () { that.connection.sendText(new dto.DTO("op_disconnect").toString()); that.sendOpReady(false); }
    this.canFire = function (value) { that.myTurn = value; that.connection.sendText(new dto.DTO("canfire", value).toString()) }
    this.startGame = function () { that.connection.sendText(new dto.DTO("start").toString()) }
    this.missedMe = function (cell) { that.connection.sendText(new dto.DTO("missed_me", cell).toString()) }
    this.missedOponent = function (cell) { that.connection.sendText(new dto.DTO("missed", cell).toString()) }
    this.hitMe = function (cell) { that.connection.sendText(new dto.DTO("hit_me", cell).toString()) }
    this.hitOponent = function (cell) { that.connection.sendText(new dto.DTO("hit", cell).toString()) }
    this.sendHistory = function () { that.connection.sendText(new dto.DTO("history", that.fireHistory[0]).toString()) };
    this.finish = function (won) { that.connection.sendText(new dto.DTO("finish", won).toString()); that.oponentId = ""; }
    this.restore = function () {
        that.connection.sendText(
            new dto.DTO("reconnect",
                new dto.Restore(that.isReady, that.shipMap, that.fireHistory, that.oponentId)).toString()
        )
        if (that.isReady) that.canFire(that.myTurn);
    }
    this.killed = function (ship) {
        that.fireHistory.splice(0, 0, new dto.FireHistory(null, false, true, ship));
        that.connection.sendText(new dto.DTO("killed", ship).toString())
        that.sendHistory();

        var oponent = that.connection.server.storage.getClientById(that.oponentId);
        if (oponent) {
            oponent.fireHistory.splice(0, 0, new dto.FireHistory(null, false, false, ship));
            oponent.connection.sendText(new dto.DTO("op_killed", ship).toString())
            oponent.sendHistory();
        }
        that.checkShips()
    }
    
    this.isMissed = function (cell) {
        var missed = true;
        if (cell == undefined)
            return missed;
        that.shipMap.forEach(ship => {
            if (ship.state == "destroyed")
                return
            ship.location[0].forEach(shipCell => {
                if (shipCell.x == cell.x && shipCell.y == cell.y) {
                    missed = false;
                    shipCell.value = "hit";
                }
            })
            if (!missed) {
                var decklength = ship.decklength;
                for (let i = 0; i < ship.location[0].length; i++) {
                    decklength -= ship.location[0][i].value == "hit" ? 1 : 0;
                }
                if (decklength == 0) {
                    ship.state = "destroyed"
                    that.killed(ship)
                }
            }
        })
        return missed;
    }

    this.checkShips = function () {
        var result;
        that.shipMap.forEach(ship => { if (ship.state != "destroyed") { result = ship; return; } })
        if (result == undefined) {
            that.connection.server.storage.finishGame(that.connection.server.storage.getClientById(that.oponentId));
        }
    }

    this.sendAutoMap = function () {
        if (that.isReady) return;
        that.freeCells = [];
        for (let i = 0; i < 10; i++) {
            for (let j = 0; j < 10; j++) {
                that.freeCells.push(new dto.Cell(i, j).toString());
            }
        }
        that.shipMap = [
            { name: "four-deck", decklength: 4, state: "infight", location: [] },
            { name: "three-deck-1", decklength: 3, state: "infight", location: [] },
            { name: "three-deck-2", decklength: 3, state: "infight", location: [] },
            { name: "two-deck-1", decklength: 2, state: "infight", location: [] },
            { name: "two-deck-2", decklength: 2, state: "infight", location: [] },
            { name: "two-deck-3", decklength: 2, state: "infight", location: [] },
            { name: "one-deck-1", decklength: 1, state: "infight", location: [] },
            { name: "one-deck-2", decklength: 1, state: "infight", location: [] },
            { name: "one-deck-3", decklength: 1, state: "infight", location: [] },
            { name: "one-deck-4", decklength: 1, state: "infight", location: [] }
        ];
        var cells = [];
        that.shipMap.forEach(ship => {
            if (!that.prepareAutoMap(ship)) {
                that.sendAutoMap();
                return;
            }
            cells.push(ship.location);
        });
        that.connection.sendText(new dto.DTO("autofill", cells).toString());
    };

    this.prepareAutoMap = function (ship) {
        do {
            if (that.freeCells.length == 0)
                return false;
            var kx = getRnd(1);
            var x = kx == 0 ? getRnd(9) : getRnd(10 - ship.decklength);
            var ky = kx == 0 ? 1 : 0;
            var y = kx == 0 ? getRnd(10 - ship.decklength) : getRnd(9);
        } while (!that.checkLocation(x, y, kx, ky, ship));
        return true;
    };

    this.checkLocation = function (x, y, kx, ky, ship) {
        var shipCells = [];
        var decklength = ship.decklength;
        var rX, rY, fromX, toX, fromY, toY;
        fromX = (x == 0) ? x : x - 1;
        if (x + kx * decklength == 10 && kx == 1) { toX = x + kx * decklength; rX = toX; }
        else if (x + kx * decklength < 10 && kx == 1) { toX = x + kx * decklength + 1; rX = toX - 1; }
        else if (x == 9 && kx == 0) { toX = x + 1; rX = toX; }
        else if (x < 9 && kx == 0) { toX = x + 2; rX = toX - 1; }

        fromY = (y == 0) ? y : y - 1;
        if (y + ky * decklength == 10 && ky == 1) { toY = y + ky * decklength; rY = toY; }
        else if (y + ky * decklength < 10 && ky == 1) { toY = y + ky * decklength + 1; rY = toY - 1; }
        else if (y == 9 && ky == 0) { toY = y + 1; rY = toY; }
        else if (y < 9 && ky == 0) { toY = y + 2; rY = toY - 1; }

        for (let i = x; i < rX; i++) {
            for (let j = y; j < rY; j++) {
                var cell = new dto.Cell(i, j);
                if (that.freeCells.indexOf(cell.toString()) < 0)
                    return false;
                shipCells.push(cell);
            }
        }

        for (let i = fromX; i < toX; i++) {
            for (let j = fromY; j < toY; j++) {
                that.freeCells.splice(that.freeCells.indexOf(new dto.Cell(i, j).toString()), 1);
            }
        }

        ship.location.push(shipCells);
        return true;
    };
};

module.exports.Client = Client;