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
                if (client)
                    client.sendAutoMap();
                break;
            case "ready":
                if (!client)
                    break;
                storage.startGame(client);
                break;
            case "fire":
                if (!client)
                    break;
                storage.makeFire(client, storage.getClientById(client.oponentId), model.value);
                break;
            case "connect":
                if (!client) {
                    client = storage.addClient(connection, model.id);
                    client.restore();
                }
                break;
            case "reconnect":
                if (!client)
                    break;
                client.restore();
                break;
            default:
                break;
        }
    });
    connection.on("close", function (code, reason) {
        console.log("Closed. code:" + code + ". Client Id: " + connection.clientId)
        // something should be here...
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

}).listen(55555, "127.0.0.1", function (connection) {
    var ifaces = JSON.stringify(os.networkInterfaces());
    console.log("Started listening..." + os.hostname() + "\n" + ifaces);
});

server.storage = new storage.Storage();
http.createServer(function (req, res) {
    res.write('http test');
    res.end();
}).listen(55554);
