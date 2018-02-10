const dto = require("./dto");
const storage = require("./storage");

const ws = require("nodejs-websocket");
const os = require("os");
const http = require('http');

var server = ws.createServer(function (connection) {
    console.log("Client connected. Connection id: " + connection.key);
    var clientId = connection.path.split("?")[1];
    var storage = connection.server.storage;
    var client = storage.getClientById(clientId);

    connection.on("text", function (data) {
        if (data == undefined)
            return;
        var model;
        try {
            model = JSON.parse(data);
        } catch (error) {
            console.log("Invalid message: " + data);
            return;
        }

        if (!client)
            client = storage.getClientById(model.id)
        connection.clientId = model.id;
        switch (model.type) {
            case "autofill":
                if (client) client.sendAutoMap();
                break;
            case "ready":
                if (!client) break;
                client.sendReady(true);
                var oponent = storage.getClientById(client.oponentId)
                if (oponent == null)
                    break;
                oponent.sendOpReady(true);
                if (oponent.isReady)
                    storage.startGame(storage.getGame(client.id));
                break;
            case "fire":
                if (!client) break;
                var oponent = storage.getClientById(client.oponentId)
                if (!client.myTurn || oponent == null)
                    return;
                var mineHistory = new dto.FireHistory(model.value, true, true, false);
                var opHistory = new dto.FireHistory(model.value, true, false, false);
                if (oponent.isMissed(model.value)) {
                    oponent.missedMe(model.value);
                    client.missedOponent(model.value);
                    oponent.canFire(true);
                    client.canFire(false);
                } else {
                    mineHistory.missed = false;
                    opHistory.missed = false;
                    oponent.hitMe(model.value);
                    client.hitOponent(model.value);
                }
                client.fireHistory.splice(0, 0, mineHistory);
                oponent.fireHistory.splice(0, 0, opHistory);
                client.sendHistory();
                oponent.sendHistory();
                break;
            case "connect":
                if (!client) {
                    client = storage.addClient(connection, model.id);
                    client.restore();
                }
                break;
            case "reconnect":
                if (!client) break;
                client.restore();
                break;
            default:
                break;
        }
    });
    connection.on("close", function (code, reason) {
        console.log("Closed. code:" + code + ". Client Id: " + connection.clientId)
        switch (code) {
            case 1001:
                break;
            case 1006:
                break;
            default:
                connection.server.storage.removeClientById(connection.clientId);
                break;
        }

    });
    connection.on("error", function (err) {
        console.log("Error for client: " + connection.clientId);
        console.log(err);
    });

    if (client) {
        client.setConnection(connection);
        client.restore();
    }
    connection.clientId = clientId;

}).listen(55555, "seawars.app", function (connection) {
    var ifaces = JSON.stringify(os.networkInterfaces());
    console.log("Started listening..." + os.hostname() + "\n" + ifaces);
});

server.storage = new storage.Storage();
http.createServer(function (req, res) {
    res.write('http test');
    res.end();
}).listen(55554);
