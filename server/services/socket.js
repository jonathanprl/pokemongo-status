const socketio = require('socket.io');

module.exports = {
  connect: connect,
  emit: emit
};

let io;

function connect(server)
{
  io = socketio(server);

  var sockets = [];

  io.on('connection', (socket) => {
    sockets.push(socket.id);
    socket.join('global');

    console.log(socket.id, 'connected to websocket. Currently connected:', sockets.length);

    socket.on('disconnect', function(){
      sockets.splice(sockets.indexOf(socket.id), 1);
    });
  });
  console.log('Socket.io server started.');
}

function emit(room, name, data)
{
  io.to(room).emit(name, data);
}
