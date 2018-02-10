function Game(clientOne, clientTwo) {
    this.clientOne = clientOne;
    this.clientTwo = clientTwo;
    this.winner = "";
    this.started = false;
    this.watingForPlayers = true;
    this.toString = function () { return JSON.stringify(this); }
    this.inGame = function (id) { return clientOne.id == id || clientTwo.id == id; }
}

function DTO(type, value, cell, comment) {
    this.type = type;
    this.value = value;
    this.cell = cell;
    this.comment = comment;
    this.toString = function () { return JSON.stringify(this); }
}

function Cell(x, y, type, value) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.value = value;
    this.toString = function () { return JSON.stringify(this); }
};

function FireHistory(cell, missed, mine, ship) {
    this.cell = cell;
    this.missed = missed;
    this.mine = mine;
    this.ship = ship;
    this.toString = function () { return JSON.stringify(this); }
}

function Restore(isReady,shipMap, history, oponentId) {
    this.isReady = isReady;
    this.shipMap = shipMap;
    this.history = history;
    this.oponentId = oponentId;
    this.toString = function () { return JSON.stringify(this); }
}

module.exports.DTO = DTO
module.exports.Cell = Cell
module.exports.FireHistory = FireHistory
module.exports.Game = Game
module.exports.Restore = Restore