This is a very early X11 implementation in JavaScript. Currently it's
targeting Node.js, but there's no reason it should need to be
restricted to just that. The protocol portions and the Node-specific
portions will be kept as separate as is sensible.

The goal of this project is to have a platform for easy
experementation with the X11 protocol, in both server and client
situations.

Wouldn't it be cool to have an X11 server running in your browser,
powered by nothing but JS and perhaps a canvas tag? What about an X11
proxy which allows you to disconnect a running X11 program from one
X11 server and reconnect it to another? Want to write a window manager
in pure JavaScript? These are the sorts of ideas I want to play with,
and I don't want to have to touch a single line of C code to do it
(and in the case of JS X server running in the browser, I don't want
to have to rewrite portions of my code just because part of it runs in
the browser and part of it on the server).

So far, there's a framework for parsing and encoding X11 requests, and
a single message type (the connect message), is implemented. Next up
is implementing the connection response and then the entire core X11
protocol. After that, extensions which make sense, like the Shape
extension and RandR.