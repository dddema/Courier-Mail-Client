# ✉️ Courier

<img src="https://github.com/dddema/Courier-Mail-Client/raw/master/images/Courier.svg" width="1000">

Based on Mailspring.

![Courier Screenshot](https://github.com/dddema/Courier-Mail-Client/raw/master/images/mail_sample_mac.png)

## Features

Mailspring comes packed with powerful features like Unified Inbox, Snooze, Send
Later, Mail Rules, Templates and more. For a full list, check out
[getmailspring.com](https://getmailspring.com/).

What has been done here is: removed all of the Mailspring ID stuff (that was mandatory to create in order to use the app) and reworked the UI and UX to make it feel more modern.

## Download Courier

In the release section you can find the executable for the current Courier version. 

If you do not like to do that, for any particular reason, you can build it yourself (explained after here).

### Running Courier from Source

To install all dependencies and run Courier from its source code,
run the following commands from the root directory of the Courier repository:

```
export npm_config_arch=x64 # If you are on an M1 / Apple Silicon Mac
npm install
npm start
```

#### Building Courier

To build Courier, you need to run the following command from the root directory
of the Courier repository:

```
npm run-script build
```

### Building A Plugin

Follow the [Getting Started guide](https://Foundry376.github.io/Mailspring/) to write your first plugin in
five minutes.

- To create your own theme, check out the
  [Mailspring-Theme-Starter](https://github.com/Foundry376/Mailspring-Theme-Starter).

- To create your own plugin, check out the
  [Mailspring-Plugin-Starter](https://github.com/Foundry376/Mailspring-Plugin-Starter).

### Building a Theme

To start creating a theme, [clone the theme starter](https://github.com/Foundry376/Mailspring-Theme-Starter)!
