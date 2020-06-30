const path = require('path');
const express = require('express');
const http = require('http');
const Filter = require('bad-words');
const app = express();
const socketio = require('socket.io');
const { generateMessage, generateLocationMessage } = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')

const server = http.createServer(app);
const port = process.env.PORT | 3000;
const io = socketio(server);

const publicDirectoryPath = path.join(__dirname, '../public');
app.use(express.static(publicDirectoryPath));


io.on('connection', (socket) => {

    socket.on('join', (options, callback) => {
        const { error, user } = addUser({ id: socket.id, ...options })
        if (error) {
            return callback(error);
        }

        socket.join(user.room)

        socket.emit('message', generateMessage('admin', 'Welcome!'));
        socket.broadcast.to(user.room).emit('message', generateMessage('admin', `${user.username} has joined!`));
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })
        callback();
    })


    socket.on('sendMessage', (msg, callback) => {
        const user = getUser(socket.id);

        const filter = new Filter();

        if (filter.isProfane(msg)) {
            return callback('Profanity is not allowed');
        }
        io.to(user.room).emit('message', generateMessage(user.username, msg));
        callback();
    })

    socket.on('sendLocation', (coordinates, callback) => {
        const user = getUser(socket.id);

        io.to(user.room).emit('location', generateLocationMessage(user.username, `https://www.google.com/maps?q=${coordinates.latitude},${coordinates.longitude}`))

        callback();

    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id);
        if (user) {
            io.to(user.room).emit('message', generateMessage('admin', `${user.username} has left`));
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })
})



server.listen(port, () => {
    console.log(`Server is up and running on ${port}`);
})