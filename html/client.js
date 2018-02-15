var socket;
var state;

function a(data, comments) {
    console.log(data, comments);
    $("#message").html(data);
    if (comments != undefined) {
        $("#messageComment").show();
        $("#messageComment").html(comments);
    }
    else
        $("#messageComment").hide();
    $("#appAlert").show();
};

function b(data, comments) {
    console.log(data, comments);
    $("#isReadeData").html(data);
    if (comments != undefined) {
        $("#isReadyComment").show();
        $("#isReadyComment").html(comments);
    }
    else
        $("#isReadyComment").hide();
    $("#isReady").show();
}

// GUID
function uuidv4() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    )
}


// cookies
function setCookie(cname, cvalue, exdays) {
    var date = new Date();
    date.setTime(date.getTime() + (exdays * 24 * 60 * 60 * 1000));
    var expires = "expires=" + date.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
    var name = cname + "=";
    var cookies = document.cookie.split(';');
    for (var i = 0; i < cookies.length; i++) {
        var cook = cookies[i];
        while (cook.charAt(0) == ' ') {
            cook = cook.substring(1);
        }
        if (cook.indexOf(name) == 0) {
            return cook.substring(name.length, cook.length);
        }
    }
    return "";
}

// I hope that type can be shared...
// nope.
function DTO(type, value, cell, comment) {
    this.id = getCookie("identity");
    this.type = type;
    this.value = value;
    this.cell = cell;
    this.comment = comment;
    this.toString = function () { return JSON.stringify(this); }
}

function Cell(x, y) {
    this.x = x;
    this.y = y;
    this.toString = function () { return JSON.stringify(this); }
};

function clientState() {
    var that = this
    this.socket;
    this.isReady = false;
    this.oponentId;
    this.oponentIsReady = false;
    this.canfire = false;
    this.finished = false;
    this.reConnectAttemps = 0;
    this.reconnecting = false;
    this.map = [];

    this.connect = function () {
        if (that.reconnecting)
            that.reConnectAttemps + 1;
        that.socket = new WebSocket("ws://localhost:55555/ws?" + getCookie("identity"));
        that.socket.onopen = that.onopen;
        that.socket.onclose = that.onclose;
        that.socket.onerror = that.onerror;
        that.socket.onmessage = that.onmessage;
    }

    this.onopen = function () {
        a("Connected to server...");
        if (that.socket.isReady == 1 && that.reConnectAttemps > 0) {
            that.sendParam(new DTO("reconnect", { id: getCookie("identity"), oponentId: that.oponentId }).toString());
        } else {
            that.sendParam(new DTO("connect", { id: getCookie("identity") }).toString());
        }
        that.reConnectAttemps = 0;
    }

    this.onclose = function (event) {
        var reconnect = false;
        var message = 'Code: ' + event.code + ' reason: ' + (event.reason == "" ? "unknown" : event.reason)
        if (event.wasClean) {
            a(message, "Connection gracefuly closed.");
        } else if (that.reConnectAttemps == 0) {
            that.reconnecting = true;
            a(message, "No connection. Server if off.");
        } else if (that.reConnectAttemps > 0) {
            that.reconnecting = true;
            a(message, "No connection. Re-connection attemp #" + that.reConnectAttemps);
        }
        if (that.reconnecting)
            that.connect();
    }

    this.onerror = function (error) {
        a("WS error: " + error);
    }

    this.onmessage = function (event) {
        var data = JSON.parse(event.data);
        if (data == undefined)
            return;
        a("Got data " + event.data.length + " bytes", "Command: " + data.type);
        switch (data.type) {
            case "start":
                b("Game begun", "You are ready to play");
                break;
            case "map":
                break;
            case "state":
                break;
            case "oponent":
                that.oponentId = data.value;
                break;
            case "op_disconnect":
                that.canfire = false;
                a("Your oponent disconnected", "Wait for 10 seconds...");
                break;
            case "canfire":
                that.showCanFire(data.value);
                break;
            case "missed":
                $("#cell_" + (data.value.x + 1) + "_" + (data.value.y + 1) + "_op").attr("class", "missedCell");
                break;
            case "hit":
                $("#cell_" + (data.value.x + 1) + "_" + (data.value.y + 1) + "_op").attr("class", "hitCell");
                break;
            case "missed_me":
                $("#cell_" + (data.value.x + 1) + "_" + (data.value.y + 1)).attr("class", "missedCell");
                break;
            case "hit_me":
                $("#cell_" + (data.value.x + 1) + "_" + (data.value.y + 1)).attr("class", "hitCell");
                break;
            case "killed":
                // mark fields
                break;
            case "op_killed":
                // mark fields
                break;
            case "ready":
                that.isReady = true;
                $("#autoFill").hide();
                $("#sayReady").hide();
                $("#isReady").show();
                break;
            case "op_ready":
                that.oponentIsReady = data.value;
                $("#opReady").show();
                break;
            case "history":
                that.addHistory(data.value);
                break;
            case "reconnect":
                that.restore(data.value.isReady, data.value.oponentId, data.value.shipMap, data.value.history);
                break;
            case "finish":
                that.finished = true;
                that.showFinish(data.value);
                break;
            case "autofill":
                that.addShips(data.value);
                break;
            default:
                break;
        }
    }

    this.restore = function (wasReady, oponentId, shipMap, history) {
        that.isReady = wasReady;
        that.oponentId = oponentId == undefined ? "" : oponentId;
        if (that.isReady) {
            that.addShips(shipMap);
            $("#autoFill").hide();
            $("#sayReady").hide();
            $("#isReady").show();
        }
        if (history && that.isReady) {
            that.oponentIsReady = true;
            history.reverse().forEach(row => that.addHistory(row))
        }
        if (shipMap.length == 0)
            that.init(!that.isReady && that.oponentId == "");
    }

    this.showCanFire = function (canFire) {
        if (that.oponentId == "") {
            that.canfire = false;
            return;
        }
        that.canfire = canFire == undefined ? false : canFire;
        if (that.canfire) {
            $("#yourTurn").show();
            $("#opTurn").hide();
        } else {
            $("#yourTurn").hide();
            $("#opTurn").show();
        }
    }

    this.showFinish = function (hasWon) {
        $(hasWon ? "#won" : "#lost").show();
        $("#isReady").hide();
        $("#opReady").hide();
        $("#yourTurn").hide();
        $("#opTurn").hide();
        $("#startAgain").show();
    }

    this.addHistory = function (history) {
        var row = "";
        var type = history.mine ? "success" : "warning";
        if (history.cell) {
            var text = "Fired to (" + String.fromCharCode(97 + history.cell.y).toUpperCase() + ":" + (history.cell.x + 1) + ") and " + (history.missed ? "missed" : "hit")
            row += '<div class="alert-' + type + ' history">' + text + '</div>';

            $("#cell_" + (history.cell.x + 1) + "_" + (history.cell.y + 1) + (history.mine ? "_op" : "")).attr("class", history.missed ? "missedCell" : "hitCell");
        }
        if (history.ship) {
            type = history.mine ? "danger" : "success";
            row += '<div class="alert-' + type + ' history">' + (history.mine ? "Your" : "Oponent's") + ' ship destoyed - ' + history.ship.name + ' with ' + history.ship.decklength + ' deck(s)</div>';
        }

        $("#history").append(row);
    }

    this.drawEmptyMap = function (container, suffix, clear) {
        var id = "battlefield_cells_" + suffix;
        if (clear != undefined && document.getElementById(id)) {
            for (let i = 1; i < 11; i++) {
                for (let j = 1; j < 11; j++) {
                    var cell = document.getElementById("cell_" + i + "_" + j + (suffix != "" ? "_" + suffix : ""));
                    if (cell == undefined || cell.classList.length == 0) continue;
                    cell.className = "fieldcell";
                    cell.innerHTML = "";
                }
            }
            return;
        }
        suffix = suffix == undefined ? "" : suffix;
        var fieldtable = document.createElement('table');
        fieldtable.id = id;
        fieldtable.className = "battlefield";

        for (let i = 0; i < 11; i++) {
            var row = document.createElement('tr');
            row.id = "mineRow" + i;
            for (let j = 0; j < 11; j++) {
                var cell = document.createElement("td");
                cell.id = "cell_" + i + "_" + j + (suffix != "" ? "_" + suffix : "");
                if (i == 0 && j == 0) {
                    row.appendChild(cell);
                    continue;
                } else if (j == 0) {
                    cell.innerText = i;
                } else if (i == 0) {
                    cell.innerText = String.fromCharCode(97 + j - 1).toUpperCase();
                }
                cell.className = "fieldcell";
                if (suffix == "op" && i > 0 && j > 0)
                    cell.onclick = function () { that.fireAction(this) };
                row.appendChild(cell);
            }
            fieldtable.appendChild(row);
        }
        container.appendChild(fieldtable);
    }

    this.fireAction = function (element) {
        var self = element;
        if (that == undefined || that.isDisconnected) {
            a("Cannot make actions yet. You are not connected");
            return;
        } else if (!that.isReady) {
            a("Cannot make actions yet. You are not ready yet. Please setup your ships and click 'ready'");
            return;
        } else if (!that.oponentIsReady) {
            a("Cannot make actions yet. Your oponent is not ready yet.");
            return;
        }
        var data = element.id.split("_");
        if (data.length != 4) {
            a("Wrong action", "You want fire in wrong way");
            return;
        }
        that.sendParam(new DTO("fire", new Cell(data[1] - 1, data[2] - 1)).toString());
    }

    this.sendParam = function (data) {
        if (that.socket.readyState != 1) {
            a("Cannot send request", "You are disconnected")
            return
        }
        that.socket.send(data)
    }

    this.autoFill = function () { that.sendParam(new DTO("autofill").toString()); }

    this.ready = function () { that.sendParam(new DTO("ready").toString()); }

    this.init = function (clear) {
        that.isReady = false;
        that.drawEmptyMap(document.getElementById("yourField"), "", clear != undefined ? clear : false);
        that.drawEmptyMap(document.getElementById("opponentField"), "op", clear != undefined ? clear : false);
        $("#appAlert").hide();
        $("#opReady").hide();
        $("#yourTurn").hide();
        $("#opTurn").hide();
        $("#isReady").hide();
        $("#won").hide();
        $("#lost").hide();
        $("#startAgain").hide();
    }

    this.addShips = function (ships) {
        if (ships == undefined) return;
        that.map = [];
        that.drawEmptyMap(document.getElementById("yourField"), "", true);
        ships.forEach(ship => {
            (ship.location ? ship.location[0] : ship[0]).forEach(cell => {
                that.map.push(cell);
                var td = document.getElementById("cell_" + (cell.x + 1) + "_" + (cell.y + 1));
                td.className += " shipcell";
                if (cell.value == "hit")
                    td.className += " hitCell";
                else
                    td.innerHTML += cell.value == undefined ? "" : cell.value;
            })
        });
    }
}

$(document).ready(function () {
    if (getCookie("identity") == "")
        setCookie("identity", uuidv4(), 10)
    state = new clientState();
    state.connect();
    state.init();


    $("#hideMessage").click(function () { $("#appAlert").hide(); });
    $("#autoFill").click(function () { state.autoFill(); });
    $("#startAgain").click(function () {
        state.init(true);
        $("#history").html("");
        $("#autoFill").show();
        $("#sayReady").show();
    });
    $("#sayReady").click(function () {
        if (state.map.length == 0) {
            a("You cannot be ready, no ships on your field", "Press 'Auto fill'");
            return;
        }
        state.ready();
    });
})

