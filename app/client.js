const dto = require("./dto");
const fs = require('fs');
// I do not know how it should be... but pretend we get this stub from config or elsewhere
var baseShipMap;
fs.readFile('./app/baseships.json', 'utf-8', function (error, data) {
    if (error)
        throw error;
    baseShipMap = data;
});


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
    this.send = function (command, value, cell, comment) {
        var package = new dto.DTO(command, value, cell, comment);
        that.connection.sendText(package.toString());
    }

    this.fire = function (x, y) {
        if (that.myTurn)
            that.send("fire", null, new dto.Cell(x, y));
    };

    this.sendReady = function (ready) {
        that.isReady = ready;
        that.send("ready", ready);
    };

    this.sendOpReady = function (ready) {
        that.send("op_ready", ready);
    };

    this.gotOponent = function (oponent) {
        that.send("oponent", oponent);
    }

    this.oponentDisconnected = function () {
        that.send("op_disconnect");
        that.sendOpReady(false);
    }

    this.canFire = function (isMyTurn) {
        that.myTurn = isMyTurn;
        that.send("canfire", isMyTurn);
    }

    this.startGame = function () {
        that.send("start");
    }

    this.missedMe = function (cell) {
        that.send("missed_me", cell);
    }

    this.missedOponent = function (cell) {
        that.send("missed", cell);
    }

    this.hitMe = function (cell) {
        that.send("hit_me", cell)
    }

    this.hitOponent = function (cell) {
        that.send("hit", cell)
    }

    this.addHistory = function (history) {
        if (history)
            that.fireHistory.splice(0, 0, history);
        that.send("history", !history ? that.fireHistory[0] : history)
    };

    this.finish = function (won) {
        that.send("finish", won);
        that.oponentId = "";
    }

    this.restore = function () {
        var restoreData = new dto.Restore(that.isReady, that.shipMap, that.fireHistory, that.oponentId);
        that.send("reconnect", restoreData);
        if (that.isReady)
            that.canFire(that.myTurn);
    }

    this.killed = function (ship) {
        that.fireHistory.splice(0, 0, new dto.FireHistory(null, false, true, ship));
        that.send("killed", ship);
        that.addHistory();

        var oponent = that.connection.server.storage.getClientById(that.oponentId);
        if (oponent) {
            oponent.fireHistory.splice(0, 0, new dto.FireHistory(null, false, false, ship));
            oponent.send("op_killed", ship);
            oponent.addHistory();
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
        var cells = [];
        that.shipMap = JSON.parse(baseShipMap).data;

        /*
        for (const i in that.shipMap) {
            if (that.shipMap.hasOwnProperty(i)) {
                const ship = that.shipMap[i];
                if (that.freeCells.length == 0) {
                    that.sendAutoMap();
                    return;
                }
                var built = false;
                while (!built) {
                    var kx = getRnd(1);
                    var x = kx == 0 ? getRnd(9) : getRnd(10 - ship.decklength);
                    var ky = kx == 0 ? 1 : 0;
                    var y = kx == 0 ? getRnd(10 - ship.decklength) : getRnd(9);
                    built = that.checkLocation(x, y, kx, ky, ship);
                }
                cells.push(ship.location);
            }
        }
        */

        that.shipMap.forEach(ship => {
            if (!that.prepareAutoMap(ship)) {
                that.sendAutoMap();
                return;
            }
            cells.push(ship.location);
        });
        that.send("autofill", cells);
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