# host.panel

`host.panel` is a web-based control panel designed for managing your server. It provides real-time stats, player management (kick, ban, message), and access to a console for executing commands. 

## Features
- **Server Stats**: View CPU usage, RAM usage, uptime, and TPS (Ticks Per Second).
- **Online Players**: List of players currently online with options to kick, ban, or send messages.
- **Console**: Run server commands directly from the panel.
- **Command History**: View the history of commands executed on the server.
- **Chat**: Send messages to the server’s chat.

## Authentication
The panel comes with a basic password system. The default credentials are:
- **Username**: `admin`
- **Password**: `admin`

**Important**: The default username and password should be changed immediately after installation if the panel is used in a production environment. It is highly recommended to implement additional security measures (e.g., IP restrictions, HTTPS, stronger passwords) before exposing this panel to the web.

## Warning
**Do not expose this server to the web unless you know what you are doing!**  
This panel is intended for use in trusted, secure environments. Exposing it to the public internet without proper security measures can lead to unauthorized access and potential compromise of your server. Make sure to secure your server with proper authentication and encryption (e.g., HTTPS) if you plan to expose it.  
**THIS IS ENTIRELY DESIGNED TO BE USED IN A LOCAL ENVIRONMENT AND I TAKE 0 RESPONSIBILITY IF YOU STUPIDLY FORWARD PORT 3000 TO THE INTERNET.**

## Usage

1. Start the server and the web server.
2. Navigate to the panel's URL in your browser.
3. Log in using the default credentials (Username: `admin`, Password: `admin`).
4. Use the interface to manage the server, view stats, and interact with online players.
